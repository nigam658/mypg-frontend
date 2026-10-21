import {
    cancelMoveTenant,
    completeMoveTenant,
    getMoveTenantSession,
    selectMoveDestination,
    startMoveTenant,
    useMoveTenantSession,
} from "@/services/moveTenantState";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Keyboard,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets, } from "react-native-safe-area-context";

import { addBed, deleteBed, getBedsByRoomId } from "@/services/bed";
import { addTenant, getTenantByBedId, moveTenant, removeTenant, setTenantVacating } from "@/services/tenant";


type Bed = {
    bed_id: number;
    bed_number: string;
    status: string;
    rent: number | null;

    tenant: {
        tenant_id: number;
        full_name: string;
        phone: string;
        check_in_date: string;
        is_vacating: boolean;
    } | null;

    payment_status: "PAID" | "UNPAID" | null;
    unpaid_months: number;
};


export default function RoomPage() {

    // Get room ID from the navigation parameters
    const { roomId, roomNumber,buildingId, success } = useLocalSearchParams<{
        roomId: string;
        roomNumber: string;
        buildingId: string;
        success?: string;
    }>();
    // Get the device's actual safe areas automatically.
    const insets = useSafeAreaInsets();
    // Store all beds belonging to this room
    const [beds, setBeds] = useState<Bed[]>([]);
    const [loadingBeds, setLoadingBeds] = useState(true);
    const [openMenuBedId, setOpenMenuBedId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState({x: 0, y: 0, height: 0,});
    const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
    const [tenantDetails, setTenantDetails] = useState<any>(null);
    const [tenantLoading, setTenantLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const [removeTenantVisible, setRemoveTenantVisible] = useState(false);
    const [removingTenant, setRemovingTenant] = useState(false);
    const [tenantToRemove, setTenantToRemove] = useState<number | null>(null);

    // Controls whether the vacating popup is visible.
    const [vacatingPopupVisible, setVacatingPopupVisible] = useState(false);
    const [vacatingTenant, setVacatingTenant] = useState<{
        tenantId: number;
        bedId: number;
        tenantName: string;
        isVacating: boolean;
        nextRentDate: string;
    } | null>(null);
    // Stores the switch's pending value before the owner confirms.
    const [pendingVacatingStatus, setPendingVacatingStatus] =
        useState<boolean | null>(null);
    // Keeps the latest switch value available immediately between taps.
    const pendingVacatingStatusRef = useRef<boolean | null>(null);
    // Prevents duplicate API requests while saving.
    const [updatingVacating, setUpdatingVacating] = useState(false)
    // Prevents duplicate vacating submissions from rapid taps.
    const vacatingSubmitLock = useRef(false);
    // Stores the selected tenant's latest vacating status for the menu.
    const [menuTenantVacatingStatus, setMenuTenantVacatingStatus] =
        useState<boolean | null>(null);
    // Stores the expected checkout date selected by the PG owner.
    const [expectedCheckoutDate, setExpectedCheckoutDate] =
        useState<Date | null>(null);

    // Controls whether the expected checkout date picker is visible.
    const [
        showExpectedCheckoutDatePicker,
        setShowExpectedCheckoutDatePicker,
    ] = useState(false);
    // Controls the checkout-date validation message.
    const [checkoutDateError, setCheckoutDateError] = useState(false);

    // Controls the calendar box's horizontal shake animation.
    const checkoutDateShake = useRef(new Animated.Value(0)).current;

    const [addTenantVisible, setAddTenantVisible] = useState(false);
    const [tenantToAddBedId, setTenantToAddBedId] = useState<number | null>(null);
    const [tenantToAddBedNumber, setTenantToAddBedNumber] = useState("");
    const [addTenantDatePickerVisible, setAddTenantDatePickerVisible] = useState(false);

    const [addFullName, setAddFullName] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [addRent, setAddRent] = useState("");
    const [addSecurityDeposit, setAddSecurityDeposit] = useState("");
    const [addCheckInDate, setAddCheckInDate] = useState("");
    const [addGender, setAddGender] = useState("");
    const [addAddress, setAddAddress] = useState("");
    const [addEmergencyPhone, setAddEmergencyPhone] = useState("");
    const [addAadhaar, setAddAadhaar] = useState("");

    const [addNameError, setAddNameError] = useState("");
    const [addPhoneError, setAddPhoneError] = useState("");
    const [addRentError, setAddRentError] = useState("");
    const [addSecurityDepositError, setAddSecurityDepositError] = useState("");
    const [addCheckInDateError, setAddCheckInDateError] = useState("");
    const [addGenderError, setAddGenderError] = useState("");
    const [addEmergencyPhoneError, setAddEmergencyPhoneError] = useState("");
    const [addAadhaarError, setAddAadhaarError] = useState("");
    const [addAddressError, setAddAddressError] = useState("");
    const [addTenantError, setAddTenantError] = useState("");
    const [deleteBedError, setDeleteBedError] = useState("");
    
    
    const [addingTenant, setAddingTenant] = useState(false);
    const [addingBed, setAddingBed] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);






    // Controls the left-to-right shimmer animation
    // used by the bed skeleton loading components.
    const shimmer = useRef(new Animated.Value(0)).current;

    // Controls the smooth sliding animation of the vacating switch.
    const vacatingSwitchAnimation = useRef(
        new Animated.Value(0)
    ).current;

    // Controls the animation when the OK button appears.
    const vacatingOkAnimation = useRef(
        new Animated.Value(0)
    ).current;

    // Controls the smooth appearance and disappearance of the three-dot menu.
    const actionMenuAnimation = useRef(
        new Animated.Value(0)
    ).current;

    
    // Animate the three-dot menu when it opens.
    useEffect(() => {
        // Do nothing when no menu is open.
        if (openMenuBedId === null) return;

        // Start from the hidden state each time a menu opens.
        actionMenuAnimation.setValue(0);

        // Smoothly scale the menu into view.
        Animated.spring(actionMenuAnimation, {
            toValue: 1,
            useNativeDriver: true,
            speed: 22,
            bounciness: 4,
        }).start();
    }, [openMenuBedId, actionMenuAnimation]);

    
    // Smoothly close the menu, then optionally run an action.
    const closeActionMenu = (afterClose?: () => void) => {
        Animated.timing(actionMenuAnimation, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
        }).start(({ finished }) => {
            // Hide the menu after the animation completes.
            if (finished) {
                setOpenMenuBedId(null);

                // Run the selected menu action after closing.
                afterClose?.();
            }
        });
    };





    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            })
        );

        animation.start();

        return () => {
            animation.stop();
        };
    }, [shimmer]);

    
    const shimmerTranslate = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-350, 350],
    });

    const shimmerOpacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.45, 1],
    });

    const router = useRouter();

    // Read the active Move Tenant session.
    // This allows the room screen to respond to move-session changes.
    const moveSession = useMoveTenantSession();


    // Listen for the keyboard opening and closing.
    // We use the keyboard height only to provide extra
    // scrollable space inside the Add Tenant form.
    useEffect(() => {
        const showEvent =
            Platform.OS === "android"
                ? "keyboardDidShow"
                : "keyboardWillShow";

        const hideEvent =
            Platform.OS === "android"
                ? "keyboardDidHide"
                : "keyboardWillHide";

        const keyboardShowListener = Keyboard.addListener(
            showEvent,
            (event) => {
                setKeyboardHeight(event.endCoordinates.height);
            }
        );

        const keyboardHideListener = Keyboard.addListener(
            hideEvent,
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardShowListener.remove();
            keyboardHideListener.remove();
        };
    }, []);


    useEffect(() => {
        if (success) {
            setSuccessMessage(success);

            const timer = setTimeout(() => {
                setSuccessMessage("");
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [success]);



    // Fetch the latest bed information from the backend.
    // A silent refresh avoids showing the loading skeleton unnecessarily.
    const fetchBeds = async (showLoading = true) => {
        // Show the loading skeleton only when requested.
        if (showLoading) {
            setLoadingBeds(true);
        }

        try {
            const data = await getBedsByRoomId(Number(roomId));

            // Update beds with the latest tenant and vacating information.
            setBeds(
                data.filter((bed: any) => bed.status !== "INACTIVE")
            );
        } catch (error) {
            console.error("Failed to fetch beds:", error);
        } finally {
            // Hide the skeleton only when it was shown.
            if (showLoading) {
                setLoadingBeds(false);
            }
        }
    };


    useEffect(() => {

        if (roomId) {
            fetchBeds();
        }

    }, [roomId]);


    // handle delete tenant response
    const handleDeleteBed = async (bedId: number) => {

        try {
            const result = await deleteBed(bedId);

            // Check whether the deleted bed was the selected destination.
            const currentMoveSession = getMoveTenantSession();

            if (currentMoveSession?.destinationBedId === bedId) {
                // Clear only the destination; keep Move Tenant mode active.
                selectMoveDestination(null, null, null);
            }

            await fetchBeds();

            setSuccessMessage(
                result.message || "Bed deleted successfully."
            );

            setTimeout(() => {
                setSuccessMessage("");
            }, 4000);

        } catch (error) {
            console.log("Failed to delete bed:", error);

            setDeleteBedError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete bed."
            );

            setTimeout(() => {
                setDeleteBedError("");
            }, 4000);
        }

    };


    const formatAadhaar = (text: string) => {
        const numbers = text.replace(/\D/g, "").slice(0, 12);
        return numbers.replace(/(\d{4})(?=\d)/g, "$1-");
    };


    // handle handlebed response 
    const handleAddBed = async () => {
        try {
            setAddingBed(true);

            const result = await addBed(Number(roomId));

            await fetchBeds();

            setSuccessMessage(
                result.message || "Bed added successfully."
            );

            setTimeout(() => {
                setSuccessMessage("");
            }, 4000);

        } catch (error) {
            console.log("Failed to add bed:", error);

            setDeleteBedError(
                error instanceof Error
                    ? error.message
                    : "Failed to add bed."
            );

            setTimeout(() => {
                setDeleteBedError("");
            }, 4000);

        } finally {
            setAddingBed(false);
        }
    };

    const resetAddTenantForm = () => {
        setAddFullName("");
        setAddPhone("");
        setAddRent("");
        setAddSecurityDeposit("");
        setAddCheckInDate("");
        setAddGender("");
        setAddAddress("");
        setAddEmergencyPhone("");
        setAddAadhaar("");

        setAddNameError("");
        setAddPhoneError("");
        setAddRentError("");
        setAddSecurityDepositError("");
        setAddCheckInDateError("");
        setAddGenderError("");
        setAddAddressError("");
        setAddEmergencyPhoneError("");
        setAddAadhaarError("");

        setAddTenantDatePickerVisible(false);
    };

    // this is the fucntion for call 
    const handleCallTenant = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    // this is showing user friendly date 
    const formatCheckInDate = (date: string) => {
        const [year, month, day] = date.split("-");

        const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        return `${day} ${monthNames[Number(month) - 1]}, ${year}`;
    };


    // Format the backend date as "13 November", without the year.
    const formatVacatingDate = (dateValue: string) => {
        const [year, month, day] = dateValue.split("-").map(Number);

        // Short uppercase month names to save space in the popup.
        const monthNames = [
            "JAN", "FEB", "MAR", "APR",
            "MAY", "JUN", "JUL", "AUG",
            "SEP", "OCT", "NOV", "DEC",
        ];

        // Return the original value if the backend date is invalid.
        if (
            !year ||
            !month ||
            month < 1 ||
            month > 12 ||
            !day ||
            day < 1 ||
            day > 31
        ) {
            return dateValue;
        }

        return `${day} ${monthNames[month - 1]}`;
    };

    // Close the popup and discard any unsaved checkout-date selection.
    const closeVacatingPopup = () => {
        // Do not close the popup while a save is in progress.
        if (updatingVacating) return;

        // Close the popup.
        setVacatingPopupVisible(false);
        setVacatingTenant(null);

        // Discard the unsaved checkout date when the popup closes.
        setExpectedCheckoutDate(null);

        // Hide the date picker if it is open.
        setShowExpectedCheckoutDatePicker(false);

        // Clear the checkout-date validation message.
        setCheckoutDateError(false);

        // Reset the calendar shake animation.
        checkoutDateShake.setValue(0);

        // Reset the switch's pending value.
        pendingVacatingStatusRef.current = null;
        setPendingVacatingStatus(null);

        // Reset the OK-button animation.
        vacatingOkAnimation.setValue(0);
    };


    // Toggle the vacating switch ON and OFF.
    const handleVacatingSwitchToggle = () => {
        // Stop if tenant data is missing or a save is in progress.
        if (
            !vacatingTenant ||
            pendingVacatingStatus === null ||
            updatingVacating
        ) {
            return;
        }

        // Use the current React state to reverse the switch.
        const nextStatus = !pendingVacatingStatus;

        // Keep the ref synchronized with the new value.
        pendingVacatingStatusRef.current = nextStatus;

        // Update the switch's pending state.
        setPendingVacatingStatus(nextStatus);

        // Show OK only when the pending value differs from the saved value.
        const hasChanges = nextStatus !== vacatingTenant.isVacating;

        // Animate the switch and the OK button together.
        Animated.parallel([
            Animated.timing(vacatingSwitchAnimation, {
                toValue: nextStatus ? 1 : 0,
                duration: 220,
                useNativeDriver: false,
            }),
            Animated.timing(vacatingOkAnimation, {
                toValue: hasChanges ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    };


    // Remind the owner to select a checkout date using two vibrations
    // and two short horizontal shakes of the calendar box.
    const triggerCheckoutDateReminder = () => {
        // Show the friendly validation message inside the popup.
        setCheckoutDateError(true);

        // Define one short left-right shake animation.
        const shakeOnce = () =>
            Animated.sequence([
                Animated.timing(checkoutDateShake, {
                    toValue: -7,
                    duration: 35,
                    useNativeDriver: true,
                }),
                Animated.timing(checkoutDateShake, {
                    toValue: 7,
                    duration: 70,
                    useNativeDriver: true,
                }),
                Animated.timing(checkoutDateShake, {
                    toValue: -5,
                    duration: 70,
                    useNativeDriver: true,
                }),
                Animated.timing(checkoutDateShake, {
                    toValue: 0,
                    duration: 35,
                    useNativeDriver: true,
                }),
            ]);

        // Shake twice, with the second shake starting about 500 ms later.
        Animated.sequence([
            shakeOnce(),
            Animated.delay(290),
            shakeOnce(),
        ]).start(() => {
            // Ensure the calendar box returns to its resting position.
            checkoutDateShake.setValue(0);
        });

        // Give the phone its first haptic pulse.
        void Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Medium
        ).catch(() => {});

        // Give the phone its second haptic pulse after 500 ms.
        setTimeout(() => {
            void Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Medium
            ).catch(() => {});
        }, 500);
    };


    // Save the changed vacating status to the backend.
    const handleConfirmVacating = async () => {
        if (
            !vacatingTenant ||
            pendingVacatingStatus === null ||
            pendingVacatingStatus === vacatingTenant.isVacating ||
            updatingVacating ||
            vacatingSubmitLock.current
        ) {
            return;
        }

        const tenant = vacatingTenant;
        const newStatus = pendingVacatingStatus;

        // Remind the owner when Vacating is ON but no date is selected.
        if (newStatus === true && !expectedCheckoutDate) {
            triggerCheckoutDateReminder();

            // Stop before making any backend request.
            return;
        }

        // Lock immediately so another tap cannot start a second request.
        vacatingSubmitLock.current = true;

        try {
            setUpdatingVacating(true);

            // Convert the selected date to YYYY-MM-DD for the backend.
            // Use local date values to avoid timezone-related date changes.
            const checkoutDateString = expectedCheckoutDate
                ? `${expectedCheckoutDate.getFullYear()}-${String(
                    expectedCheckoutDate.getMonth() + 1
                ).padStart(2, "0")}-${String(
                    expectedCheckoutDate.getDate()
                ).padStart(2, "0")}`
                : null;

            // Send the vacating status and expected checkout date together.
            // When cancelling Vacating, send null to clear the date.
            await setTenantVacating(
                tenant.tenantId,
                newStatus,
                newStatus ? checkoutDateString : null
            );

            await fetchBeds(false);

            // Update the menu label to reflect the saved status.
            setMenuTenantVacatingStatus(newStatus);

            // Close and reset the popup only after a successful save.
            setVacatingPopupVisible(false);
            setVacatingTenant(null);

            // Reset the switch's stored value after a successful save.
            pendingVacatingStatusRef.current = null;
            setPendingVacatingStatus(null);

            vacatingOkAnimation.setValue(0);

            // Show confirmation to the owner.
            setSuccessMessage(
                newStatus
                    ? `${tenant.tenantName} marked as vacating.`
                    : `Vacating cancelled for ${tenant.tenantName}.`
            );

            setTimeout(() => {
                setSuccessMessage("");
            }, 4000);

            // Refresh the expanded tenant details if this bed is selected.
            // A refresh failure must not undo a successful backend update.
            if (selectedBedId === tenant.bedId) {
                try {
                    const refreshedTenant = await getTenantByBedId(
                        tenant.bedId
                    );

                    setTenantDetails(refreshedTenant);
                } catch (refreshError) {
                    console.error(
                        "Vacating status saved, but tenant details could not refresh:",
                        refreshError
                    );
                }
            }
        } catch (error) {
            // Keep the popup open so the owner can retry the save.
            Alert.alert(
                "Unable to update vacating status",
                error instanceof Error
                    ? error.message
                    : "Please try again."
            );
        } finally {
            // Allow another submission after the current request finishes.
            vacatingSubmitLock.current = false;
            setUpdatingVacating(false);
        }
    };

    // Smoothly transition the switch track from gray to navy blue.
    const vacatingSwitchColor = vacatingSwitchAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ["#9CA3AF", "#0a2255"],
    });


    // Smoothly move the white thumb between OFF and ON positions.
    const vacatingThumbLeft = vacatingSwitchAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [3, 23],
    });

    // Animate the OK button upward as it appears.
    const vacatingOkTranslateY = vacatingOkAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 0],
    });







    // UI 
    return (
        <SafeAreaView
            edges={["top", "bottom"]}
            style={styles.container}
        >
    
                        
            {/* Compact floating Move Tenant banner */}
            {moveSession && (
                <View
                    style={[
                        styles.moveTenantBanner,
                        {
                            top: insets.top,
                            marginTop: 6,
                        },
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

                    {/* Action buttons on the right */}
                    <View style={styles.moveTenantActions}>

                        {/* Cancel the move */}
                        <Pressable
                            style={styles.moveTenantCancelButton}
                            onPress={cancelMoveTenant}
                        >
                            <Text style={styles.moveTenantCancelText}>
                                Cancel
                            </Text>
                        </Pressable>

                        {/* Save the move after selecting a destination */}
                        <Pressable
                            style={[
                                styles.moveTenantSaveButton,
                                moveSession.destinationBedId === null && {
                                    opacity: 0.5,
                                },
                            ]}
                            disabled={moveSession.destinationBedId === null}
                            onPress={async () => {
                                // Stop if no destination bed is selected.
                                if (moveSession.destinationBedId === null) return;

                                try {
                                    // Move the tenant through the backend.
                                    await moveTenant(
                                        moveSession.tenantId,
                                        moveSession.destinationBedId
                                    );

                                    // Clear the move session after success.
                                    completeMoveTenant();

                                    // Show a success message.
                                    setSuccessMessage("Tenant moved successfully!");

                                    // Hide the message after 4 seconds.
                                    setTimeout(() => {
                                        setSuccessMessage("");
                                    }, 4000);

                                    // Refresh the room's bed information.
                                    await fetchBeds();

                                } catch (error) {
                                    // Log the error if the move fails.
                                    console.error("Failed to move tenant:", error);

                                    // Show an error message.
                                    setSuccessMessage(
                                        "Failed to move tenant. Please try again."
                                    );

                                    // Hide the message after 4 seconds.
                                    setTimeout(() => {
                                        setSuccessMessage("");
                                    }, 4000);
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


            {successMessage ? (
                <View style={styles.successMessage}>
                    <Text style={styles.successMessageText}>
                        {successMessage}
                    </Text>
                </View>
            ) : null}

            {deleteBedError ? (
                <View style={styles.deleteBedError}>
                    
                    <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color="#ff4d4f"
                    />

                    <Text style={styles.deleteBedErrorText}>
                        {deleteBedError}
                    </Text>
                </View>
            ) : null}


            {/* Room header with a back button on the left */}
            <View style={styles.roomHeader}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color="#1d2c40"
                    />
                </Pressable>

                <Text style={styles.title}>
                    Room {roomNumber}
                </Text>
            </View>

            <Text style={styles.subtitle}>
                Beds
            </Text>


            {loadingBeds ? (
                <View style={styles.bedSkeletonContainer}>
                    {[1, 2, 3, 4].map((item) => (
                        <View
                            key={item}
                            style={styles.bedSkeletonCard}
                        >
                            {/* Moving light that travels from left to right */}
                            <Animated.View
                                style={[
                                    styles.bedSkeletonShimmer,
                                    {
                                        transform: [
                                            {
                                                translateX: shimmerTranslate,
                                            },
                                        ],
                                    },
                                ]}
                            />

                            {/* Bed icon placeholder */}
                            <View style={styles.bedSkeletonIcon} />

                            {/* Tenant information placeholders */}
                            <View style={styles.bedSkeletonInfo}>

                                {/* Tenant name */}
                                <View style={styles.bedSkeletonName} />

                                {/* Rent amount */}
                                <View style={styles.bedSkeletonRent} />

                                {/* Check-in date */}
                                <View style={styles.bedSkeletonDate} />

                            </View>

                            {/* Round call button placeholder */}
                            <View style={styles.bedSkeletonRight} />

                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={beds}
                    keyExtractor={(bed) => bed.bed_id.toString()}
                    renderItem={({ item }) => {
                        const isOccupied = item.tenant !== null;
                        
                        let buttonRef: View | null = null;

                        return (
                            <View>
                                <View                              
                                    style={[
                                        styles.bedCard,

                                        // In Move Tenant mode, highlight empty beds that can be selected.
                                        moveSession &&
                                            !item.tenant &&
                                            (item.status === "AVAILABLE" || item.status === "MAINTENANCE") && {
                                                backgroundColor: "#EFF6FF", // Light blue background
                                                borderWidth: 1.5,
                                                borderColor: "#60A5FA", // Blue border
                                            },

                                        // Give the selected destination a stronger green border.
                                        moveSession?.destinationBedId === item.bed_id && {
                                            borderWidth: 2,
                                            borderColor: "#127e8d",
                                        },
                                    ]}
                                >

                                    {/* Bed information */}
                                    <Pressable              
                                        onPress={async () => {

                                            // MOVE TENANT MODE:
                                            // Handle bed selection instead of opening tenant details.
                                            if (moveSession) {

                                                // Allow empty AVAILABLE and MAINTENANCE beds only.
                                                // Occupied and INACTIVE beds cannot be selected.
                                                if (
                                                    (item.status !== "AVAILABLE" &&
                                                        item.status !== "MAINTENANCE") ||
                                                    item.tenant
                                                ) {
                                                    return;
                                                }

                                                // Tapping the selected destination again deselects it.
                                                if (moveSession.destinationBedId === item.bed_id) {
                                                    Haptics.selectionAsync(); // Vibrate when tapping the selected bed again
                                                    selectMoveDestination(null, null, null);
                                                    return;
                                                }
   
                                                // Save the selected destination in temporary app state.
                                                Haptics.selectionAsync(); // Vibrate when selecting a destination bed
                                                selectMoveDestination(
                                                    item.bed_id,
                                                    String(roomNumber),
                                                    String(item.bed_number)
                                                );

                                                return;
                                            }

                                            // NORMAL MODE:
                                            // Keep your existing bed information behavior unchanged.

                                            // Close the expanded card if this bed is already selected.
                                            if (selectedBedId === item.bed_id) {
                                                setSelectedBedId(null);
                                                setTenantDetails(null);
                                                return;
                                            }

                                            // Select this bed.
                                            setSelectedBedId(item.bed_id);

                                            // Empty bed: no tenant API request is required.
                                            if (!item.tenant) {
                                                setTenantDetails(null);
                                                return;
                                            }

                                            try {
                                                setTenantLoading(true);

                                                const data = await getTenantByBedId(item.bed_id);
                                                setTenantDetails(data);

                                            } catch (error) {
                                                console.error(
                                                    "Failed to fetch tenant information:",
                                                    error
                                                );

                                                setTenantDetails(null);

                                            } finally {
                                                setTenantLoading(false);
                                            }
                                        }}

                                    >
                                        <View style={styles.bedInfoRow}>

                                            <View style={styles.bedIconBox}>

                                                <Text style={styles.bedIconNumber}>
                                                    Bed {item.bed_number}
                                                </Text>

                                                <Ionicons
                                                    name="bed-outline"
                                                    size={24}
                                                    color={
                                                        item.status === "MAINTENANCE"
                                                            ? "#D97706" // Maintenance: orange
                                                            : item.tenant
                                                                ? "#16A34A" // Occupied: green
                                                                : "#2563EB" // Available: blue
                                                    }
                                                />

                                            </View>

                                            <View style={styles.bedTextContainer}>

                                                <View style={styles.statusRow}>
                                                    {item.tenant ? (
                                                        <Text
                                                            style={styles.tenantName}
                                                            numberOfLines={1}
                                                        >
                                                            {item.tenant.full_name}
                                                        </Text>
                                                    ) : item.status === "AVAILABLE" ? (
                                                        <View style={styles.availableBadge}>
                                                            <Text style={styles.availableBadgeText}>
                                                                Available
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.status}>
                                                            {item.status}
                                                        </Text>
                                                    )}
                                                </View>

                                                {item.rent !== null && (
                                                    <>
                                                        <Text style={styles.rent}>
                                                            ₹{item.rent.toLocaleString("en-IN")}
                                                        </Text>

                                                        {isOccupied && item.tenant?.check_in_date && (
                                                            <Text style={styles.joiningDate}>
                                                                {formatCheckInDate(item.tenant.check_in_date)}
                                                            </Text>
                                                        )}
                                                    </>
                                                )}

                                            </View>

                                        </View>
                                    </Pressable>

                                    {/* Rent payment status — bottom-right */}
                                    {/* Paid status — compact, combined badge */}
                                    {item.payment_status === "PAID" && (
                                        <View style={styles.paymentStatusRow}>
                                            <Text style={styles.paidBadgeText}>Paid</Text>

                                            <View style={styles.paidCheckCircle}>
                                                <Ionicons
                                                    name="checkmark"
                                                    size={10}
                                                    color="#FFFFFF"
                                                />
                                            </View>
                                        </View>
                                    )}
                                
                                
                                    {/* Unpaid rent — month count in red circle */}
                                    {item.payment_status === "UNPAID" &&
                                        item.unpaid_months > 0 && (
                                            <View style={styles.unpaidBadge}>
                                                <Text style={styles.unpaidBadgeText}>Due</Text>

                                                <View style={styles.unpaidCountCircle}>
                                                    <Text style={styles.unpaidCountText}>
                                                        {item.unpaid_months}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}


                                    {/* Maintenance indicator */}
                                    {item.status === "MAINTENANCE" && (
                                        <View style={styles.maintenanceIndicator}>
                                            <Text style={styles.maintenanceText}>
                                                🔧
                                            </Text>
                                        </View>
                                    )}


                                    
                                    {/* Vacating icon — shown only when the tenant is marked vacating */}
                                    {isOccupied && item.tenant?.is_vacating === true && (
                                        <View
                                            style={styles.vacatingIconContainer}
                                            accessibilityLabel="Tenant is vacating"
                                        >
                                            <Ionicons
                                                name="time-outline"
                                                size={17}
                                                color="#D97706"
                                            />
                                        </View>
                                    )}



                                    {/* Call button */}
                                    {isOccupied && item.tenant?.phone && (
                                        <Pressable
                                            style={styles.callButton}
                                            onPress={() => handleCallTenant(item.tenant!.phone)}
                                        >
                                            <Ionicons
                                                name="call-outline"
                                                size={17}
                                                color="#16A34A"
                                            />
                                        </Pressable>
                                    )}

                                    
                                    {/* Menu button */}
                                    <Pressable
                                        ref={(ref) => {
                                            buttonRef = ref;
                                        }}
                                        style={styles.menuButton}
                                        onPress={() => {
                                            // Preserve the original menu-positioning behavior.
                                            buttonRef?.measureInWindow((x, y, width, height) => {
                                                setMenuPosition({
                                                    x,
                                                    y,
                                                    height,
                                                });
                                            });

                                            // Clear the previous tenant's status.
                                            setMenuTenantVacatingStatus(null);

                                            // Open the menu immediately, as in your original working code.
                                            setOpenMenuBedId(item.bed_id);

                                            // Fetch the latest vacating status without waiting for the request.
                                            if (isOccupied) {
                                                getTenantByBedId(item.bed_id)
                                                    .then((data) => {
                                                        setMenuTenantVacatingStatus(
                                                            data.allocation.is_vacating === true
                                                        );
                                                    })
                                                    .catch((error) => {
                                                        console.error(
                                                            "Failed to fetch vacating status:",
                                                            error
                                                        );

                                                        setOpenMenuBedId(null);

                                                        Alert.alert(
                                                            "Unable to load tenant",
                                                            error instanceof Error
                                                                ? error.message
                                                                : "Please try again."
                                                        );
                                                    });
                                            }
                                        }}
                                    >
                                        <Text style={styles.menuDots}>
                                            ⋮
                                        </Text>
                                    </Pressable>



                                    {/*All Menus */}
                                    <Modal
                                        transparent={true}
                                        visible={
                                            openMenuBedId === item.bed_id
                                        }
                                        onRequestClose={() => closeActionMenu()}
                                    >
                                        <View style={styles.modalContainer}>

                                            <Pressable
                                                style={styles.modalOverlay}
                                                onPress={() => closeActionMenu()}
                                            />

                                            
                                            <Animated.View
                                                style={[
                                                    styles.actionMenu,
                                                    {
                                                        left: menuPosition.x - 120,
                                                        top: menuPosition.y + menuPosition.height,

                                                        // Fade in and scale up the menu smoothly.
                                                        opacity: actionMenuAnimation,
                                                        transform: [
                                                            { scale: actionMenuAnimation },
                                                        ],
                                                    },
                                                ]}
                                            >


                                                {isOccupied ? (
                                                    <>

                                                        {/* EDIT TENANT */}
                                                        <Pressable
                                                            style={styles.actionItem}
                                                            onPress={() => {
                                                            // Animate the menu closed before navigating to Edit Tenant.
                                                            closeActionMenu(() => {
                                                                router.push({
                                                                    pathname: "/tenant/edit/[bedId]",
                                                                    params: {
                                                                        bedId: item.bed_id.toString(),
                                                                        roomId: roomId.toString(),
                                                                        roomNumber: roomNumber.toString(),
                                                                    },
                                                                });
                                                            });
                                                        }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    justifyContent: "flex-start",
                                                                    gap: 10,
                                                                    width: "100%",
                                                                }}
                                                            >
                                                                {/* Pencil icon for editing tenant details */}
                                                                <Ionicons
                                                                    name="create-outline"
                                                                    size={15}
                                                                    color="#081536"
                                                                />

                                                                <Text style={styles.actionText}>
                                                                    Edit
                                                                </Text>
                                                            </View>
                                                        </Pressable>


                                                        {/* Divider between Edit and Move */}
                                                        <View
                                                            style={{
                                                                height: StyleSheet.hairlineWidth,
                                                                backgroundColor: "#E2E8F0",
                                                            }}
                                                        />

                                                        {/* MOVE TENANT */}
                                                        <Pressable
                                                            style={styles.actionItem}                                                                                     
                                                            onPress={() => {
                                                                // Stop if this bed does not have a tenant.
                                                                const tenant = item.tenant;
                                                                if (!tenant) return;

                                                                // Close the menu smoothly before starting Move Tenant mode.
                                                                closeActionMenu(() => {
                                                                    startMoveTenant({
                                                                        tenantId: tenant.tenant_id,
                                                                        tenantName: tenant.full_name,
                                                                        originalBedId: item.bed_id,
                                                                        buildingId: Number(buildingId),
                                                                        destinationBedId: null,
                                                                        destinationRoomNumber: null,
                                                                        destinationBedNumber: null,
                                                                    });
                                                                });
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    justifyContent: "flex-start",
                                                                    gap: 10,
                                                                    width: "100%",
                                                                }}
                                                            >
                                                                {/* Arrows icon for moving a tenant to another bed */}
                                                                <Ionicons
                                                                    name="swap-horizontal-outline"
                                                                    size={15}
                                                                    color="#05133a"
                                                                />

                                                                <Text style={styles.actionText}>
                                                                    Move
                                                                </Text>
                                                            </View>
                                                        </Pressable>

                                                        {/* Divider between move and vacating */}
                                                        <View
                                                            style={{
                                                                height: StyleSheet.hairlineWidth,
                                                                backgroundColor: "#E2E8F0",
                                                            }}
                                                        />
                                                        
                                                        {/* MARK VACATING / CANCEL VACATING BUTTON */}
                                                        <Pressable
                                                            // Disable the action until the latest vacating status is loaded.
                                                            style={[
                                                                styles.actionItem,
                                                                menuTenantVacatingStatus === null && { opacity: 0.5 },
                                                            ]}
                                                            disabled={
                                                                menuTenantVacatingStatus === null ||
                                                                updatingVacating
                                                            }
                                                            onPress={async () => {
                                                                // Close the three-dot menu before opening the confirmation popup.
                                                                setOpenMenuBedId(null);

                                                                // Make sure this bed has a tenant.
                                                                if (!item.tenant) {
                                                                    return;
                                                                }

                                                                try {
                                                                    // Fetch the latest tenant status and scheduled rent date.
                                                                    const data = await getTenantByBedId(item.bed_id);

                                                                    // Read the tenant's currently saved vacating status.
                                                                    const isVacating =
                                                                        data.allocation.is_vacating === true;

                                                                    // Store tenant and billing information for the popup.
                                                                    setVacatingTenant({
                                                                        tenantId: data.tenant.id,
                                                                        bedId: item.bed_id,
                                                                        tenantName: data.tenant.full_name,
                                                                        isVacating: isVacating,
                                                                        nextRentDate: data.next_rent_date,
                                                                    });

                                                                    // Initialize the switch using the tenant's saved status.
                                                                    vacatingSwitchAnimation.setValue(isVacating ? 1 : 0);

                                                                    // Keep the OK button hidden until the owner changes the switch.
                                                                    vacatingOkAnimation.setValue(0);

                                                                    // Synchronize the saved status before opening the popup.
                                                                    pendingVacatingStatusRef.current = isVacating;
                                                                    setPendingVacatingStatus(isVacating);

                                                                    // Start each new popup session without an unsaved date.
                                                                    setExpectedCheckoutDate(null);
                                                                    setShowExpectedCheckoutDatePicker(false);
                                                                    setCheckoutDateError(false);
                                                                    checkoutDateShake.setValue(0);

                                                                    // Open the popup without changing the backend.
                                                                    setVacatingPopupVisible(true);
                                                                } catch (error) {
                                                                    // Report errors without changing the saved vacating status.
                                                                    console.error(
                                                                        "Failed to load vacating information:",
                                                                        error
                                                                    );

                                                                    Alert.alert(
                                                                        "Unable to load tenant",
                                                                        error instanceof Error
                                                                            ? error.message
                                                                            : "Please try again."
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    justifyContent: "flex-start",
                                                                    gap: 10,
                                                                    width: "100%",
                                                                }}
                                                            >
                                                                {/* Orange clock icon for Mark Vacating / Cancel Vacating. */}
                                                                <Ionicons
                                                                    name="time-outline"
                                                                    size={15}
                                                                    color="#D97706"
                                                                />

                                                                {/* Keep the original dynamic loading and status labels. */}
                                                                <Text style={styles.actionText}>
                                                                    {menuTenantVacatingStatus === null
                                                                        ? "Loading..."
                                                                        : menuTenantVacatingStatus
                                                                            ? "Cancel Vacating"
                                                                            : "Vacating"}
                                                                </Text>
                                                            </View>

                                                        </Pressable>


                                                        {/* Divider between vacating and remove */}
                                                        <View
                                                            style={{
                                                                height: StyleSheet.hairlineWidth,
                                                                backgroundColor: "#E2E8F0",
                                                            }}
                                                        />


                                                        {/* REMOVE TENANT */}
                                                        <Pressable
                                                            style={styles.actionItem}
                                                            onPress={() => {
                                                                // Smoothly close the three-dot menu before showing the popup.
                                                                closeActionMenu(() => {
                                                                    // Continue only if this bed has a tenant.
                                                                    if (item.tenant?.tenant_id) {
                                                                        // Store the tenant ID for the existing removal flow.
                                                                        setTenantToRemove(item.tenant.tenant_id);

                                                                        // Show the existing Remove Tenant confirmation popup.
                                                                        setRemoveTenantVisible(true);
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    justifyContent: "flex-start",
                                                                    gap: 10,
                                                                    width: "100%",
                                                                }}
                                                            >
                                                                {/* Red icon for the Remove Tenant action. */}
                                                                <Ionicons
                                                                    name="trash-outline"
                                                                    size={15}
                                                                    color="#DC2626"
                                                                />

                                                                {/* Keep the existing menu label. */}
                                                                <Text style={styles.actionText}>
                                                                    Remove
                                                                </Text>
                                                            </View>
                                                        </Pressable>


                                                    </>
                                                ) : (
                                                    <>

                                                        {/* ADD TENANT */}
                                                        <Pressable
                                                            style={styles.actionItem}
                                                            onPress={() => {
                                                                // Smoothly close the three-dot menu before opening the form.
                                                                closeActionMenu(() => {
                                                                    // Reset the form so previous tenant data is cleared.
                                                                    resetAddTenantForm();

                                                                    // Store the selected bed's ID and bed number.
                                                                    setTenantToAddBedId(item.bed_id);
                                                                    setTenantToAddBedNumber(item.bed_number);

                                                                    // Open the existing Add Tenant form.
                                                                    setAddTenantVisible(true);
                                                                });
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    justifyContent: "flex-start",
                                                                    gap: 10,
                                                                    width: "100%",
                                                                }}
                                                            >
                                                                {/* Green icon for the Add Tenant action. */}
                                                                <Ionicons
                                                                    name="person-add-outline"
                                                                    size={15}
                                                                    color="#16A34A"
                                                                />

                                                                {/* Keep the Add Tenant label. */}
                                                                <Text style={styles.actionText}>
                                                                    Add Tenant
                                                                </Text>
                                                            </View>
                                                        </Pressable>

                                                        {/* Divider between ADD TENANT and DELETE BED */}
                                                        <View
                                                            style={{
                                                                height: StyleSheet.hairlineWidth,
                                                                backgroundColor: "#E2E8F0",
                                                            }}
                                                        />

                                                        {!item.tenant && item.status !== "INACTIVE" && (
                                                            <>
                                                                {/* DELETE BED */}
                                                                <Pressable
                                                                    style={styles.actionItem}
                                                                    onPress={() => {
                                                                        // Smoothly close the three-dot menu before showing the alert.
                                                                        closeActionMenu(() => {
                                                                            // Ask the owner to confirm before deleting the bed.
                                                                            Alert.alert(
                                                                                "Delete Bed",
                                                                                "Are you sure you want to delete this bed?",
                                                                                [
                                                                                    {
                                                                                        // Keep the bed unchanged when Cancel is selected.
                                                                                        text: "Cancel",
                                                                                        style: "cancel",
                                                                                    },
                                                                                    {
                                                                                        // Delete the bed only after confirmation.
                                                                                        text: "Delete",
                                                                                        style: "destructive",
                                                                                        onPress: () => handleDeleteBed(item.bed_id),
                                                                                    },
                                                                                ]
                                                                            );
                                                                        });
                                                                    }}
                                                                >
                                                                    <View
                                                                        style={{
                                                                            flexDirection: "row",
                                                                            alignItems: "center",
                                                                            justifyContent: "flex-start",
                                                                            gap: 10,
                                                                            width: "100%",
                                                                        }}
                                                                    >
                                                                        {/* Red trash icon for the Delete Bed action. */}
                                                                        <Ionicons
                                                                            name="trash-outline"
                                                                            size={15}
                                                                            color="#DC2626"
                                                                        />

                                                                        {/* Keep the existing menu label. */}
                                                                        <Text style={styles.actionText}>
                                                                            Delete Bed
                                                                        </Text>
                                                                    </View>
                                                                </Pressable>
                                                            </>
                                                        )}

                                                    </>
                                                )}

                                            </Animated.View>
                                        </View>
                                    </Modal>

                                </View>


                                {/* Expanded information card */}
                                {selectedBedId === item.bed_id && (
                                    <View style={styles.tenantDetailsCard}>

                                        {tenantLoading ? (
                                            <ActivityIndicator size="small" />

                                        ) : item.tenant && tenantDetails ? (

                                            <>
                                                {/* Tenant Header */}
                                                <View style={styles.tenantPremiumHeader}>

                                                    <View style={styles.tenantAvatar}>
                                                        <Text style={styles.tenantAvatarText}>
                                                            {tenantDetails.tenant.full_name
                                                                .split(" ")
                                                                .map((name: string) => name[0])
                                                                .slice(0, 2)
                                                                .join("")
                                                                .toUpperCase()}
                                                        </Text>
                                                    </View>

                                                    <View style={styles.tenantHeaderInfo}>
                                                        <Text
                                                            style={styles.tenantHeaderName}
                                                            numberOfLines={1}
                                                        >
                                                            {tenantDetails.tenant.full_name}
                                                        </Text>

                                                        <Text style={styles.tenantHeaderRole}>
                                                            Tenant
                                                        </Text>
                                                    </View>

                                                    <View style={styles.occupiedBadge}>
                                                        <Text style={styles.occupiedBadgeText}>
                                                            Occupied
                                                        </Text>
                                                    </View>

                                                </View>


                                                {/* Information Content */}
                                                <View style={styles.informationColumns}>

                                                    {/* LEFT — Tenant Information */}
                                                    <View style={styles.tenantColumn}>

                                                        <View style={styles.columnHeader}>
                                                            <Ionicons
                                                                name="person-outline"
                                                                size={16}
                                                                color="#2563EB"
                                                            />

                                                            <Text style={styles.columnHeaderText}>
                                                                Tenant Information
                                                            </Text>
                                                        </View>


                                                        {/* Phone */}
                                                        <View style={styles.infoRow}>

                                                            <Ionicons
                                                                name="call-outline"
                                                                size={16}
                                                                color="#64748B"
                                                            />

                                                            <Text style={styles.infoLabel}>
                                                                Phone
                                                            </Text>

                                                            <Text
                                                                style={styles.infoValue}
                                                                numberOfLines={1}
                                                            >
                                                                {tenantDetails.tenant.phone}
                                                            </Text>

                                                        </View>


                                                        {/* Gender */}
                                                        <View style={styles.infoRow}>

                                                            <Ionicons
                                                                name="male-female-outline"
                                                                size={16}
                                                                color="#64748B"
                                                            />

                                                            <Text style={styles.infoLabel}>
                                                                Gender
                                                            </Text>

                                                            <Text style={styles.infoValue}>
                                                                {tenantDetails.tenant.gender || "-"}
                                                            </Text>

                                                        </View>


                                                        {/* Address */}
                                                        <View style={styles.infoRow}>

                                                            <Ionicons
                                                                name="location-outline"
                                                                size={16}
                                                                color="#64748B"
                                                            />

                                                            <Text style={styles.infoLabel}>
                                                                Address
                                                            </Text>

                                                            <Text
                                                                style={styles.infoValue}
                                                                numberOfLines={2}
                                                            >
                                                                {tenantDetails.tenant.permanent_address || "-"}
                                                            </Text>

                                                        </View>


                                                        {/* Emergency */}
                                                        <View style={styles.infoRow}>

                                                            <Ionicons
                                                                name="call-outline"
                                                                size={16}
                                                                color="#64748B"
                                                            />

                                                            <Text style={styles.infoLabel}>
                                                                Emergency
                                                            </Text>

                                                            <Text
                                                                style={styles.infoValue}
                                                                numberOfLines={1}
                                                            >
                                                                {tenantDetails.tenant.emergency_contact_phone || "-"}
                                                            </Text>

                                                        </View>


                                                        {/* Aadhaar */}
                                                        <View style={styles.infoRow}>

                                                            <Ionicons
                                                                name="card-outline"
                                                                size={16}
                                                                color="#64748B"
                                                            />

                                                            <Text style={styles.infoLabel}>
                                                                Aadhaar
                                                            </Text>

                                                            <Text
                                                                style={styles.infoValue}
                                                                numberOfLines={1}
                                                            >
                                                                {tenantDetails.tenant.aadhaar_number || "-"}
                                                            </Text>

                                                        </View>

                                                    </View>


                                                    {/* VERTICAL DIVIDER */}
                                                    <View style={styles.columnDivider} />


                                                    {/* RIGHT — Allocation Information */}
                                                    <View style={styles.allocationColumn}>

                                                        <View style={styles.columnHeader}>
                                                            <Ionicons
                                                                name="calendar-outline"
                                                                size={16}
                                                                color="#16A34A"
                                                            />

                                                            <Text
                                                                style={[
                                                                    styles.columnHeaderText,
                                                                    styles.allocationHeaderText,
                                                                ]}
                                                            >
                                                                Allocation Info
                                                            </Text>
                                                        </View>


                                                        {/* Check-in Date */}
                                                        <View style={styles.allocationInfoRow}>

                                                            <Ionicons
                                                                name="calendar-outline"
                                                                size={16}
                                                                color="#2563EB"
                                                            />

                                                            <View style={styles.allocationTextContainer}>
                                                                <Text style={styles.allocationLabel}>
                                                                    Check-in Date
                                                                </Text>

                                                                <Text style={styles.allocationValue}>
                                                                    {tenantDetails.allocation.check_in_date}
                                                                </Text>
                                                            </View>

                                                        </View>


                                                        {/* Monthly Rent */}
                                                        <View style={styles.allocationInfoRow}>

                                                            <Ionicons
                                                                name="cash-outline"
                                                                size={16}
                                                                color="#16A34A"
                                                            />

                                                            <View style={styles.allocationTextContainer}>
                                                                <Text style={styles.allocationLabel}>
                                                                    Monthly Rent
                                                                </Text>

                                                                <Text style={styles.allocationValue}>
                                                                    ₹{tenantDetails.allocation.rent}
                                                                </Text>
                                                            </View>

                                                        </View>


                                                        {/* Security Deposit */}
                                                        <View style={styles.allocationInfoRow}>

                                                            <Ionicons
                                                                name="shield-checkmark-outline"
                                                                size={16}
                                                                color="#7C3AED"
                                                            />

                                                            <View style={styles.allocationTextContainer}>
                                                                <Text style={styles.allocationLabel}>
                                                                    Security Deposit
                                                                </Text>

                                                                <Text style={styles.allocationValue}>
                                                                    ₹{tenantDetails.allocation.security_deposit}
                                                                </Text>
                                                            </View>

                                                        </View>

                                                    </View>

                                                </View>

                                            </>

                                        ) : !item.tenant ? (

                                            <View style={styles.availableBedContent}>

                                                <View style={styles.availableBedHeader}>
                                                    <View style={styles.availableIconBox}>
                                                        <Ionicons
                                                            name="checkmark-circle-outline"
                                                            size={20}
                                                            color="#16A34A"
                                                        />
                                                    </View>

                                                    <View style={styles.availableTextContainer}>
                                                        <Text style={styles.availableTitle}>
                                                            Bed is available
                                                        </Text>

                                                        <Text style={styles.availableSubtitle}>
                                                            Add a tenant to this bed
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Pressable
                                                    style={styles.addTenantButton}
                                                    onPress={() => {
                                                        resetAddTenantForm();
                                                        setTenantToAddBedId(item.bed_id);
                                                        setTenantToAddBedNumber(item.bed_number);
                                                        setAddTenantVisible(true);
                                                    }}
                                                >

                                                    <Text style={styles.addTenantButtonText}>
                                                        Add Tenant
                                                    </Text>
                                                </Pressable>

                                            </View>

                                        ) : null}

                                    </View>
                                )}

                            </View>
                        );
                    }}
                />
            )}



            {/* Remove Tenant Confirmation Modal */}
            <Modal
                visible={removeTenantVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setRemoveTenantVisible(false);
                    setTenantToRemove(null);
                }}
            >
                <View style={styles.removeModalContainer}>

                    <View style={styles.removeModalBox}>

                        <Text style={styles.removeModalTitle}>
                            Remove Tenant?
                        </Text>

                        <Text style={styles.removeModalMessage}>
                            Are you sure you want to remove this tenant?
                        </Text>

                        <View style={styles.removeModalButtons}>

                            <Pressable
                                style={styles.cancelButton}
                                onPress={() => {
                                    setRemoveTenantVisible(false);
                                    setTenantToRemove(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.removeButton}
                                disabled={removingTenant}
                                onPress={async () => {

                                    if (!tenantToRemove) {
                                        return;
                                    }

                                    try {

                                        // Show loading
                                        setRemovingTenant(true);

                                        // Remove tenant
                                        const result = await removeTenant(
                                            tenantToRemove
                                        );

                                        // Close popup
                                        setRemoveTenantVisible(false);
                                        setTenantToRemove(null);

                                        // Close expanded tenant information
                                        setSelectedBedId(null);
                                        setTenantDetails(null);

                                        // Refresh beds
                                        await fetchBeds();

                                        // Show success message
                                        setSuccessMessage(
                                            result.message || "Tenant removed successfully."
                                        );

                                        // Hide success message after 4 seconds
                                        setTimeout(() => {
                                            setSuccessMessage("");
                                        }, 4000);

                                    } catch (error) {

                                        console.log(
                                            "Failed to remove tenant:",
                                            error
                                        );

                                    } finally {

                                        setRemovingTenant(false);

                                    }
                                }}
                            >
                                {removingTenant ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />
                                ) : (
                                    <Text style={styles.removeButtonText}>
                                        Remove
                                    </Text>
                                )}
                            </Pressable>

                        </View>

                    </View>

                </View>
            </Modal>


            
            
            {/* Vacating / Cancel Vacating Confirmation Popup */}
            <Modal
                visible={vacatingPopupVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={closeVacatingPopup}
            >
                <View style={styles.vacatingModalContainer}>
                    <View style={styles.vacatingModalBox}>

                        {/* Top row: Close button on left, switch on right */}
                        <View style={styles.vacatingModalTopRow}>
                            <Pressable
                                style={styles.vacatingCloseButton}
                                onPress={closeVacatingPopup}
                                disabled={updatingVacating}
                                accessibilityLabel="Close vacating popup"
                            >
                                <Ionicons
                                    name="close"
                                    size={19}
                                    color="#475569"
                                />
                            </Pressable>

                            {/* Animated ON/OFF switch */}
                            <Pressable
                                onPress={handleVacatingSwitchToggle}
                                disabled={
                                    updatingVacating ||
                                    pendingVacatingStatus === null
                                }
                                accessibilityRole="switch"
                                accessibilityState={{
                                    checked: pendingVacatingStatus === true,
                                }}
                                accessibilityLabel="Vacating status"
                            >
                                {/* Switch track with smoothly changing color */}
                                <Animated.View
                                    style={[
                                        styles.vacatingSwitchTrack,
                                        {
                                            backgroundColor: vacatingSwitchColor,
                                        },
                                    ]}
                                >
                                    {/* Animated white thumb */}
                                    <Animated.View
                                        style={[
                                            styles.vacatingSwitchThumb,
                                            {
                                                left: vacatingThumbLeft,
                                            },
                                        ]}
                                    />
                                </Animated.View>
                            </Pressable>
                        </View>

                        {/* Compact message based on the tenant's saved vacating status */}
                        {vacatingTenant && pendingVacatingStatus !== null && (
                            <View style={styles.vacatingMessageContainer}>
                                {!vacatingTenant.isVacating ? (
                                    <>
                                        {/* Main Mark Vacating message */}
                                        <Text style={styles.vacatingModalMessageStrong}>
                                            {vacatingTenant.tenantName}
                                            {"'s rent for "}
                                            <Text style={styles.vacatingModalDate}>
                                                {formatVacatingDate(vacatingTenant.nextRentDate)}
                                            </Text>
                                            {" won't be added automatically while Vacating is on."}
                                        </Text>

                                        {/* Supporting message explaining the owner's options */}
                                        <Text style={styles.vacatingModalMessageHint}>
                                            You can generate rent manually from the Vacating Tenants page
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.vacatingModalMessageStrong}>
                                            Turn off the switch to cancel Vacating.
                                        </Text>

                                        <Text style={styles.vacatingModalMessageHint}>
                                            If the tenant is leaving, you can remove them without cancelling Vacating.
                                        </Text>
                                    </>
                                )}
                            </View>
                        )}

                        {/* Expected checkout date and animated OK button */}
                        <View
                            style={{
                                width: "100%",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: vacatingTenant?.isVacating ? "flex-end" : "space-between",
                                gap: 10,
                                marginTop: 12,
                            }}
                        >
                            {/* Show calendar only when starting a new Vacating action. */}
                            {vacatingTenant && !vacatingTenant.isVacating && (
                            <Animated.View
                                style={{
                                    width: "55%",
                                    maxWidth: 220,
                                    transform: [
                                        { translateX: checkoutDateShake },
                                        { translateY: 4 },
                                    ],
                                }}
                            >
                                {/* Date selector: available even when the switch is OFF. */}
                                <Pressable
                                    style={{
                                        // Match the OK button's exact height.
                                        height: 44,

                                        // Let the parent control the width; don't stretch the height.
                                        flexGrow: 0,
                                        flexShrink: 1,

                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 6,

                                        // Keep only horizontal padding.
                                        paddingHorizontal: 8,
                                        paddingVertical: 0,

                                        borderWidth: 1,
                                        borderColor: "#CBD5E1",
                                        borderRadius: 12,
                                        backgroundColor: "#FFFFFF",
                                    }}
                                    onPress={() => setShowExpectedCheckoutDatePicker(true)}
                                    disabled={updatingVacating}
                                    accessibilityLabel="Select expected checkout date"
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={19}
                                        color="#2563EB"
                                    />

                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: "#64748B" }}>
                                            vacating date
                                        </Text>

                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight: "600",
                                                color: expectedCheckoutDate ? "#0F172A" : "#64748B",
                                            }}
                                            numberOfLines={1}
                                        >
                                            {expectedCheckoutDate
                                                ? expectedCheckoutDate.toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })
                                                : "Select"}
                                        </Text>
                                    </View>

                                    <Ionicons
                                        name="chevron-down"
                                        size={16}
                                        color="#64748B"
                                    />
                                </Pressable>
                            </Animated.View>
                            )}

                            {/* Keep your existing animated OK button and visibility condition. */}
                            <Animated.View
                                style={[
                                    styles.vacatingOkContainer,
                                    {
                                        width: 80,
                                        opacity: vacatingOkAnimation,
                                        transform: [
                                            { translateY: vacatingOkTranslateY },
                                        ],
                                    },
                                ]}
                            >
                                {vacatingTenant &&
                                    pendingVacatingStatus !== null &&
                                    pendingVacatingStatus !== vacatingTenant.isVacating && (
                                        <Pressable
                                            style={[
                                                styles.vacatingOkButton,
                                                { width: 80, alignItems: "center" },
                                                updatingVacating && { opacity: 0.6 },
                                            ]}
                                            onPress={handleConfirmVacating}
                                            disabled={updatingVacating}
                                        >
                                            {updatingVacating ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color="#FFFFFF"
                                                />
                                            ) : (
                                                <Text style={styles.vacatingOkButtonText}>
                                                    OK
                                                </Text>
                                            )}
                                        </Pressable>
                                    )}
                            </Animated.View>
                        </View>

                        {/* Show the checkout-date validation message inside the popup. */}
                        {checkoutDateError && (
                            <Text
                                style={{
                                    marginTop: 6,
                                    color: "#DC2626",
                                    fontSize: 12,
                                    textAlign: "left",
                                }}
                            >
                                Please select vacating date.
                            </Text>
                        )}

                        {/* Native calendar: dates before today cannot be selected. */}
                        {showExpectedCheckoutDatePicker &&
                            vacatingTenant &&
                            !vacatingTenant.isVacating && (
                                <DateTimePicker
                                    value={expectedCheckoutDate ?? new Date()}
                                    mode="date"
                                    minimumDate={
                                        new Date(new Date().setHours(0, 0, 0, 0))
                                    }
                                    display={
                                        Platform.OS === "ios" ? "compact" : "default"
                                    }
                                    // Handle the selected date without using deprecated onChange.
                                    onValueChange={(_event, selectedDate) => {
                                        if (selectedDate) {
                                            // Save the date selected by the owner.
                                            setExpectedCheckoutDate(selectedDate);

                                            // Clear the validation message after selection.
                                            setCheckoutDateError(false);
                                        }

                                        // Close the date picker after selection.
                                        setShowExpectedCheckoutDatePicker(false);
                                    }}
                                    // Close the date picker when the owner dismisses it.
                                    onDismiss={() => {
                                        setShowExpectedCheckoutDatePicker(false);
                                    }}
                                />
                            )}
                    </View>
                </View>
            </Modal>




            {/* Add Tenant Bottom Sheet */}
            <Modal
                visible={addTenantVisible}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setAddTenantVisible(false);
                    setTenantToAddBedId(null);
                    setTenantToAddBedNumber("");
                }}
            >
                <View style={styles.addTenantModalContainer}>

                    {/* Space above the bottom sheet */}
                    <Pressable
                        style={styles.addTenantOverlay}
                        onPress={() => {
                            setAddTenantVisible(false);
                            setTenantToAddBedId(null);
                            setTenantToAddBedNumber("");
                        }}
                    />

                    {/* Bottom sheet */}
                    <View style={styles.addTenantSheet}>

                        {/* Drag handle */}
                        <View style={styles.addTenantHandle} />

                        {/* Bed number */}
                        <Text style={styles.addTenantBedNumber}>
                            Bed {tenantToAddBedNumber}
                        </Text>

                        {/* Form will come here later */}
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{
                                paddingBottom: keyboardHeight + 40,
                            }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >

                            {/* Name */}
                            <Text style={styles.addTenantLabel}>
                                Name <Text style={styles.requiredStar}>*</Text>
                            </Text>

                            <View style={styles.addTenantInputWrapper}>

                                <TextInput
                                    style={[
                                        styles.addTenantInput,
                                        addNameError && styles.addTenantInputWithError,
                                    ]}
                                    value={addFullName}
                                    onChangeText={(text) => {
                                        setAddFullName(text);
                                        setAddNameError("");
                                    }}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#64748B"
                                />

                                {addNameError ? (
                                    <Text style={styles.addTenantErrorInside}>
                                        {addNameError}
                                    </Text>
                                ) : null}

                            </View>


                            {/* Phone */}
                            <Text style={styles.addTenantLabel}>
                                Phone <Text style={styles.requiredStar}>*</Text>
                            </Text>

                            <View style={styles.addTenantInputWrapper}>

                                <TextInput
                                    style={[
                                        styles.addTenantInput,
                                        addPhoneError && styles.addTenantInputWithError,
                                    ]}
                                    value={addPhone}
                                    onChangeText={(text) => {
                                        setAddPhone(text);
                                        setAddPhoneError("");
                                    }}
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                    placeholderTextColor="#64748B"
                                />

                                {addPhoneError ? (
                                    <Text style={styles.addTenantErrorInside}>
                                        {addPhoneError}
                                    </Text>
                                ) : null}

                            </View>


                            {/* Rent + Security Deposit */}
                            <View style={styles.addTenantRow}>

                                <View style={styles.addTenantHalfField}>

                                    <Text style={styles.addTenantLabel}>
                                        Rent <Text style={styles.requiredStar}>*</Text>
                                    </Text>

                                    <View style={styles.addTenantInputWrapper}>

                                        <TextInput
                                            style={[
                                                styles.addTenantInput,
                                                addRentError && styles.addTenantInputWithError,
                                            ]}
                                            value={addRent}
                                            onChangeText={(text) => {
                                                setAddRent(text);
                                                setAddRentError("");
                                            }}
                                            placeholder="Rent"
                                            keyboardType="numeric"
                                            placeholderTextColor="#64748B"
                                        />

                                        {addRentError ? (
                                            <Text style={styles.addTenantErrorInside}>
                                                {addRentError}
                                            </Text>
                                        ) : null}

                                    </View>

                                </View>


                                <View style={styles.addTenantHalfField}>

                                    <Text style={styles.addTenantLabel}>
                                        Security Deposit
                                    </Text>

                                    <View style={styles.addTenantInputWrapper}>

                                        <TextInput
                                            style={[
                                                styles.addTenantInput,
                                                addSecurityDepositError &&
                                                    styles.addTenantInputWithError,
                                            ]}
                                            value={addSecurityDeposit}
                                            onChangeText={(text) => {
                                                setAddSecurityDeposit(text);
                                                setAddSecurityDepositError("");
                                            }}
                                            placeholder="Security"
                                            keyboardType="numeric"
                                            placeholderTextColor="#64748B"
                                        />

                                        {addSecurityDepositError ? (
                                            <Text style={styles.addTenantErrorInside}>
                                                {addSecurityDepositError}
                                            </Text>
                                        ) : null}

                                    </View>

                                </View>

                            </View>


                            {/* Check-in Date + Gender */}
                            <View style={styles.addTenantRow}>

                                {/* Check-in Date */}
                                <View style={styles.addTenantHalfField}>

                                    <Text style={styles.addTenantLabel}>
                                        Check-in Date <Text style={styles.requiredStar}>*</Text>
                                    </Text>

                                    <View style={styles.addTenantInputWrapper}>

                                        <Pressable
                                            style={[
                                                styles.addTenantInput,
                                                addCheckInDateError &&
                                                    styles.addTenantInputWithError,
                                            ]}
                                            onPress={() => {
                                                setAddCheckInDateError("");
                                                setAddTenantDatePickerVisible(true);
                                            }}
                                        >
                                            <Text style={styles.addTenantInputText}>
                                                {addCheckInDate || "Select date"}
                                            </Text>
                                        </Pressable>

                                        {addCheckInDateError ? (
                                            <Text style={styles.addTenantErrorInside}>
                                                {addCheckInDateError}
                                            </Text>
                                        ) : null}

                                    </View>

                                    {/* Date Picker */}
                                    {addTenantDatePickerVisible && (
                                        <DateTimePicker
                                            value={
                                                addCheckInDate
                                                    ? new Date(addCheckInDate)
                                                    : new Date()
                                            }
                                            mode="date"
                                            display="default"
                                            onValueChange={(event, selectedDate) => {

                                                setAddTenantDatePickerVisible(false);

                                                if (selectedDate) {
                                                    const year = selectedDate.getFullYear();

                                                    const month = String(
                                                        selectedDate.getMonth() + 1
                                                    ).padStart(2, "0");

                                                    const day = String(
                                                        selectedDate.getDate()
                                                    ).padStart(2, "0");

                                                    setAddCheckInDate(
                                                        `${year}-${month}-${day}`
                                                    );
                                                }
                                            }}
                                            onDismiss={() => {
                                                setAddTenantDatePickerVisible(false);
                                            }}
                                        />
                                    )}

                                </View>


                                {/* Gender */}
                                <View style={styles.addTenantHalfField}>

                                    <Text style={styles.addTenantLabel}>
                                        Gender
                                    </Text>

                                    <View style={styles.addTenantInputWrapper}>

                                        <Pressable
                                            style={[
                                                styles.addTenantInput,
                                                addGenderError && styles.addTenantInputWithError,
                                            ]}
                                            onPress={() => {

                                                setAddGenderError("");

                                                const options = [
                                                    "MALE",
                                                    "FEMALE",
                                                    "OTHER"
                                                ];

                                                const currentIndex =
                                                    options.indexOf(addGender);

                                                const nextIndex =
                                                    (currentIndex + 1) % options.length;

                                                setAddGender(
                                                    options[nextIndex]
                                                );
                                            }}
                                        >
                                            <Text style={styles.addTenantInputText}>
                                                {addGender || "Select gender"}
                                            </Text>
                                        </Pressable>

                                        {addGenderError ? (
                                            <Text style={styles.addTenantErrorInside}>
                                                {addGenderError}
                                            </Text>
                                        ) : null}

                                    </View>

                                </View>

                            </View>


                            {/* Address */}
                            <Text style={styles.addTenantLabel}>
                                Address
                            </Text>

                            <TextInput
                                style={[
                                    styles.addTenantInput,
                                    addAddressError &&
                                        styles.addTenantInputWithError,
                                ]}
                                value={addAddress}
                                onChangeText={(text) => {
                                    setAddAddress(text);
                                    setAddAddressError("");
                                }}
                                placeholder="Enter address"
                                placeholderTextColor="#64748B"
                            />

                            {addAddressError ? (
                                <Text style={styles.addTenantErrorInside}>
                                    {addAddressError}
                                </Text>
                            ) : null}


                            {/* Emergency Phone */}
                            <Text style={styles.addTenantLabel}>
                                Emergency Phone
                            </Text>

                            <TextInput
                                style={styles.addTenantInput}
                                value={addEmergencyPhone}
                                onChangeText={setAddEmergencyPhone}
                                placeholder="Emergency phone"
                                keyboardType="phone-pad"
                                placeholderTextColor="#64748B"
                            />

                            {addEmergencyPhoneError ? (
                                <Text style={styles.addTenantErrorInside}>
                                    {addEmergencyPhoneError}
                                </Text>
                            ) : null}


                            {/* Aadhaar */}
                            <Text style={styles.addTenantLabel}>
                                Aadhaar Number
                            </Text>

                            <View style={styles.addTenantInputWrapper}>

                                <TextInput
                                    style={[
                                        styles.addTenantInput,
                                        addAadhaarError &&
                                            styles.addTenantInputWithError,
                                    ]}
                                    value={addAadhaar}
                                    onChangeText={(text) => {
                                        setAddAadhaar(formatAadhaar(text));
                                        setAddAadhaarError("");
                                    }}
                                    placeholder="XXXX-XXXX-XXXX"
                                    keyboardType="numeric"
                                    placeholderTextColor="#64748B"
                                    maxLength={14}
                                />

                                {addAadhaarError ? (
                                    <Text style={styles.addTenantErrorInside}>
                                        {addAadhaarError}
                                    </Text>
                                ) : null}

                            </View>
                            
                            {addTenantError ? (
                                <Text style={styles.addTenantApiError}>
                                    {addTenantError}
                                </Text>
                            ) : null}

                            {/* Add Tenant */}
                            <Pressable
                                style={[
                                    styles.addTenantSaveButton,
                                    addingTenant && { opacity: 0.9 },
                                ]}
                                disabled={addingTenant}
                                onPress={ async () => {

                                    let hasError = false;

                                    // Name
                                    if (addFullName.trim().length < 2) {
                                        setAddNameError("Name must be at least 2 characters.");
                                        hasError = true;
                                    } else {
                                        setAddNameError("");
                                    }

                                    // Phone
                                    if (!/^\d{10,15}$/.test(addPhone.trim())) {
                                        setAddPhoneError("Enter a valid number");
                                        hasError = true;
                                    } else {
                                        setAddPhoneError("");
                                    }

                                    // Rent
                                    if (!addRent.trim() || Number(addRent) <= 0) {
                                        setAddRentError("Rent must be greater than 0");
                                        hasError = true;
                                    } else {
                                        setAddRentError("");
                                    }

                                    // Security Deposit
                                    if (
                                        addSecurityDeposit.trim() &&
                                        Number(addSecurityDeposit) < 0
                                    ) {
                                        setAddSecurityDepositError("Cannot be negative");
                                        hasError = true;
                                    } else {
                                        setAddSecurityDepositError("");
                                    }

                                    // Check-in Date
                                    if (!addCheckInDate.trim()) {
                                        setAddCheckInDateError("Check-in date is required");
                                        hasError = true;
                                    } else {
                                        const selectedDate = new Date(addCheckInDate);

                                        if (isNaN(selectedDate.getTime())) {
                                            setAddCheckInDateError("Enter a valid date");
                                            hasError = true;
                                        } else {
                                            setAddCheckInDateError("");
                                        }
                                    }


                                    // Gender
                                    if (!addGender) {
                                        setAddGenderError("Gender is required");
                                        hasError = true;
                                    } else {
                                        setAddGenderError("");
                                    }

        
                                    // Emergency Phone
                                    if (addEmergencyPhone.trim() !== "") {
                                        const phone = addEmergencyPhone.trim();

                                        if (!/^\d{10,15}$/.test(phone)) {
                                            setAddEmergencyPhoneError(
                                                "Enter a valid phone number."
                                            );
                                            hasError = true;
                                        } else {
                                            setAddEmergencyPhoneError("");
                                        }
                                    } else {
                                        setAddEmergencyPhoneError("");
                                    }

                                    
                                    // Aadhaar
                                    if (addAadhaar.trim() !== "") {
                                        const aadhaarNumber = addAadhaar.replace(/\D/g, "");

                                        if (!/^\d{12}$/.test(aadhaarNumber)) {
                                            setAddAadhaarError("Aadhaar number must be 12 digits.");
                                            hasError = true;
                                        } else {
                                            setAddAadhaarError("");
                                        }
                                    } else {
                                        setAddAadhaarError("");
                                    }

                                    
                                    // Address
                                    if (addAddress.trim() !== "") {
                                        const address = addAddress.trim();

                                        if (address.length < 2) {
                                            setAddAddressError(
                                                "Address must be at least 2 characters."
                                            );
                                            hasError = true;
                                        } else {
                                            setAddAddressError("");
                                        }
                                    } else {
                                        setAddAddressError("");
                                    }

                                    // Stop here if validation failed
                                    if (hasError) {
                                        return;
                                    }

                                    try {
                                        setAddingTenant(true);

                                        const result = await addTenant(
                                            tenantToAddBedId!,
                                            {
                                                full_name: addFullName.trim(),
                                                phone: addPhone.trim(),
                                                gender: addGender as "MALE" | "FEMALE" | "OTHER",
                                                permanent_address: addAddress.trim() || undefined,
                                                emergency_contact_phone:
                                                    addEmergencyPhone.trim() || undefined,
                                                aadhaar_number: addAadhaar.replace(/\D/g, "") || undefined,
                                                check_in_date: addCheckInDate,
                                                rent: Number(addRent),
                                                security_deposit: addSecurityDeposit.trim()
                                                    ? Number(addSecurityDeposit)
                                                    : 0,
                                            }
                                        );


                                        // Close Add Tenant form
                                        setAddTenantVisible(false);

                                        // Reset form
                                        resetAddTenantForm();

                                        // Clear selected bed
                                        setSelectedBedId(null);


                                        // Check whether the newly occupied bed was selected
                                        // as the Move Tenant destination.
                                        const currentMoveSession = getMoveTenantSession();

                                        if (
                                            currentMoveSession?.destinationBedId === tenantToAddBedId
                                        ) {
                                            // Clear only the destination; keep Move Tenant active.
                                            selectMoveDestination(null, null, null);
                                        }


                                        // Refresh beds
                                        await fetchBeds();

                                        // Show success message
                                        setSuccessMessage(
                                            result.message || "Tenant added successfully."
                                        );

                                        // Hide success message after 4 seconds
                                        setTimeout(() => {
                                            setSuccessMessage("");
                                        }, 4000);

                                    } catch (error) {

                                        console.log("Failed to add tenant:", error);

                                        setAddTenantError(
                                            error instanceof Error
                                                ? error.message
                                                : "Failed to add tenant."
                                        );

                                    } finally {

                                        setAddingTenant(false);

                                    }
                                }}
                                >

                                {addingTenant ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.addTenantSaveButtonText}>
                                        Add Tenant
                                    </Text>
                                )}

                            </Pressable>

                        </ScrollView>

                    </View>

                </View>
            </Modal>


            
            <TouchableOpacity
                style={[
                    styles.floatingAddBedButton,
                    addingBed && styles.floatingAddBedButtonDisabled,
                    { bottom: insets.bottom + 12 },
                ]}
                onPress={handleAddBed}
                disabled={addingBed}
            >
                {addingBed ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <Text style={styles.floatingAddBedPlus}>+</Text>
                        <Text style={styles.floatingAddBedText}>Add Bed</Text>
                    </>
                )}
            </TouchableOpacity>

        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        // Control each side independently.
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,

    },

    roomHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 2,
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    title: {
        fontSize: 30,
        fontWeight: "800",
        color: "#1d2c40",
        marginBottom: 2,
    },

    subtitle: {
        marginTop: 6,
        marginBottom: 20,
        fontWeight:"600",
        fontSize: 15,
        color: "#4e617d",
    },

    bedSkeletonContainer: {
        gap: 12,
    },

    bedSkeletonCard: {
        height: 92,
        width: "100%",
        borderRadius: 16,
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        overflow: "hidden",
        position: "relative",
    },

    bedSkeletonShimmer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 120,
        backgroundColor: "#FFFFFF",
        opacity: 0.65,
    },

    bedSkeletonIcon: {
        position: "absolute",
        left: 18,
        top: 18,
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: "#E2E8F0",
    },

    bedSkeletonInfo: {
        position: "absolute",
        left: 88,
        top: 18,
    },

    bedSkeletonName: {
        width: 150,
        height: 18,
        borderRadius: 8,
        backgroundColor: "#E2E8F0",
    },

    bedSkeletonRent: {
        width: 85,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#E2E8F0",
        marginTop: 10,
    },

    bedSkeletonDate: {
        width: 110,
        height: 13,
        borderRadius: 7,
        backgroundColor: "#E2E8F0",
        marginTop: 8,
    },

    bedSkeletonRight: {
        position: "absolute",
        right: 72,
        top: 60,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#E2E8F0",
    },

    bedSkeleton: {
        width: "100%",
        height: 92,
        borderRadius: 16,
        backgroundColor: "#E2E8F0",
    },

    bedCard: {
        position: "relative",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    bedNumber: {
        fontSize: 17,
        fontWeight: "700",
        color: "#071426",
    },

    bedInfoRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    bedIconBox: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },

    bedIconNumber: {
        fontSize: 11,
        fontWeight: "800",
        color: "#0F172A",
        marginBottom: 1,
    },

    bedTextContainer: {
        flex: 1,
    },

    tenantName: {
        marginTop: 4,
        fontSize: 17,
        fontWeight: "700",
        color: "#0F172A",
    },

    rent: {
        marginTop: 6,
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
    },

    availableBedContent: {
        padding: 14,
        backgroundColor: "#F0FDF4",
    },

    availableBedHeader: {
        flexDirection: "row",
        alignItems: "center",
    },

    statusRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    availableBadge: {
        backgroundColor: "#E6F2FF",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },

    availableBadgeText: {
        color: "#1769AA",
        fontSize: 12,
        fontWeight: "600",
    },
    
    availableIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: "#DCFCE7",
        justifyContent: "center",
        alignItems: "center",
    },

    availableTextContainer: {
        flex: 1,
        marginLeft: 10,
    },

    availableTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#166534",
    },

    availableSubtitle: {
        marginTop: 2,
        fontSize: 12,
        color: "#64748B",
    },

    addTenantButton: {
        marginTop: 12,
        alignSelf: "center",
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#DCFCE7",
        borderWidth: 1,
        borderColor: "#86EFAC",
        alignItems: "center",
        justifyContent: "center",
    },

    addTenantButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#15803D",
    },

    menuButton: {
        position: "absolute",
        top: 4,
        right: 2,
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },

    callButton: {
        position: "absolute",
        bottom: 3,
        right: 75,
        width: 30,
        height: 30,
        borderRadius: 15,
        
        alignItems: "center",
        justifyContent: "center",
    },

    joiningDate: {
        position: "absolute",
        top: -7,
        right: 15,
        fontSize: 11,
        color: "#64748B",
    },

    menuDots: {
        fontSize: 20,
        color: "#64748B",
    },

    status: {
        marginTop: 8,
        fontSize: 14,
        color: "#64748B",
    },

    maintenanceIndicator: {
        position: "absolute",
        right: 16,
        bottom: 12,
    },

    maintenanceText: {
        fontSize: 14,
    },

    modalContainer: {
        flex: 1,
    },

    modalOverlay: {
        flex: 1,
    },

    paymentStatusContainer: {
        alignSelf: "flex-end",
        marginTop: 6,
        marginRight: 5,
        marginBottom: 5,
    },

    paymentStatusRow: {
        position: "absolute",
        right: 5,
        bottom: 5,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,

        backgroundColor: "#e1fdeb",
        paddingVertical: 3.5,
        paddingLeft: 10,
        paddingRight: 5,
        borderRadius: 20, 
    },

    paidBadgeText: {
        color: "#15803D",
        fontSize: 12,
        fontWeight: "600",
    },

    paidCheckCircle: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: "#148e41",
        alignItems: "center",
        justifyContent: "center",
    },

    unpaidBadge: {
        position: "absolute",
        right: 7,
        bottom: 7,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        backgroundColor: "#FEE2E2",
        paddingVertical: 3.5,
        paddingLeft: 10,
        paddingRight: 5,
        borderRadius: 20,
    },

    unpaidBadgeText: {
        color: "#B91C1C",
        fontSize: 12,
        fontWeight: "600",
    },

    unpaidCountCircle: {
        minWidth: 15,
        height: 15,
        paddingHorizontal: 4,
        borderRadius: 7.5,
        backgroundColor: "#DC2626",
        alignItems: "center",
        justifyContent: "center",
    },

    unpaidCountText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "700",
    },


    // Main floating menu container.
    actionMenu: {
        position: "absolute",
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 0,
        borderWidth: 1,
        borderColor: "#E2E8F0",

        // Android shadow.
        elevation: 8,

        // iOS shadow.
        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,

        overflow: "hidden",
    },

    // Menu option text.
    actionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#142251",
    },

    // Individual options: no boxes or borders.
    actionItem: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        backgroundColor: "#FFFFFF",
        borderWidth: 0,
        borderRadius: 0,
        marginVertical: 0,
    },


    tenantDetailsCard: {
        marginTop: 6,
        marginBottom: 25,

        borderRadius: 18,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        overflow: "hidden",

        elevation: 3,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },

    tenantPremiumHeader: {
        backgroundColor: "#0a2755",
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
    },

    tenantAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },

    tenantAvatarText: {
        fontSize: 16,
        fontWeight: "800",
        color: "#174EA6",
    },

    tenantHeaderInfo: {
        flex: 1,
        marginLeft: 12,
    },

    tenantHeaderName: {
        fontSize: 17,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    tenantHeaderRole: {
        marginTop: 2,
        fontSize: 13,
        color: "#DBEAFE",
    },

    occupiedBadge: {
        backgroundColor: "#DCFCE7",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
    },

    occupiedBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#15803D",
    },

    tenantInfoArea: {
        padding: 16,
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 12,
    },

    sectionHeaderText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: "800",
        color: "#1E40AF",
    },

    allocationHeaderText: {
        color: "#15803D",
    },

    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },

    detailLabel: {
        marginLeft: 10,
        width: 82,
        fontSize: 13,
        fontWeight: "600",
        color: "#64748B",
    },

    detailValue: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: "#0F172A",
        textAlign: "right",
    },

    infoDivider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 6,
        marginBottom: 14,
    },

    allocationGrid: {
        flexDirection: "row",
        gap: 8,
    },

    allocationItem: {
        flex: 1,
        minHeight: 92,
        padding: 10,
        borderRadius: 12,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    informationColumns: {
        flexDirection: "row",
        padding: 12,
    },

    tenantColumn: {
        flex: 1,
        paddingRight: 10,
    },

    allocationColumn: {
        flex: 1,
        paddingLeft: 10,
    },

    columnDivider: {
        width: 1,
        backgroundColor: "#E2E8F0",
    },

    columnHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 10,
    },

    columnHeaderText: {
        marginLeft: 5,
        fontSize: 11,
        fontWeight: "800",
        color: "#1E40AF",
    },

    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 11,
    },

    infoLabel: {
        marginLeft: 6,
        fontSize: 11,
        fontWeight: "600",
        color: "#64748B",
    },

    infoValue: {
        flex: 1,
        marginLeft: 6,
        fontSize: 11,
        fontWeight: "600",
        color: "#0F172A",
    },

    allocationInfoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 13,
    },

    allocationTextContainer: {
        marginLeft: 7,
        flex: 1,
    },

    allocationLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: "#64748B",
    },

    allocationValue: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: "800",
        color: "#0F172A",
    },

    successMessage: {
        position: "absolute",
        bottom: 30,
        alignSelf: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        zIndex: 100,
        elevation: 6,
    },

    successMessageText: {
        color: "#166534",
        fontSize: 13,
        fontWeight: "600",
    },

    removeModalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },

    removeModalBox: {
        width: "85%",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",

        elevation: 10,

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },

    removeModalTitle: {
        fontSize: 19,
        fontWeight: "700",
        color: "#071426",
        marginBottom: 8,
    },

    removeModalMessage: {
        fontSize: 14,
        color: "#64748B",
        lineHeight: 20,
        marginBottom: 20,
    },

    removeModalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },

    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    cancelButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
    },

    removeButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
        backgroundColor: "#DC2626",
        justifyContent: "center",
        alignItems: "center",
        minWidth: 80,
    },

    removeButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    addTenantModalContainer: {
        flex: 1,
        justifyContent: "flex-end",
    },

    addTenantOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
    },

    addTenantSheet: {
        height: "78%",
        backgroundColor: "#F8FAFC",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 10,
    },

    addTenantHandle: {
        width: 42,
        height: 4,
        borderRadius: 10,
        backgroundColor: "#CBD5E1",
        alignSelf: "center",
        marginBottom: 16,
    },

    addTenantBedNumber: {
        fontSize: 18,
        fontWeight: "700",
        color: "#071426",
        textAlign: "center",
        marginBottom: 10,
    },

    addTenantLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
        marginTop: 12,
    },

    addTenantInput: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#FFFFFF",
        fontSize: 15,
        color: "#0F172A",
        minHeight: 44,
    },

    addTenantInputText: {
        fontSize: 15,
        color: "#0F172A",
    },

    addTenantRow: {
        flexDirection: "row",
        gap: 12,
    },

    addTenantHalfField: {
        flex: 1,
    },

    addTenantSaveButton: {
        marginTop: 20,
        marginBottom: 20,
        backgroundColor: "#0F172A",
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: "center",
    },

    addTenantSaveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },

    addTenantInputWrapper: {
        position: "relative",
    },

    addTenantInputWithError: {
        paddingBottom: 24,
    },

    addTenantErrorInside: {
        position: "absolute",
        left: 12,
        bottom: 7,
        fontSize: 10,
        color: "#DC2626",
    },

    addTenantApiError: {
        marginTop: 12,
        fontSize: 12,
        color: "#DC2626",
        textAlign: "center",
    },

    requiredStar: {
        color: "#DC2626",
        fontWeight: "700",
    },

    deleteBedError: {
        position: "absolute",
        bottom: 30,
        alignSelf: "center",

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ff4d4f",
        borderRadius: 8,

        paddingVertical: 8,
        paddingHorizontal: 14,

        zIndex: 999,
        elevation: 5,
    },

    deleteBedErrorText: {
        color: "#ff4d4f",
        fontSize: 14,
        marginLeft: 7,
    },

    floatingAddBedButton: {
        position: "absolute",
        right: 20,
        bottom: 25,

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#0b2a52",

        paddingVertical: 12,
        paddingHorizontal: 18,

        borderRadius: 28,

        elevation: 6,

        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.25,
            shadowRadius: 5,
        },

    floatingAddBedButtonDisabled: {
        opacity: 0.6,
    },

    floatingAddBedPlus: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "500",
        marginRight: 6,
    },

    floatingAddBedText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },

    

    // Compact floating Move Tenant banner
    moveTenantBanner: {
        position: "absolute",
        top: 6,
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

    
    // ================================================
    // Vacating / Cancel Vacating Popup
    // ================================================

    // Dark overlay behind the popup.
    vacatingModalContainer: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.48)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 10
    },


    // Compact popup card with less empty space.
    vacatingModalBox: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        paddingHorizontal: 15,
        paddingTop: 5,
        paddingBottom: 12,
        shadowColor: "#000000",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.16,
        shadowRadius: 18,
        elevation: 10,
    },

    // Top row with a divider underneath the X button and switch.
    vacatingModalTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",

        paddingBottom: 6,
        marginBottom: 10,

        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#b9cce5",
    },

    // Compact X button.
    vacatingCloseButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },

    // Compact switch track.
    vacatingSwitchTrack: {
        width: 46,
        height: 26,
        borderRadius: 13,
        justifyContent: "center",
        overflow: "hidden",
    },

    // White switch thumb.
    vacatingSwitchThumb: {
        position: "absolute",
        top: 3,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        elevation: 2,
    },

    // Container for the main message and supporting text.
    vacatingMessageContainer: {
        marginTop: 2,
    },

    // Main message: readable, with comfortable line spacing.
    vacatingModalMessageStrong: {
        fontSize: 14,
        lineHeight: 22,
        letterSpacing: 0.15,
        color: "#334155",
        fontWeight: "500",
    },

    // Emphasize the tenant's name for easier scanning.
    vacatingTenantName: {
        fontWeight: "700",
        color: "#1c253c",
    },

    // Separate the manual-rent guidance from the main message.
    vacatingManualHintRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: 10,
    },


    // Supporting message displayed beneath the main message.
    vacatingModalMessageHint: {
        marginTop: 8,
        fontSize: 12,
        lineHeight: 18,
        letterSpacing: 0.15,
        color: "#64748B",
        fontWeight: "500",
    },

    // Main popup message.
    vacatingModalMessage: {
        fontSize: 15,
        lineHeight: 23,
        color: "#334155",
        fontWeight: "400",
    },

    // Make the important rent date stand out.
    vacatingModalDate: {
        fontWeight: "800",
        color: "#040f28",
    },


    // Animated container for the OK button.
    vacatingOkContainer: {
        alignSelf: "flex-end",
        marginTop: 8,
        height: 44,
        justifyContent: "center",
    },

    // Blue confirmation button.
    vacatingOkButton: {
        minWidth: 88,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#0a2255",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22,
    },

    // OK button label.
    vacatingOkButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },

    
    vacatingIconContainer: {
        // Position the icon immediately left of the existing call button.
        position: "absolute",
        bottom: 3,
        right: 107,
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
    },
  

});