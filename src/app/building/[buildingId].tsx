import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    FlatList,
    Modal,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
    addFloor,
    addRoom,
    deleteFloor,
    deleteRoom,
    getFloorsByBuildingId,
    getRoomsByFloorId
} from "@/services/building";
import {
    getCurrentMonthCollection,
    getDueMonthlyRentsByBuilding
} from "@/services/monthlyRent";
import { getVacatingTenantsByBuilding, moveTenant, } from "@/services/tenant";
// Read the shared Move Tenant session.
import { cancelMoveTenant, completeMoveTenant, useMoveTenantSession, } from "@/services/moveTenantState";


    export default function BuildingPage() {
        const { buildingId, buildingName  } = useLocalSearchParams();
        // Read the active Move Tenant session.
        const moveSession = useMoveTenantSession();

        const [floors, setFloors] = useState<any[]>([]);
        const [loadingFloors, setLoadingFloors] = useState(true);
        const activeFloorNumbers = floors.map(
            (floor) => floor.floorNumber
        );
        const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
        const [showAddFloorModal, setShowAddFloorModal] = useState(false);
        const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(null);
        const [floorError, setFloorError] = useState("");
        const [isAddingFloor, setIsAddingFloor] = useState(false);
        const [showDeleteFloorModal, setShowDeleteFloorModal] = useState(false);
        const [isDeletingFloor, setIsDeletingFloor] = useState(false);
        const [selectedDeleteFloor, setSelectedDeleteFloor] = useState<any | null>(null);
        const [isDeleteFloorConfirmed, setIsDeleteFloorConfirmed] = useState(false);

        const [rooms, setRooms] = useState<any[]>([]);
        const [loadingRooms, setLoadingRooms] = useState(true);
        const [showAddRoomModal, setShowAddRoomModal] = useState(false);
        const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(null);

        const [numberOfBeds, setNumberOfBeds] = useState(1);
        const [roomError, setRoomError] = useState("");
        const [isAddingRoom, setIsAddingRoom] = useState(false);
        const [roomNumberLimit, setRoomNumberLimit] = useState(3);
        const [dueRents, setDueRents] = useState<any[]>([]);
        const [animatedTotalDue, setAnimatedTotalDue] = useState(0);
        const animatedTotalDueRef = useRef(0);
        const [currentMonthCollection, setCurrentMonthCollection] = useState(0);
        // Tracks whether current month collection is being fetched.
        const [loadingCollection, setLoadingCollection] = useState(true);
        // Number of tenants currently marked as vacating in this building.
        const [vacatingTenantCount, setVacatingTenantCount] = useState(0);
        // Index of the currently displayed summary carousel card.
        // 0 = Rent Collected, 1 = Vacating Tenants.
        const [summaryCardIndex, setSummaryCardIndex] = useState(0); 
        const shimmer = useRef(new Animated.Value(0)).current;
        // Controls the horizontal slide animation of the summary-card content.
        const summaryCardTranslateX = useRef(new Animated.Value(0)).current;
        // Records when the owner first touches the summary card.
        const summaryCardTouchStart = useRef<number | null>(null);
        // Tracks whether the current touch is a swipe rather than a tap.
        const summaryCardDidSwipe = useRef(false);
        // Remembers which card was displayed before the current one.
        const previousSummaryCardIndex = useRef<number | null>(null);
        // Keeps the current card index available to the gesture handlers.
        const summaryCardIndexRef = useRef(summaryCardIndex);
        summaryCardIndexRef.current = summaryCardIndex;

        // Handles card swipes, taps, and hold-to-pause in one place.
        const summaryCardPanResponder = useRef(
            PanResponder.create({
                // Let this handler control touches on the summary card.
                onStartShouldSetPanResponder: () => true,

                // Record the touch start and pause automatic switching.
                onPanResponderGrant: () => {
                    summaryCardTouchStart.current = Date.now();
                    summaryCardDidSwipe.current = false;
                    setIsSummaryCardHeld(true);
                },

                // Detect horizontal movement so a swipe cannot become a tap.
                onPanResponderMove: (_event, gestureState) => {
                    if (
                        Math.abs(gestureState.dx) > 15 &&
                        Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
                    ) {
                        summaryCardDidSwipe.current = true;
                    }
                },

                // Handle either a swipe or a short tap when the touch ends.
                onPanResponderRelease: (_event, gestureState) => {
                    const touchDuration =
                        Date.now() -
                        (summaryCardTouchStart.current ?? Date.now());

                    const isHorizontalSwipe =
                        Math.abs(gestureState.dx) > 40 &&
                        Math.abs(gestureState.dx) > Math.abs(gestureState.dy);

                    if (isHorizontalSwipe) {
                        // Left shows Vacating Tenants; right shows Rent Collected.
                        setSummaryCardIndex(gestureState.dx < 0 ? 1 : 0);
                    } else if (
                        !summaryCardDidSwipe.current &&
                        Math.abs(gestureState.dx) < 15 &&
                        Math.abs(gestureState.dy) < 15 &&
                        touchDuration < 600
                    ) {
                        console.log("Summary card tapped:", summaryCardIndexRef.current);
                        // Open the appropriate page based on the currently displayed card.
                        if (summaryCardIndexRef.current === 1) {
                            // Keep the existing Vacating Tenants navigation.
                            router.push({
                                pathname: "/vacating_tenants/[buildingId]",
                                params: {
                                    buildingId: buildingId.toString(),
                                },
                            });
                        } else if (summaryCardIndexRef.current === 0) {
                            // Open Finance for the currently selected building.
                            router.push({
                                pathname: "/finance/[buildingId]",
                                params: {
                                    buildingId: buildingId.toString(),
                                    buildingName: buildingName.toString(),
                                },
                            });
                        }
                    }

                    // Reset touch tracking and restart the countdown.
                    summaryCardTouchStart.current = null;
                    summaryCardDidSwipe.current = false;
                    setIsSummaryCardHeld(false);
                },

                // Resume automatic switching if the gesture is interrupted.
                onPanResponderTerminate: () => {
                    summaryCardTouchStart.current = null;
                    summaryCardDidSwipe.current = false;
                    setIsSummaryCardHeld(false);
                },

                onPanResponderTerminationRequest: () => false,
            })
        ).current;

        const [isSummaryCardHeld, setIsSummaryCardHeld] = useState(false);
        // Switch cards after 5 seconds, restarting the countdown whenever the
        // displayed card changes or the owner releases their touch.
        useFocusEffect(
            useCallback(() => {
                // Do not start a countdown while the owner is touching the card.
                if (isSummaryCardHeld) {
                    return;
                }

                // Give the currently displayed card a full 5 seconds.
                const carouselTimer = setTimeout(() => {
                    setSummaryCardIndex((currentIndex) =>
                        currentIndex === 0 ? 1 : 0
                    );
                }, 7000);

                // Clear the countdown when the card changes, the screen loses
                // focus, or the owner touches the card.
                return () => clearTimeout(carouselTimer);
            }, [isSummaryCardHeld, summaryCardIndex])
        );

                
        // Animate the summary-card content whenever the displayed card changes.
        useEffect(() => {
            // Skip the animation on the first render.
            if (previousSummaryCardIndex.current === null) {
                previousSummaryCardIndex.current = summaryCardIndex;
                return;
            }

            // Determine which direction the new card should slide in from.
            const direction =
                summaryCardIndex > previousSummaryCardIndex.current ? 1 : -1;

            // Position the new content slightly to the side before animating.
            summaryCardTranslateX.setValue(direction * 35);

            // Slide the content smoothly into its normal position.
            Animated.timing(summaryCardTranslateX, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Remember the current card index for the next transition.
            previousSummaryCardIndex.current = summaryCardIndex;
        }, [summaryCardIndex, summaryCardTranslateX]);


        const currentMonthName = new Date().toLocaleString("en-IN", {month: "long",});
        const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
        const [showRoomActions, setShowRoomActions] = useState(false);
        const [isRoomDeleteConfirmed, setIsRoomDeleteConfirmed] = useState(false);
        const [isDeletingRoom, setIsDeletingRoom] = useState(false);
        const insets = useSafeAreaInsets();
        const totalDue = dueRents.reduce(
            (total, rent) => total + Number(rent.remaining_amount),
            0
        );
   
        useEffect(() => {
            // Start from the amount currently displayed on the screen.
            const startValue = animatedTotalDueRef.current;

            // The latest amount calculated from the fetched rent data.
            const targetValue = totalDue;

            // Complete the counting animation in 800 milliseconds.
            const duration = 800;
            const startTime = Date.now();

            const animationInterval = setInterval(() => {
                // Calculate how much animation time has passed.
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out so the number slows down naturally near the end.
                const easedProgress = 1 - Math.pow(1 - progress, 3);

                // Calculate the amount to display at this moment.
                const nextValue = Math.round(
                    startValue + (targetValue - startValue) * easedProgress
                );

                // Update both the displayed amount and its remembered value.
                animatedTotalDueRef.current = nextValue;
                setAnimatedTotalDue(nextValue);

                // Stop at the exact final amount.
                if (progress >= 1) {
                    clearInterval(animationInterval);
                    animatedTotalDueRef.current = targetValue;
                    setAnimatedTotalDue(targetValue);
                }
            }, 16);

            // Clean up if the rent amount changes before animation finishes.
            return () => clearInterval(animationInterval);
        }, [totalDue]);


        // refresh the page
        const refreshBuildingData = useCallback(async () => {
            try {
                // Refresh floors
                const floorsData = await getFloorsByBuildingId(Number(buildingId));
                setFloors(floorsData);

                // Refresh rooms
                if (selectedFloorId !== null) {
                    const roomsData = await getRoomsByFloorId(selectedFloorId);
                    setRooms(roomsData);
                }

                // Refresh due rents
                const dueRentsData = await getDueMonthlyRentsByBuilding(
                    Number(buildingId)
                );
                setDueRents(dueRentsData);

                // Refresh current month's rent collection.
                setLoadingCollection(true);

                try {
                    const collectionData = await getCurrentMonthCollection(
                        Number(buildingId)
                    );

                    setCurrentMonthCollection(
                        Number(collectionData.total_collected)
                    );
                } catch (error) {
                    console.error("COLLECTION FETCH ERROR:", error);
                } finally {
                    setLoadingCollection(false);
                }


                // NEW: Refresh the vacating tenant count.
                // This code goes immediately after the collection's finally block.
                try {
                    const vacatingData = await getVacatingTenantsByBuilding(
                        Number(buildingId)
                    );

                    setVacatingTenantCount(vacatingData.count);
                } catch (error) {
                    // A vacating API error should not interrupt other page data.
                    console.error("VACATING TENANTS FETCH ERROR:", error);
                }

            } catch (error) {
                
            }
        }, [buildingId, selectedFloorId]);


        // Controls the bright-to-dim pulse animation
        // used by all skeleton loading components.
        useEffect(() => {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmer, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(shimmer, {
                        toValue: 0,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ])
            );

            animation.start();

            return () => {
                animation.stop();
            };
        }, [shimmer]);

        const shimmerOpacity = shimmer.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 1],
        });


        useFocusEffect(
            useCallback(() => {
                refreshBuildingData();
            }, [refreshBuildingData])
        );

        useEffect(() => {
            const fetchFloors = async () => {

                // Set loading state to true while floors are being fetched
                // from the backend.
                setLoadingFloors(true);

                try {
                    // Fetch all floors belonging to the current building.
                    const data = await getFloorsByBuildingId(
                        Number(buildingId)
                    );

                    // Store the fetched floors in state.
                    setFloors(data);

                    // If floors are available, automatically select
                    // the first floor as the default selected floor.
                    if (data.length > 0) {
                        setSelectedFloorId(data[0].id);
                    }

                } catch (error) {

                    // Keep the existing error handling behavior.
                    // The loading state will still be stopped in finally.
                    
                } finally {

                    // Floor loading is finished whether the API
                    // request succeeded or failed.
                    setLoadingFloors(false);
                }
            };

            // Fetch floors whenever the building ID changes.
            fetchFloors();

        }, [buildingId]);


        // fetch rooms
        useEffect(() => {
            if (selectedFloorId === null) {
                return;
            }

            const fetchRooms = async () => {

                // Show room skeleton while rooms are loading.
                setLoadingRooms(true);

                try {
                    const data = await getRoomsByFloorId(selectedFloorId);
                    setRooms(data);

                } catch (error) {

                } finally {

                    // Hide room skeleton after loading finishes.
                    setLoadingRooms(false);
                }
            };

            fetchRooms();

        }, [selectedFloorId]);


        useEffect(() => {

            const fetchDueRents = async () => {

                try {

                    const data = await getDueMonthlyRentsByBuilding(
                        Number(buildingId)
                    );

                    setDueRents(data);

                } catch (error) {

                }
            };

            fetchDueRents();

        }, [buildingId]);


        const availableRoomNumbers = floors
            .find((floor) => floor.id === selectedFloorId)
            ? Array.from(
                { length: 99 },
                (_, index) => {
                    const floorNumber = floors.find(
                        (floor) => floor.id === selectedFloorId
                    )?.floorNumber;

                    return `${floorNumber}${String(index + 1).padStart(2, "0")}`;
                }
            ).filter(
                (roomNumber) =>
                    !rooms.some((room) => room.roomNumber === roomNumber)
            )
            : [];


        // Delete selected floor and refresh the page
        const handleDeleteFloor = async () => {
            if (!selectedDeleteFloor) return;

            try {
                setIsDeletingFloor(true);

                // Delete floor from backend
                await deleteFloor(selectedDeleteFloor.id);

                // Refresh active floors
                const floorsData = await getFloorsByBuildingId(
                    Number(buildingId)
                );

                setFloors(floorsData);

                // If the deleted floor was selected, select another floor
                if (selectedFloorId === selectedDeleteFloor.id) {
                    if (floorsData.length > 0) {
                        setSelectedFloorId(floorsData[0].id);
                    } else {
                        setSelectedFloorId(null);
                        setRooms([]);
                    }
                }

                // Refresh pending rent data
                const dueRentsData = await getDueMonthlyRentsByBuilding(
                    Number(buildingId)
                );

                setDueRents(dueRentsData);

                // Close delete popup
                setShowDeleteFloorModal(false);
                setSelectedDeleteFloor(null);

            } catch (error: any) {
                
            } finally {
                setIsDeletingFloor(false);
            }
        };

        return (
            <SafeAreaView
                edges={["top","bottom"]}
                style={{ flex: 1, backgroundColor: "#F8FAFC" }}
            >       
                
                {/* Compact floating Move Tenant banner */}
                {moveSession && (
                    <View
                        style={[
                            styles.moveTenantBanner,
                            { top: insets.top + 8 },
                        ]}
                    >

                        {/* Tenant information on the left */}
                        <View style={styles.moveTenantInfo}>
                            <Text
                                style={styles.moveTenantTitle}
                                numberOfLines={1}
                            >
                                {moveSession.tenantName}
                            </Text>

                            <Text
                                style={styles.moveTenantSubtitle}
                                numberOfLines={2}
                            >
                                {moveSession.destinationBedId !== null
                                    ? `Room ${moveSession.destinationRoomNumber} • Bed ${moveSession.destinationBedNumber}`
                                    : "Select an available bed"}
                            </Text>
                        </View>

                        {/* Cancel and Move buttons on the right */}
                        <View style={styles.moveTenantActions}>

                            <Pressable
                                style={styles.moveTenantCancelButton}
                                onPress={cancelMoveTenant}
                            >
                                <Text style={styles.moveTenantCancelText}>
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.moveTenantSaveButton,
                                    moveSession.destinationBedId === null && {
                                        opacity: 0.5,
                                    },
                                ]}
                                disabled={moveSession.destinationBedId === null}
                                onPress={async () => {
                                    // Stop if no destination bed has been selected.
                                    if (!moveSession || moveSession.destinationBedId === null) {
                                        return;
                                    }

                                    try {
                                        // Send the tenant move request to the backend.
                                        await moveTenant(
                                            moveSession.tenantId,
                                            moveSession.destinationBedId
                                        );

                                        // Clear the active Move Tenant session.
                                        completeMoveTenant();

                                        // Show success feedback.
                                        Alert.alert(
                                            "Success",
                                            "Tenant moved successfully!"
                                        );

                                        // Refresh the Building page data.
                                        await refreshBuildingData();

                                    } catch (error) {
                                        // Log the error for debugging.
                                        console.error("Failed to move tenant:", error);

                                        // Show an error message.
                                        Alert.alert(
                                            "Error",
                                            "Failed to move tenant. Please try again."
                                        );
                                    }
                                }}
                            >
                                <Text style={styles.moveTenantSaveText}>
                                    Move
                                </Text>
                            </Pressable>

                        </View>
                    </View>
                )}


                <View style={styles.container}>
                    
                    <View style={styles.content}>

                        {/* building name */}
                        <View style={styles.buildingHeader}>
                            <Ionicons
                                name="business-outline"
                                size={24}
                                color="#172554"
                            />

                            <Text
                                style={styles.buildingName}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {buildingName}
                            </Text>
                        </View>


                        
                        {/* Rent summary cards */}
                        <View style={styles.summaryCardsRow}>

                            {/* Summary carousel card: PanResponder handles swipe, tap, and hold. */}
                            <View
                                style={[
                                    styles.collectedRentCard,
                                    summaryCardIndex === 1 && styles.vacatingTenantCard,
                                ]}
                                {...summaryCardPanResponder.panHandlers}
                            >
                                {/* Animates the content without changing the outer card dimensions. */}
                                <Animated.View
                                    style={{
                                        transform: [
                                            { translateX: summaryCardTranslateX },
                                        ],
                                    }}
                                >
                                    {summaryCardIndex === 0 ? (
                                        // Slide 1: Rent Collected
                                        <>
                                            <Text style={styles.summaryCardTitle}>
                                                Rent Collected
                                            </Text>

                                            <View style={styles.summaryCardContent}>
                                                <View style={styles.collectedIconBox}>
                                                    <Ionicons
                                                        name="cash-outline"
                                                        size={19}
                                                        color="#15803D"
                                                    />
                                                </View>

                                                <View style={styles.summaryAmountBox}>
                                                    {loadingCollection ? (
                                                        <Animated.View
                                                            style={[
                                                                styles.summaryAmountSkeleton,
                                                                { opacity: shimmerOpacity },
                                                            ]}
                                                        />
                                                    ) : (
                                                        <Text style={styles.collectedRentAmount}>
                                                            ₹{currentMonthCollection.toLocaleString("en-IN")}
                                                        </Text>
                                                    )}

                                                    <Text style={styles.summaryCardSubtext}>
                                                        {currentMonthName}
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    ) : (
                                        // Slide 2: Vacating Tenants
                                        <>
                                            <Text
                                                style={[
                                                    styles.summaryCardTitle,
                                                    styles.vacatingTenantTitle,
                                                ]}
                                            >
                                                Vacating Tenants
                                            </Text>

                                            <View style={styles.summaryCardContent}>
                                                <View style={styles.vacatingIconBox}>
                                                    <Ionicons
                                                        name="calendar-outline"
                                                        size={19}
                                                        color="#15803D"
                                                    />
                                                </View>

                                                <View style={styles.summaryAmountBox}>
                                                    <Text style={styles.vacatingTenantAmount}>
                                                        {vacatingTenantCount}
                                                    </Text>

                                                    <Text style={styles.summaryCardSubtext}>
                                                        Marked as vacating
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </Animated.View>
                            </View>

                            {/* Pending rent: unchanged */}
                            <Pressable
                                style={styles.pendingRentCard}
                                onPress={() => {
                                    router.push({
                                        pathname: "/monthly_rents/[buildingId]",
                                        params: {
                                            buildingId: buildingId.toString(),
                                            buildingName: buildingName.toString(),
                                        },
                                    });
                                }}
                            >
                                <Text style={styles.summaryCardTitle}>
                                    Pending Rent
                                </Text>

                                <View style={styles.summaryCardContent}>
                                    <View style={styles.summaryIconBox}>
                                        <Ionicons
                                            name="wallet-outline"
                                            size={19}
                                            color="#EF4444"
                                        />
                                    </View>

                                    <View style={styles.summaryAmountBox}>
                                        <Text style={styles.pendingRentAmount}>
                                            ₹{animatedTotalDue.toLocaleString("en-IN")}
                                        </Text>

                                        <Text style={styles.summaryCardSubtext}>
                                            {dueRents.length} payments
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        </View>

                        <View style={styles.floorSection}>
                            <View style={styles.floorHeader}>
                                <Text style={styles.floorTitle}>Floors</Text>

                                <Pressable
                                    style={styles.addFloorButton}
                                    onPress={() => {
                                        setFloorError("");
                                        setSelectedFloorNumber(null);
                                        setShowAddFloorModal(true);
                                    }}
                                >
                                    <Ionicons name="add" size={18} color="#172554" />
                                    <Text style={styles.addFloorButtonText}>Add</Text>
                                </Pressable>
                            </View>

                            {loadingFloors ? (
                                <View style={styles.floorSkeletonRow}>
                                    {[1, 2, 3, 4].map((item) => (
                                        <Animated.View
                                            key={item}
                                            style={[
                                                styles.floorSkeleton,
                                                { opacity: shimmerOpacity },
                                            ]}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <FlatList
                                    data={floors}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(floor) => floor.id.toString()}
                                    contentContainerStyle={styles.floorList}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            style={[
                                                styles.floorButton,
                                                selectedFloorId === item.id &&
                                                    styles.selectedFloorButton,
                                            ]}
                                            onPress={() => setSelectedFloorId(item.id)}
                                            onLongPress={() => {
                                                Haptics.impactAsync(
                                                    Haptics.ImpactFeedbackStyle.Medium
                                                );
                                                setSelectedDeleteFloor(item);
                                                setShowDeleteFloorModal(true);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.floorText,
                                                    selectedFloorId === item.id &&
                                                        styles.selectedFloorText,
                                                ]}
                                            >
                                                {item.floorNumber === 0 ? "G" : item.floorNumber}
                                            </Text>
                                        </Pressable>
                                    )}
                                />
                            )}
                        </View>
                    
                        <View style={styles.roomsContainer}>
                            <Text style={styles.roomTitle}>Rooms</Text>

                            {loadingRooms ? (
                                <View style={styles.roomSkeletonContainer}>
                                    {[1, 2, 3, 4].map((item) => (
                                        <Animated.View
                                            key={item}
                                            style={[
                                                styles.roomSkeleton,
                                                { opacity: shimmerOpacity },
                                            ]}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <FlatList
                                    data={rooms}
                                    keyExtractor={(room) => room.id.toString()}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            style={styles.roomCard}
                                            onLongPress={() => {
                                                Haptics.impactAsync(
                                                    Haptics.ImpactFeedbackStyle.Light
                                                );
                                                setSelectedRoom(item);
                                                setIsRoomDeleteConfirmed(false);
                                                setShowRoomActions(true);
                                            }}
                                            onPress={() => {
                                                router.push({
                                                    pathname: "/room/[roomId]",
                                                    params: {
                                                        roomId: item.id.toString(),
                                                        roomNumber: item.roomNumber.toString(),
                                                        buildingId: buildingId.toString(),
                                                    },
                                                });
                                            }}
                                        >
                                            <View style={styles.roomRow}>

                                                <View style={styles.roomNumberWrapper}>

                                                    <View style={styles.roomNumberBox}>
                                                        <Text style={styles.roomNumber}>
                                                            {item.roomNumber}
                                                        </Text>
                                                    </View>

                                                    {item.unpaidTenants > 0 && (
                                                        <View style={styles.unpaidBadge}>
                                                            <Text style={styles.unpaidBadgeText}>
                                                                {item.unpaidTenants}
                                                            </Text>
                                                        </View>
                                                    )}

                                                </View>

                                                <Text style={styles.bedCount}>
                                                    {item.totalBeds} / {item.occupiedBeds} occupied
                                                </Text>

                                                <Text style={styles.roomArrow}>
                                                    ›
                                                </Text>

                                            </View>
                                        </Pressable>
                                    )}
                                />
                            )}

                            {/* Delete room pop-up */}
                            <Modal
                                visible={showRoomActions}
                                transparent
                                animationType="fade"
                                onRequestClose={() => setShowRoomActions(false)}
                            >
                                <Pressable
                                    style={styles.roomActionOverlay}
                                    onPress={() => setShowRoomActions(false)}
                                >
                                    <View style={styles.roomActionPopup}>

                                        <Text style={styles.roomActionRoom}>
                                            Room {selectedRoom?.roomNumber}
                                        </Text>

                                        <Text style={styles.roomActionDescription}>
                                            This will delete the room and its beds.
                                        </Text>

                                        <Pressable
                                            style={styles.deleteConfirmationRow}
                                            onPress={() =>
                                                setIsRoomDeleteConfirmed(
                                                    !isRoomDeleteConfirmed
                                                )
                                            }
                                        >
                                            <View
                                                style={[
                                                    styles.deleteCheckbox,
                                                    isRoomDeleteConfirmed &&
                                                        styles.deleteCheckboxChecked,
                                                ]}
                                            >
                                                {isRoomDeleteConfirmed && (
                                                    <Ionicons
                                                        name="checkmark"
                                                        size={12}
                                                        color="#FFFFFF"
                                                    />
                                                )}
                                            </View>

                                            <Text style={styles.deleteConfirmationText}>
                                                I understand and want to delete this room
                                            </Text>
                                        </Pressable>

                                        <View style={styles.roomActionButtons}>
                                            <Pressable
                                                style={styles.roomCancelButton}
                                                onPress={() => {
                                                    setShowRoomActions(false);
                                                    setIsRoomDeleteConfirmed(false);
                                                }}
                                            >
                                                <Text style={styles.roomCancelButtonText}>
                                                    Cancel
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                style={[
                                                    styles.roomDeleteButton,
                                                    (!isRoomDeleteConfirmed || isDeletingRoom) &&
                                                        styles.roomDeleteButtonDisabled,
                                                ]}
                                                disabled={!isRoomDeleteConfirmed || isDeletingRoom}
                                                onPress={async () => {
                                                    if (!selectedRoom) return;

                                                    try {
                                                        setIsDeletingRoom(true);

                                                        await deleteRoom(selectedRoom.id);

                                                        // Close popup after successful deletion.
                                                        setShowRoomActions(false);
                                                        setIsRoomDeleteConfirmed(false);

                                                        // Refresh the current floor's rooms.
                                                        if (selectedFloorId !== null) {
                                                            const updatedRooms = await getRoomsByFloorId(
                                                                selectedFloorId
                                                            );
                                                            setRooms(updatedRooms);
                                                        }

                                                        // Refresh pending rent.
                                                        const updatedDueRents = await getDueMonthlyRentsByBuilding(
                                                            Number(buildingId)
                                                        );
                                                        setDueRents(updatedDueRents);

                                                    } catch (error: any) {
                                                        console.error("DELETE ROOM ERROR:", error);

                                                        // Show the backend error.
                                                        setRoomError(
                                                            error?.message || "Failed to delete room"
                                                        );
                                                    } finally {
                                                        setIsDeletingRoom(false);
                                                    }
                                                }}
                                            >
                                                <Text style={styles.roomDeleteButtonText}>
                                                    {isDeletingRoom ? "Deleting..." : "Delete Room"}
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </Pressable>
                            </Modal>


                            {/* add room button*/}
                            <Pressable
                                style={styles.addRoomButton}
                                onPress={() => {
                                    setSelectedRoomNumber(null);
                                    setNumberOfBeds(1);
                                    setRoomError("");
                                    setShowAddRoomModal(true);
                                    setRoomNumberLimit(3);
                                }}
                            >
                                <Ionicons name="add" size={20} color="#FFFFFF" />
                                <Text style={styles.addRoomButtonText}>Add Room</Text>
                            </Pressable>

                        </View>
                    </View>
                </View>


                {/* Delete Floor Modal */}
                <Modal
                    visible={showDeleteFloorModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDeleteFloorModal(false)}
                >
                    <View style={styles.deleteFloorOverlay}>
                        <View style={styles.deleteFloorModal}>

                            <Text style={styles.modalTitle}>
                                Delete Floor
                            </Text>

                            <View style={styles.modalDivider} />

                            <Text style={styles.modalSubtitle}>
                                Are you sure you want to delete Floor{" "}
                                {selectedDeleteFloor?.floorNumber === 0
                                    ? "G"
                                    : selectedDeleteFloor?.floorNumber}
                                ?
                            </Text>

                            {/* Confirmation checkbox */}
                            <Pressable
                                style={styles.deleteFloorCheckRow}
                                onPress={() =>
                                    setIsDeleteFloorConfirmed(
                                        !isDeleteFloorConfirmed
                                    )
                                }
                            >
                                <View
                                    style={[
                                        styles.deleteFloorCheckbox,
                                        isDeleteFloorConfirmed &&
                                            styles.deleteFloorCheckboxChecked,
                                    ]}
                                >
                                    {isDeleteFloorConfirmed && (
                                        <Text style={styles.deleteFloorCheckmark}>
                                            ✓
                                        </Text>
                                    )}
                                </View>

                                <Text style={styles.deleteFloorCheckText}>
                                    YES
                                </Text>
                            </Pressable>

                            <View style={styles.floorModalActions}>

                                <Pressable
                                    style={styles.cancelFloorButton}
                                    onPress={() => {
                                        setShowDeleteFloorModal(false);
                                        setSelectedDeleteFloor(null);
                                        setIsDeleteFloorConfirmed(false);
                                    }}
                                >
                                    <Text style={styles.cancelFloorButtonText}>
                                        Cancel
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.deleteFloorButton,
                                        !isDeleteFloorConfirmed &&
                                            styles.deleteFloorButtonDisabled,
                                    ]}
                                    onPress={handleDeleteFloor}
                                    disabled={
                                        !isDeleteFloorConfirmed ||
                                        isDeletingFloor
                                    }
                                >
                                    <Text style={styles.deleteFloorButtonText}>
                                        {isDeletingFloor
                                            ? "Deleting..."
                                            : "Delete"}
                                    </Text>
                                </Pressable>

                            </View>

                        </View>
                    </View>
                </Modal>

                {/* Add Floor Modal */}
                <Modal
                    visible={showAddFloorModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowAddFloorModal(false)}
                >
                    <View
                        style={[
                            styles.modalOverlay,
                            {
                                paddingBottom: Math.max(insets.bottom, 20),
                            },
                        ]}
                    >

                        <View style={styles.addFloorModal}>

                            <Text style={styles.modalTitle}>
                                Add Floor
                            </Text>

                            <View style={styles.modalDivider} />

                            <Text style={styles.modalSubtitle}>
                                Select a floor number
                            </Text>

                            <View style={styles.floorNumberGrid}>
                                {Array.from({ length: 21 }, (_, index) => (
                                    <Pressable
                                        key={index}
                                        style={[
                                            styles.floorNumberOption,

                                            activeFloorNumbers.includes(index) &&
                                                styles.disabledFloorNumberOption,

                                            selectedFloorNumber === index &&
                                                styles.selectedFloorNumberOption,
                                        ]}
                                        onPress={() => {
                                            if (activeFloorNumbers.includes(index)) {
                                                return;
                                            }

                                            setSelectedFloorNumber(index);
                                            setFloorError("");
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.floorNumberOptionText,
                                                selectedFloorNumber === index &&
                                                    styles.selectedFloorNumberOptionText,
                                            ]}
                                        >
                                            {index === 0 ? "G" : index}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            {floorError !== "" && (
                                <Text style={styles.floorErrorText}>
                                    {floorError}
                                </Text>
                            )}

                            <View style={styles.floorModalActions}>

                                <Pressable
                                    style={styles.cancelFloorButton}
                                    onPress={() => {
                                        setShowAddFloorModal(false);
                                        setSelectedFloorNumber(null);
                                        setFloorError("");
                                    }}
                                    disabled={isAddingFloor}
                                >
                                    <Text style={styles.cancelFloorButtonText}>
                                        Cancel
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={styles.createFloorButton}
                                    onPress={async () => {
                                        if (selectedFloorNumber === null) {
                                            setFloorError("Please select a floor.");
                                            return;
                                        }

                                        try {
                                            setIsAddingFloor(true);
                                            setFloorError("");

                                            await addFloor(
                                                Number(buildingId),
                                                selectedFloorNumber
                                            );

                                            const updatedFloors =
                                                await getFloorsByBuildingId(
                                                    Number(buildingId)
                                                );

                                            setFloors(updatedFloors);

                                            const newFloor = updatedFloors.find(
                                                (floor: any) =>
                                                    floor.floorNumber === selectedFloorNumber
                                            );

                                            if (newFloor) {
                                                setSelectedFloorId(newFloor.id);
                                            }

                                            setShowAddFloorModal(false);
                                            setSelectedFloorNumber(null);

                                        } catch (error: any) {
                                            setFloorError(
                                                error?.message ||
                                                "Failed to add floor."
                                            );
                                        } finally {
                                            setIsAddingFloor(false);
                                        }
                                    }}
                                    disabled={isAddingFloor}
                                >
                                    <Text style={styles.createFloorButtonText}>
                                        {isAddingFloor ? "Adding..." : "Add Floor"}
                                    </Text>
                                </Pressable>

                            </View>

                        </View>
                    </View>
                </Modal>

                {/* Add Room Modal */}
                <Modal
                    visible={showAddRoomModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowAddRoomModal(false)}
                >
                    <View
                        style={[
                            styles.modalOverlay,
                            {
                                // Keep the modal content above the Android navigation bar.
                                paddingBottom: Math.max(insets.bottom, 20),
                            },
                        ]}
                    >

                        {/* Modal content */}
                        <View style={styles.addRoomModal}>

                            {/* Modal title */}
                            <Text style={styles.modalTitle}>
                                Add Room
                            </Text>

                            <View style={styles.modalDivider} />

                            {/* Room number instruction */}
                            <Text style={styles.modalSubtitle}>
                                Select a room number
                            </Text>

                            {/* Available room numbers */}
                            <ScrollView
                                style={styles.roomNumberList}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.roomNumberGrid}>

                                    {availableRoomNumbers
                                        .slice(0, roomNumberLimit)
                                        .map((roomNumber) => (
                                        <Pressable
                                            key={roomNumber}
                                            style={[
                                                styles.roomNumberOption,
                                                selectedRoomNumber === roomNumber &&
                                                    styles.selectedRoomNumberOption,
                                            ]}
                                            onPress={() => {
                                                setSelectedRoomNumber(roomNumber);
                                                setRoomError("");
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.roomNumberOptionText,
                                                    selectedRoomNumber === roomNumber &&
                                                        styles.selectedRoomNumberOptionText,
                                                ]}
                                            >
                                                {roomNumber}
                                            </Text>
                                        </Pressable>
                                    ))}

                                </View>

                                {/* Show more room numbers */}
                                {roomNumberLimit < availableRoomNumbers.length && (
                                    <Pressable
                                        style={styles.showMoreButton}
                                        onPress={() => {
                                            setRoomNumberLimit(
                                                Math.min(
                                                    roomNumberLimit + 3,
                                                    availableRoomNumbers.length
                                                )
                                            );
                                        }}
                                    >
                                        <Text style={styles.showMoreText}>
                                            Show More
                                        </Text>
                                    </Pressable>
                                )}
                            </ScrollView>

                            {/* Number of beds */}
                            <Text style={styles.bedsLabel}>
                                Number of Beds
                            </Text>

                            <View style={styles.bedSelector}>

                                {/* Decrease beds */}
                                <Pressable
                                    style={styles.bedSelectorButton}
                                    onPress={() => {
                                        if (numberOfBeds > 1) {
                                            setNumberOfBeds(numberOfBeds - 1);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name="remove"
                                        size={20}
                                        color="#172554"
                                    />
                                </Pressable>

                                {/* Bed count */}
                                <Text style={styles.bedCountValue}>
                                    {numberOfBeds}
                                </Text>

                                {/* Increase beds */}
                                <Pressable
                                    style={styles.bedSelectorButton}
                                    onPress={() => {
                                        if (numberOfBeds < 26) {
                                            setNumberOfBeds(numberOfBeds + 1);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name="add"
                                        size={20}
                                        color="#172554"
                                    />
                                </Pressable>

                            </View>

                            {roomError !== "" && (
                                <Text style={styles.roomErrorText}>
                                    {roomError}
                                </Text>
                            )}

                            {/* Modal actions */}
                            <View style={styles.roomModalActions}>

                                <Pressable
                                    style={styles.cancelRoomButton}
                                    onPress={() => setShowAddRoomModal(false)}
                                    disabled={isAddingRoom}
                                >
                                    <Text style={styles.cancelRoomButtonText}>
                                        Cancel
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={styles.createRoomButton}
                                    onPress={async () => {
                                        if (!selectedFloorId || !selectedRoomNumber) {
                                            setRoomError("Please select a room number.");
                                            return;
                                        }

                                        try {
                                            setIsAddingRoom(true);
                                            setRoomError("");

                                            await addRoom({
                                                floor_id: selectedFloorId,
                                                room_number: selectedRoomNumber,
                                                number_of_beds: numberOfBeds,
                                            });

                                            // Refresh rooms after successful creation.
                                            const updatedRooms = await getRoomsByFloorId(
                                                selectedFloorId
                                            );
                                            setRooms(updatedRooms);

                                            // Close and reset the modal.
                                            setShowAddRoomModal(false);
                                            setSelectedRoomNumber(null);
                                            setNumberOfBeds(1);
                                            setRoomNumberLimit(3);

                                        } catch (error: any) {
                                            setRoomError(
                                                error?.message || "Failed to create room."
                                            );
                                        } finally {
                                            setIsAddingRoom(false);
                                        }
                                    }}
                                    disabled={isAddingRoom}
                                >
                                    <Text style={styles.createRoomButtonText}>
                                        {isAddingRoom ? "Creating..." : "Create Room"}
                                    </Text>
                                </Pressable>
                            </View>

                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        );
}


const styles = StyleSheet.create({

    // ==================================================
    // 1. Main page
    // ==================================================

    container: {
        flex: 1,
        backgroundColor: "#172554",
    },

    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 8,
        backgroundColor: "#F8FAFC",
    },


    // ==================================================
    // 2. Building header
    // ==================================================

    buildingHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        marginBottom: 12,
    },

    buildingName: {
        flex: 1,
        marginLeft: 8,
        fontSize: 22,
        fontWeight: "700",
        color: "#172554",
    },


    // ==================================================
    // 3. Floor section
    // ==================================================

    floorSection: {
        marginTop: 20,
    },

    floorHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },

    floorTitle: {
        fontSize: 18,
        fontWeight: "600",
    },

    addFloorButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: "#E8EEFF",
    },

    addFloorButtonText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: "600",
        color: "#172554",
    },

    floorList: {
        paddingRight: 16,
    },

    floorSkeletonRow: {
        flexDirection: "row",
        paddingRight: 16,
    },

    floorSkeleton: {
        width: 70,
        height: 50,
        marginRight: 16,
        borderRadius: 10,
        backgroundColor: "#E2E8F0",
    },

    floorButton: {
        paddingVertical: 14,
        paddingHorizontal: 25,
        marginRight: 16,
        borderRadius: 10,
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#CBD5E1",
    },

    selectedFloorButton: {
        backgroundColor: "#172554",
        borderColor: "#172554",
    },

    floorText: {
        fontSize: 18,
        fontWeight: "500",
    },

    selectedFloorText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },


    // ==================================================
    // 4. Add Floor modal
    // ==================================================

    addFloorModal: {
        maxHeight: "75%",
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: "#FFFFFF",
    },

    floorNumberGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        gap: 9,
    },

    floorNumberOption: {
        width: "18%",
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
        alignItems: "center",
    },

    disabledFloorNumberOption: {
        opacity: 0.35,
    },

    selectedFloorNumberOption: {
        backgroundColor: "#172554",
        borderColor: "#172554",
    },

    floorNumberOptionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#172554",
    },

    selectedFloorNumberOptionText: {
        color: "#FFFFFF",
    },

    floorErrorText: {
        marginTop: 10,
        fontSize: 13,
        color: "#DC2626",
        textAlign: "center",
    },

    floorModalActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 22,
    },

    cancelFloorButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },

    cancelFloorButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#475569",
    },

    createFloorButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 11,
        alignItems: "center",
        backgroundColor: "#172554",
    },

    createFloorButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FFFFFF",
    },


    // ==================================================
    // 5. Delete Floor popup
    // ==================================================

    deleteFloorOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.45)",
    },

    deleteFloorModal: {
        width: "90%",
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 20,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
    },

    deleteFloorButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 11,
        alignItems: "center",
        backgroundColor: "#DC2626",
    },

    deleteFloorButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    deleteFloorCheckRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 18,
        marginBottom: 20,
    },

    deleteFloorCheckbox: {
        width: 22,
        height: 22,
        borderWidth: 1.5,
        borderColor: "#9CA3AF",
        borderRadius: 5,
        alignItems: "center",
        justifyContent: "center",
    },

    deleteFloorCheckboxChecked: {
        backgroundColor: "#DC2626",
        borderColor: "#DC2626",
    },

    deleteFloorCheckmark: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    deleteFloorCheckText: {
        marginLeft: 10,
        fontSize: 14,
        color: "#374151",
    },

    deleteFloorButtonDisabled: {
        backgroundColor: "#D1D5DB",
    },


    // ==================================================
    // 6. Rooms section
    // ==================================================

    roomsContainer: {
        flex: 1,
        marginTop: 10,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        borderRadius: 16,
        backgroundColor: "#EEF2F7",
    },

    roomSection: {
        marginTop: 24,
    },

    roomTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 5,
    },

    roomCard: {
        padding: 16,
        marginBottom: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
    },

    roomSkeletonContainer: {
        gap: 12,
    },

    roomSkeleton: {
        width: "100%",
        height: 64,
        borderRadius: 14,
        backgroundColor: "#E2E8F0",
    },

    roomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    roomNumberWrapper: {
        position: "relative",
    },

    roomNumberBox: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderWidth: 0.5,
        borderColor: "#DBDEE0",
        borderRadius: 8,
        backgroundColor: "#F4F8FF",
    },

    roomNumber: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0A2B74",
    },

    bedCount: {
        marginLeft: 8,
        marginTop: 4,
        fontWeight: "800",
        fontSize: 14,
        color: "#64748B",
    },

    roomArrow: {
        marginLeft: "auto",
        fontSize: 28,
        color: "#94A3B8",
    },

    unpaidBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 3,
        borderRadius: 8,
        backgroundColor: "#DC2626",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#FFFFFF",
    },

    unpaidBadgeText: {
        color: "#FFFFFF",
        fontSize: 8,
        fontWeight: "800",
    },


    // ==================================================
    // 7. Delete Room popup
    // ==================================================

    roomActionOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.30)",
        justifyContent: "center",
        alignItems: "center",
    },

    roomActionPopup: {
        width: "82%",
        maxWidth: 340,
        padding: 20,
        borderRadius: 18,
        backgroundColor: "#FFFFFF",
        elevation: 8,
        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.18,
        shadowRadius: 10,
    },

    roomActionRoom: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 8,
    },

    roomActionDescription: {
        fontSize: 14,
        lineHeight: 20,
        color: "#475569",
        marginBottom: 20,
    },

    deleteConfirmationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 20,
    },

    deleteCheckbox: {
        width: 18,
        height: 18,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: "#CBD5E1",
        alignItems: "center",
        justifyContent: "center",
    },

    deleteCheckboxChecked: {
        backgroundColor: "#DC2626",
        borderColor: "#DC2626",
    },

    deleteConfirmationText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 19,
        fontWeight: "500",
        color: "#334155",
    },

    roomActionButtons: {
        flexDirection: "row",
        gap: 10,
    },

    roomCancelButton: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        backgroundColor: "#F8FAFC",
        alignItems: "center",
    },

    roomCancelButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
    },

    roomDeleteButton: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        backgroundColor: "#DC2626",
        alignItems: "center",
    },

    roomDeleteButtonDisabled: {
        backgroundColor: "#94A3B8",
    },

    roomDeleteButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },


    // ==================================================
    // 8. Add Room modal
    // ==================================================
    addRoomButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 13,
        marginTop: 5,
        borderRadius: 10,
        backgroundColor: "#172554",
    },

    addRoomButtonText: {
        marginLeft: 6,
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
    },

    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.45)",
    },

    addRoomModal: {
        maxHeight: "75%",
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: "#FFFFFF",
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#172554",
        textAlign: "center",
    },

    modalDivider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginTop: 16,
        marginBottom: 14,
    },

    modalSubtitle: {
        marginTop: 6,
        marginBottom: 12,
        fontSize: 14,
        color: "#112035",
        textAlign: "left",
        fontWeight: "600",
    },

    roomNumberList: {
        maxHeight: 350,
    },

    roomNumberGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        gap: 9,
    },

    roomNumberOption: {
        width: "18%",
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
        alignItems: "center",
    },

    selectedRoomNumberOption: {
        backgroundColor: "#172554",
        borderColor: "#172554",
    },

    roomNumberOptionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#172554",
    },

    selectedRoomNumberOptionText: {
        color: "#FFFFFF",
    },

    showMoreButton: {
        alignItems: "center",
        paddingVertical: 10,
        marginTop: 8,
    },

    showMoreText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#172554",
    },

    bedsLabel: {
        marginTop: 20,
        marginBottom: 10,
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
    },

    bedSelector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
    },

    bedSelectorButton: {
        width: 42,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        justifyContent: "center",
    },

    bedCountValue: {
        minWidth: 42,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "700",
        color: "#172554",
    },

    roomModalActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 22,
    },

    cancelRoomButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },

    cancelRoomButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#475569",
    },

    createRoomButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 11,
        alignItems: "center",
        backgroundColor: "#172554",
    },

    createRoomButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    roomErrorText: {
        marginTop: 10,
        fontSize: 13,
        color: "#DC2626",
        textAlign: "center",
    },


    // ==================================================
    // 9. Rent summary cards
    // ==================================================

    summaryCardsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 4,
        marginBottom: 6,
    },

    pendingRentCard: {
        flex: 1,
        height: 88,
        padding: 10,
        borderRadius: 14,
        backgroundColor: "#FFF7F7",
        borderWidth: 1,
        borderColor: "#FDE2E2",
    },

    // Vacating tennat card 
    vacatingTenantCard: {
        backgroundColor: "#f0f0e2",
        borderColor: "#C9C9A6",
    },

    // Title color for the Vacating Tenants card.
    vacatingTenantTitle: {
        color: "#65653B",
    },

    // Icon background for Vacating Tenants.
    vacatingIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: "#FFEDD5",
        justifyContent: "center",
        alignItems: "center",
    },

    // Number of tenants marked as vacating.
    vacatingTenantAmount: {
        fontSize: 17,
        fontWeight: "700",
        color: "#65653B",
    },


    collectedRentCard: {
        flex: 1,
        height: 88,
        padding: 10,
        borderRadius: 14,
        backgroundColor: "#E8F0E6",
        borderWidth: 1,
        borderColor: "#C7D8C2",
        overflow: "hidden",
    },

    collectedIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: "#D5E4D0",
        justifyContent: "center",
        alignItems: "center",
    },

    collectedRentAmount: {
        fontSize: 17,
        fontWeight: "700",
        color: "#3F6345",
    },


    summaryCardTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
    },

    summaryCardContent: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 7,
    },

    summaryIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: "#FFF0F0",
        justifyContent: "center",
        alignItems: "center",
    },

    summaryAmountBox: {
        marginLeft: 10,
        flex: 1,
    },

    summaryAmountSkeleton: {
        width: "45%",
        height: 15,
        borderRadius: 6,
        backgroundColor: "#CDE8D5",
    },

    pendingRentAmount: {
        fontSize: 17,
        fontWeight: "700",
        color: "#EF4444",
    },

    summaryCardSubtext: {
        marginTop: 2,
        fontSize: 11,
        color: "#64748B",
    },

    // Compact floating Move Tenant banner
    moveTenantBanner: {
        position: "absolute",
        left: 10,
        right: 10,
        zIndex: 1000,
        elevation: 6,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 25,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#d1faf4",
        shadowColor: "#550e0e",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
    },

    // Tenant name and destination on the left
    moveTenantInfo: {
        flex: 1,
        minWidth: 0,
        paddingRight: 8,
        paddingLeft: 6,
    },

    moveTenantTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#166534",
    },

    moveTenantSubtitle: {
        fontSize: 11,
        color: "#4b5a6e",
        marginTop: 3,
    },

    // Buttons stay beside the tenant information
    moveTenantActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    moveTenantCancelButton: {
        paddingVertical: 9,
        paddingHorizontal: 18,
        borderRadius: 7,
        backgroundColor: "#F3F4F6",
    },

    moveTenantCancelText: {
        color: "#374151",
        fontSize: 11,
        fontWeight: "600",
    },

    moveTenantSaveButton: {
        paddingVertical: 9,
        paddingHorizontal: 18,
        borderRadius: 7,
        backgroundColor: "#147b89",
    },

    moveTenantSaveText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "700",
    },



});