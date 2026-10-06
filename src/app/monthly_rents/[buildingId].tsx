import { collectRent, getDueMonthlyRentsByBuilding, } from "@/services/monthlyRent";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DueRentPage() {

    const { buildingId, buildingName } = useLocalSearchParams();

    const [dueRents, setDueRents] = useState<any[]>([]);
    const [collectModalVisible, setCollectModalVisible] = useState(false);
    const [selectedRent, setSelectedRent] = useState<any>(null);
    const [collectError, setCollectError] = useState("");
    const handleCollect = (item: any) => {
        setSelectedRent(item);
        setCollectAmount("");
        setCollectError("");
        setCollectModalVisible(true);
    };
    const [collectAmount, setCollectAmount] = useState(""); 
    const [collectSuccess, setCollectSuccess] = useState("");
    const [collectLoading, setCollectLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"newest" | "oldest">("newest");
    const [searchText, setSearchText] = useState("");
    // 45° shimmer animation for new rent badges
    const shimmerAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {

        const fetchDueRents = async () => {

            try {

                const data = await getDueMonthlyRentsByBuilding(
                    Number(buildingId)
                );

                setDueRents(data);

            } catch (error) {

                console.log("Failed to fetch due rents:", error);

            }
        };

        fetchDueRents();

    }, [buildingId]);

    //  call functionality service
    const handleCall = async (phone: string) => {
        try {
            await Linking.openURL(`tel:${phone}`);
        } catch (error) {
            console.log("Failed to open dialer:", error);
        }
    };

    // whatsapp functionality service
    const handleWhatsApp = async (item: any) => {
        const month = new Date(item.due_date).toLocaleDateString(
            "en-US",
            {
                month: "long",
                year: "numeric",
            }
        );

        const remaining = Number(item.remaining_amount);
        const rent = Number(item.rent_amount);

        let message = "";

        if (Number(item.paid_amount) === 0) {
            message =
                `Hello ${item.tenant_name},\n\n` +
                `This is to inform you that your PG rent of ₹${rent.toLocaleString("en-IN")} ` +
                `for ${month} is pending.\n\n` +
                `Kindly pay the pending amount at your earliest convenience.\n\n` +
                `Thank you for your cooperation.\n` +
                `${buildingName}`;
        } else {
            message =
                `Hello ${item.tenant_name},\n\n` +
                `This is to inform you that your PG rent of ₹${rent.toLocaleString("en-IN")} ` +
                `for ${month} has been partially paid.\n\n` +
                `Amount paid: ₹${Number(item.paid_amount).toLocaleString("en-IN")}\n` +
                `Remaining amount: ₹${remaining.toLocaleString("en-IN")}\n\n` +
                `Kindly pay the remaining amount at your earliest convenience.\n\n` +
                `Thank you for your cooperation.\n` +
                `${buildingName}`;
        }

        const phone = item.phone.replace(/\D/g, "");

        const whatsappUrl =
            `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

        try {
            await Linking.openURL(whatsappUrl);
        } catch (error) {
            console.log("Failed to open WhatsApp:", error);
        }
    };

    // collect rent amount erroe validation 
    const validateCollectAmount = async () => {

        if (!collectAmount.trim()) {
            setCollectError("Please enter collection amount.");
            return;
        }

        const amount = Number(collectAmount);
        const remaining = Number(selectedRent.remaining_amount);

        if (isNaN(amount) || amount <= 0) {
            setCollectError("Enter a valid amount.");
            return;
        }

        if (amount > remaining) {
            setCollectError(
                `Amount cannot be greater than ₹${remaining.toLocaleString("en-IN")}.`
            );
            return;
        }

        setCollectError("");
        setCollectLoading(true);

        try {
            
            const result = await collectRent(
                selectedRent.monthly_rent_id,
                amount
            );


            // refresh the page after collect rent 
            const updatedData = await getDueMonthlyRentsByBuilding(
                Number(buildingId)
            );
            setDueRents(updatedData);

            // invisble after collect rent 
            setCollectModalVisible(false);

            setCollectSuccess("Rent collected successfully.");
            setTimeout(() => {
                setCollectSuccess("");
            }, 2000);
        }
        catch (error) {
            console.log("Failed to collect rent:", error);

            setCollectError(
                "Failed to collect rent. Please try again."
            );

            return;
        }
        finally {
            setCollectLoading(false);
        }

    };

    // 45° premium shimmer for today's and yesterday's rent badges
    useEffect(() => {
        if (activeTab !== "newest") {
            return;
        }

        const animation = Animated.loop(
            Animated.sequence([
                // Short pause
                Animated.delay(700),

                // Slow diagonal shine
                Animated.timing(shimmerAnimation, {
                    toValue: 1,
                    duration: 1100,
                    useNativeDriver: true,
                }),

                // Reset instantly
                Animated.timing(shimmerAnimation, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        return () => {
            animation.stop();
            shimmerAnimation.setValue(0);
        };
    }, [activeTab]);


    // =========================
    // Rent age filter
    // =========================

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Newest = today + previous 4 days
    const newestRents = dueRents
        .filter((item) => {
            const dueDate = new Date(item.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const daysOld = Math.floor(
                (today.getTime() - dueDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return daysOld >= 0 && daysOld <= 4;
        })
        .sort(
            (a, b) =>
                new Date(b.due_date).getTime() -
                new Date(a.due_date).getTime()
        );

        
    // Oldest = everything older than 5 days
    const oldestRents = dueRents
        .filter((item) => {
            const dueDate = new Date(item.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const daysOld = Math.floor(
                (today.getTime() - dueDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return daysOld >= 5;
        })
        .sort(
            (a, b) =>
                new Date(b.due_date).getTime() -
                new Date(a.due_date).getTime()
        );


    // Today and yesterday are considered new rents
    const isNewRent = (dueDateValue: string) => {
        const dueDate = new Date(dueDateValue);
        dueDate.setHours(0, 0, 0, 0);

        const daysOld = Math.floor(
            (today.getTime() - dueDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return daysOld <= 1;
    };


    // =========================
    // Pending rent search filter
    // =========================

    const search = searchText.trim().toLowerCase();

    const filteredRents = (
        activeTab === "newest" ? newestRents : oldestRents
    ).filter((item) => {
        if (!search) {
            return true;
        }

        const tenantName = item.tenant_name?.toLowerCase() || "";
        const roomNumber = item.room_number?.toString().toLowerCase() || "";

        // Tenant name → search can match anywhere in the name
        const tenantMatches = tenantName.includes(search);

        // Room number → search must match from the beginning
        const roomMatches = roomNumber.startsWith(search);

        return tenantMatches || roomMatches;
    });



    // UI
    return (
        <SafeAreaView edges={["top"]} style={styles.container}>

            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>
                    Rent Collection
                </Text>
            </View>

            {/* Pending rent search */}
            <View style={styles.searchContainer}>
                <FontAwesome
                    name="search"
                    size={18}
                    color="#8FA9C9"
                />

                <TextInput
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search name or room"
                    placeholderTextColor="#8FA9C9"
                    autoCapitalize="none"
                />

                {searchText.length > 0 && (
                    <Pressable onPress={() => setSearchText("")}>
                        <FontAwesome
                            name="close"
                            size={16}
                            color="#8FA9C9"
                        />
                    </Pressable>
                )}
            </View>

            {collectSuccess !== "" && (
                <View style={styles.successMessage}>
                    <Text style={styles.successMessageText}>
                        ✓ {collectSuccess}
                    </Text>
                </View>
            )}


            {/* Rent age filter */}
            <View style={styles.tabContainer}>

                <Pressable
                    style={[
                        styles.tab,
                        activeTab === "newest" && styles.activeTab,
                    ]}
                    onPress={() => setActiveTab("newest")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === "newest" && styles.activeTabText,
                        ]}
                    >
                        NEWEST
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.tab,
                        activeTab === "oldest" && styles.activeTab,
                    ]}
                    onPress={() => setActiveTab("oldest")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === "oldest" && styles.activeTabText,
                        ]}
                    >
                        OLDEST
                    </Text>
                </Pressable>

            </View>

            <FlatList
                data={filteredRents}
                keyExtractor={(item) =>
                    item.monthly_rent_id.toString()
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: 20,
                }}
                renderItem={({ item }) => (
                    <View style={styles.dueRentCard}>

                        {/* Header */}
                        <View style={styles.cardHeader}>

                            <Text style={styles.tenantName}>
                                {item.tenant_name}
                            </Text>

                            {activeTab === "newest" && isNewRent(item.due_date) ? (
                                <View style={styles.statusWrapper}>

                                    <Text
                                        style={[
                                            styles.status,
                                            item.status === "DUE"
                                                ? styles.dueStatus
                                                : styles.partialStatus,
                                        ]}
                                    >
                                        {item.status}
                                    </Text>

                                    {/* 45° diagonal light sweep */}
                                    <Animated.View
                                        pointerEvents="none"
                                        style={[
                                            styles.shimmer,
                                            {
                                                transform: [
                                                    {
                                                        translateX: shimmerAnimation.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [-35, 55],
                                                        }),
                                                    },
                                                    {
                                                        rotate: "45deg",
                                                    },
                                                ],
                                            },
                                        ]}
                                    />

                                </View>
                            ) : (
                                <Text
                                    style={[
                                        styles.status,
                                        item.status === "DUE"
                                            ? styles.dueStatus
                                            : styles.partialStatus,
                                    ]}
                                >
                                    {item.status}
                                </Text>
                            )}

                        </View>

                        {/* Room + Date */}
                        <View style={styles.roomDateRow}>

                            <Text style={styles.roomNumber}>
                                Room {item.room_number}
                            </Text>

                            <Text style={styles.dueDate}>
                                {new Date(item.due_date).toLocaleDateString(
                                    "en-US",
                                    {
                                        month: "short",
                                        day: "2-digit",
                                        year: "numeric",
                                    }
                                )}
                            </Text>

                        </View>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Rent */}
                        <Text style={styles.rentAmount}>
                            ₹{Number(item.rent_amount).toLocaleString("en-IN")}
                        </Text>

                        {/* Partial payment */}
                        {Number(item.paid_amount) > 0 && (
                            <>
                                <View style={styles.paymentRow}>
                                    <Text style={styles.paymentLabel}>
                                        Paid
                                    </Text>

                                    <Text style={styles.paymentAmount}>
                                        ₹{Number(item.paid_amount).toLocaleString("en-IN")}
                                    </Text>
                                </View>

                                <View style={styles.paymentRow}>
                                    <Text style={styles.paymentLabel}>
                                        Remain due
                                    </Text>

                                    <Text style={styles.dueAmount}>
                                        ₹{Number(item.remaining_amount).toLocaleString("en-IN")}
                                    </Text>
                                </View>
                            </>
                        )}

                        {/* Actions - we'll make these functional later */}
                        <View style={styles.actionRow}>

                            <Pressable
                                style={styles.callButton}
                                onPress={() => handleCall(item.phone)}
                            >
                                <FontAwesome
                                    name="phone"
                                    size={16}
                                    color="#8FC2FF"
                                />
                            </Pressable>

                            <Pressable
                                style={styles.whatsappButton}
                                onPress={() => handleWhatsApp(item)}
                            >
                                <FontAwesome
                                    name="whatsapp"
                                    size={18}
                                    color="#43D99A"
                                />

                                <Text style={styles.whatsappButtonText}>
                                    WhatsApp
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.collectButton}
                                
                                onPress={() => handleCollect(item)}
                            >
                                <Text style={styles.collectButtonText}>
                                    Collect Now
                                </Text>
                            </Pressable>

                        </View>

                    </View>
                )}
            />

            {collectSuccess !== "" && (
                <View style={styles.successMessage}>
                    <Text style={styles.successMessageText}>
                        ✓ {collectSuccess}
                    </Text>
                </View>
            )}

            {/* Collect Rent Modal */}
            <Modal
                visible={collectModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCollectModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <ScrollView
                        style={styles.modalScroll}
                        contentContainerStyle={styles.modalScrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >

                        <View style={styles.collectModal}>

                            <Text style={styles.modalTitle}>
                                Collect Rent
                            </Text>

                            {selectedRent && (
                                <>
                                    <Text style={styles.modalTenantName}>
                                        {selectedRent.tenant_name}
                                    </Text>

                                    <Text style={styles.modalRoom}>
                                        Room {selectedRent.room_number}
                                    </Text>

                                    <Text style={styles.modalRemainingLabel}>
                                        Remaining Amount
                                    </Text>

                                    <Text style={styles.modalRemainingAmount}>
                                        ₹{Number(
                                            selectedRent.remaining_amount
                                        ).toLocaleString("en-IN")}
                                    </Text>

                                    <Text style={styles.amountInputLabel}>
                                        Collection Amount
                                    </Text>

                                    <TextInput
                                        style={styles.amountInput}
                                        value={collectAmount}
                                        onChangeText={setCollectAmount}
                                        placeholder="Enter amount"
                                        keyboardType="numeric"
                                    />
                                </>
                            )}


                            {/* collect rent error show */}
                            {collectError !== "" && (
                                <Text style={styles.collectError}>
                                    {collectError}
                                </Text>
                            )}

                            {/* close and collect rent button */}
                            <View style={styles.modalActions}>

                                <Pressable
                                    style={styles.closeButton}
                                    onPress={() => setCollectModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>
                                        Close
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={styles.confirmCollectButton}
                                    onPress={() => {
                                        validateCollectAmount();
                                    }}
                                    disabled={collectLoading}
                                >
                                    {collectLoading ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#FFFFFF"
                                        />
                                    ) : (
                                        <Text style={styles.confirmCollectButtonText}>
                                            Collect
                                        </Text>
                                    )}
                                </Pressable>

                            </View>

                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

            </Modal>

        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    // =========================
    // Page
    // =========================

    container: {
        flex: 1,
        padding: 12,
        backgroundColor: "#F4F7FB",
    },

    title: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 12,
    },


    // =========================
    // heading
    // =========================
    
    pageHeader: {
        marginBottom: 16,
    },

    pageTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: "#031529",
        letterSpacing: -0.4,
    },

    
    // =========================
    // Pending rent search
    // =========================

    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        height: 50,
        paddingHorizontal: 18,
        marginBottom: 14,
        borderRadius: 16,
        backgroundColor: "#0F213A",
    },

    searchInput: {
        flex: 1,
        marginLeft: 14,
        fontSize: 17,
        color: "#FFFFFF",
    },


    // =========================
    // success message
    // =========================

    successMessage: {
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: "#DCFCE7",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },

    successMessageText: {
        color: "#166534",
        fontSize: 14,
        fontWeight: "600",
    },


    // =========================
    // Rent Tabs
    // =========================

    tabContainer: {
        flexDirection: "row",
        marginBottom: 14,
        backgroundColor: "#E8EEF6",
        borderRadius: 10,
        padding: 3,
    },

    tab: {
        flex: 1,
        paddingVertical: 9,
        alignItems: "center",
        borderRadius: 8,
    },

    activeTab: {
        backgroundColor: "#FFFFFF",
    },

    tabText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748B",
    },

    activeTabText: {
        color: "#1677E8",
    },


    // =========================
    // Due Rent Card
    // =========================

    dueRentCard: {
        padding: 12,
        marginBottom: 10,
        borderRadius: 16,
        backgroundColor: "#031529",
    },

    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    tenantName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    status: {
        fontSize: 12,
        fontWeight: "700",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },

    dueStatus: {
        backgroundColor: "#FEE2E2",
        color: "#B91C1C",
    },

    partialStatus: {
        backgroundColor: "#FEF3C7",
        color: "#B45309",
    },

    statusWrapper: {
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
    },

    shimmer: {
        position: "absolute",
        top: -15,
        left: -20,
        width: 5,
        height: 60,
        backgroundColor: "rgba(255,255,255,0.55)",
    },


    // =========================
    // Room + Date
    // =========================

    roomDateRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 4,
    },

    roomNumber: {
        fontSize: 14,
        color: "#B8C9E3",
    },

    dueDate: {
        fontSize: 14,
        color: "#ffffff",
    },


    // =========================
    // Rent
    // =========================

    divider: {
        height: 1,
        backgroundColor: "#515356",
        marginTop: 8,
        marginBottom: 8,
    },

    rentAmount: {
        fontSize: 22,
        fontWeight: "700",
        color: "#FFFFFF",
    },


    // =========================
    // Partial Payment
    // =========================

    paymentRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 2,
    },

    paymentLabel: {
        fontSize: 13,
        color: "#B8C9E3",
    },

    paymentAmount: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    dueAmount: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FF6B6B",
    },


    // =========================
    // Card Action Buttons
    // =========================

    actionRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 10,
    },

    callButton: {
        flex: 0.8,
        height: 38,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#2878D7",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: 6,
    },

    callButtonText: {
        color: "#8FC2FF",
        fontSize: 13,
        fontWeight: "600",
    },

    whatsappButton: {
        flex: 1,
        height: 38,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: "#19A974",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: 6,
    },

    whatsappButtonText: {
        color: "#43D99A",
        fontSize: 13,
        fontWeight: "600",
    },

    collectButton: {
        flex: 1.15,
        height: 38,
        borderRadius: 9,
        backgroundColor: "#1677E8",
        justifyContent: "center",
        alignItems: "center",
    },

    collectButtonText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "700",
    },


    // =========================
    // Collect Rent Modal
    // =========================

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },

    modalScroll: {
        flexGrow: 0,
        maxHeight: "100%",
    },

    modalScrollContent: {
        flexGrow: 1,
        justifyContent: "flex-end",
    },

    collectModal: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        padding: 20,
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
    },

    modalTenantName: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: "600",
    },

    modalRoom: {
        marginTop: 4,
        fontSize: 14,
        color: "#64748B",
    },

    modalRemainingLabel: {
        marginTop: 20,
        fontSize: 13,
        color: "#64748B",
    },

    modalRemainingAmount: {
        marginTop: 4,
        fontSize: 26,
        fontWeight: "700",
    },


    // =========================
    // Collection Amount Input
    // =========================

    amountInputLabel: {
        marginTop: 18,
        fontSize: 14,
        fontWeight: "600",
    },

    amountInput: {
        marginTop: 8,
        height: 46,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 16,
    },

    collectError: {
        marginTop: 6,
        fontSize: 13,
        color: "#DC2626",
    },


    // =========================
    // Modal Buttons
    // =========================

    modalActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 20,
    },

    closeButton: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        backgroundColor: "#E2E8F0",
        justifyContent: "center",
        alignItems: "center",
    },

    closeButtonText: {
        fontSize: 15,
        fontWeight: "600",
    },

    confirmCollectButton: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        backgroundColor: "#1677E8",
        justifyContent: "center",
        alignItems: "center",
    },

    confirmCollectButtonText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },

});