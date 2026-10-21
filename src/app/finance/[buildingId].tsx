import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BuildingPaymentHistory, getBuildingPaymentHistory, PaymentTransaction } from "../../services/finance";

// 2. Avatar colors and helper function
const avatarColors = [
    { background: "#DBEAFE", text: "#1D4ED8" },
    { background: "#D1FAE5", text: "#047857" },
    { background: "#FCE7F3", text: "#BE185D" },
    { background: "#FEF3C7", text: "#92400E" },
    { background: "#EDE9FE", text: "#6D28D9" },
    { background: "#FFEDD5", text: "#C2410C" },
    { background: "#CFFAFE", text: "#0E7490" },
];

const getAvatarColor = (name: string) => {
    const index = [...name.toLowerCase()].reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0
    ) % avatarColors.length;

    return avatarColors[index];
};


// Displays the current month's rent collection history for one building.
export default function FinanceScreen() {
    const { buildingId, buildingName } = useLocalSearchParams<{
    buildingId: string;
    buildingName?: string;
    }>();

    const [history, setHistory] = useState<BuildingPaymentHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch the latest collection history whenever this screen comes into focus.
    const loadPaymentHistory = useCallback(async () => {
        if (!buildingId) {
            setError("Building ID is missing.");
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);

            const result = await getBuildingPaymentHistory(Number(buildingId));
            setHistory(result);
        } catch (err) {
            // Do not display the raw error returned by Android or fetch.
            setError(
                "Unable to load payment history. Please check your internet connection and try again."
            );
        } finally {
            setLoading(false);
        }

    }, [buildingId]);

    useFocusEffect(
        useCallback(() => {
            loadPaymentHistory();
        }, [loadPaymentHistory])
    );

    // Format amounts using Indian currency notation.
    const formatAmount = (amount: number) =>
        `₹${amount.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
        })}`;


    // Format payment dates using Today, Yesterday, or the actual date.
    // Keep the payment time visible for every transaction.
    const formatPaymentDate = (date: string) => {
        const paymentDate = new Date(date);
        const now = new Date();

        // Compare calendar dates in the phone's local time zone.
        const paymentDay = new Date(
            paymentDate.getFullYear(),
            paymentDate.getMonth(),
            paymentDate.getDate()
        );

        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const dateLabel =
            paymentDay.getTime() === today.getTime()
                ? "Today"
                : paymentDay.getTime() === yesterday.getTime()
                    ? "Yesterday"
                    : paymentDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                    });

        const timeLabel = paymentDate.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });

        return `${dateLabel} · ${timeLabel}`;
    };

    
    // Filter payments by tenant name without changing the original API data.
    const filteredTransactions = useMemo(() => {
        const transactions = history?.transactions ?? [];
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return transactions;
        }

        return transactions.filter((item) =>
            item.tenant_name.toLowerCase().includes(query)
        );
    }, [history, searchQuery]);


    // Render one individual payment, including partial payments.
    const renderTransaction = ({ item }: { item: PaymentTransaction }) => (
        <View style={styles.transactionCard}>
            <View style={[
                styles.paymentIcon,
                { backgroundColor: getAvatarColor(item.tenant_name).background }
            ]}>
                <Text style={[
                    styles.tenantInitial,
                    { color: getAvatarColor(item.tenant_name).text }
                ]}>
                    {item.tenant_name.trim().charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={styles.transactionDetails}>
                <Text style={styles.tenantName} numberOfLines={1}>
                    {item.tenant_name}
                </Text>
                <Text style={styles.paymentDate}>
                    {formatPaymentDate(item.payment_date)}
                </Text>
                <View style={styles.moneyReceivedBadge}>
                    <Text style={styles.moneyIcon}>💵</Text>
                    <Text style={styles.moneyReceivedText}>
                        Money Received
                    </Text>
                </View>
            </View>

            <Text style={styles.paymentAmount}>
                +{formatAmount(item.amount)}
            </Text>
        </View>
    );

    return (
        <SafeAreaView
            edges={["top", "bottom"]}
            style={styles.container}
        >
            
            {/* Header with back navigation, page title, and search toggle. */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerIconButton}
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={27} color="#292929" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Payment History</Text>

                <TouchableOpacity
                    onPress={() => {
                        setIsSearchVisible((visible) => !visible);

                        // Clear the previous search when closing the search bar.
                        if (isSearchVisible) {
                            setSearchQuery("");
                        }
                    }}
                    style={styles.headerIconButton}
                    accessibilityLabel={isSearchVisible ? "Close search" : "Search payments"}
                >
                    <Ionicons
                        name={isSearchVisible ? "close" : "search"}
                        size={27}
                        color="#174A86"
                    />
                </TouchableOpacity>
            </View>

            {/* Show the search bar beneath the header when enabled. */}
            {isSearchVisible && (
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#64748B" />

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search tenant name..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />

                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={20} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>
            )}


            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.statusText}>
                        Loading collection history...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.centerContent}>
                    <Ionicons
                        name="alert-circle-outline"
                        size={40}
                        color="#DC2626"
                    />
                    <Text style={styles.errorText}>{error}</Text>
                    <Text style={styles.retryText} onPress={loadPaymentHistory}>
                        Tap here to retry
                    </Text>
                </View>
            ) : (
                <>
                    {/* Month and total collection summary, arranged horizontally. */}
                    <View style={styles.summaryCard}>
                        {/* Show the month and year on the left, e.g. October 2026. */}
                        <Text style={styles.summaryMonth}>
                            {history?.month
                                ? new Date(`${history.month}-01T12:00:00`).toLocaleDateString(
                                    "en-IN",
                                    {
                                        month: "long",
                                        year: "numeric",
                                    }
                                )
                                : ""}
                        </Text>

                        {/* Show the collection total and arrow on the right. */}
                        <View style={styles.summaryRight}>
                            <View style={styles.summaryTotalContainer}>
                                <Text style={styles.summaryLabel}>Total Collected</Text>
                                <Text style={styles.summaryAmount}>
                                    {formatAmount(history?.total_collected ?? 0)}
                                </Text>
                            </View>

                            <View style={styles.summaryArrow}>
                                <Ionicons
                                    name="chevron-forward"
                                    size={22}
                                    color="#2874B8"
                                />
                            </View>
                        </View>
                    </View>

                    <FlatList
                        data={filteredTransactions}
                        keyExtractor={(item) => String(item.payment_id)}
                        renderItem={renderTransaction}
                        contentContainerStyle={styles.listContent}
                        refreshing={loading}
                        onRefresh={loadPaymentHistory}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons
                                    name="receipt-outline"
                                    size={44}
                                    color="#94A3B8"
                                />
                                <Text style={styles.emptyTitle}>
                                    No collections yet
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    Payments collected this month will appear here.
                                </Text>
                            </View>
                        }
                    />
                </>
            )}
        </SafeAreaView>
    );
    }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f0f1",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 18,
        paddingVertical: 18,
        gap: 12,
    },
    
    headerIconButton: {
        width: 32,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },

    headerTextContainer: {
        flex: 1,
    },

    headerTitle: {
        flex: 1,
        fontSize: 22,
        fontWeight: "700",
        color: "#292929",
    },

    headerSubtitle: {
        fontSize: 13,
        color: "#CBD5E1",
        marginTop: 3,
    },

    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D8DDE3",
        gap: 10,
    },

    searchInput: {
        flex: 1,
        fontSize: 15,
        color: "#292929",
        paddingVertical: 0,
    },

    
    summaryCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#f0f2ee",
        paddingHorizontal: 16,
        paddingVertical: 6,
        minHeight: 54,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    summaryMonth: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
        color: "#292929",
    },
    summaryRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    summaryTotalContainer: {
        alignItems: "flex-end",
    },
    summaryLabel: {
        fontSize: 12,
        color: "#555555",
        marginBottom: 1,
    },
    summaryAmount: {
        fontSize: 18,
        fontWeight: "700",
        color: "#292929",
    },
    summaryArrow: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#D8EAFB",
        alignItems: "center",
        justifyContent: "center",
    },

    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        flexGrow: 1,
    },

    // Display each payment as a flat white row instead of a rounded card.
    transactionCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 0,
        marginBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },

    tenantInitial: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1D4ED8",
    },

    paymentIcon: {
        width: 48,
        height: 48,
        marginRight: 14,
        borderRadius: 24,
        backgroundColor: "#DCFCE7",
        alignItems: "center",
        justifyContent: "center",
    },

    transactionDetails: {
        flex: 1,
    },

    tenantName: {
        fontSize: 15,
        fontWeight: "800",
        color: "#1E293B",
        flexShrink: 1,
    },

    paymentDate: {
        fontSize: 13,
        fontWeight: "700",
        color: "#89909b",
        marginTop: 4,
    },
    moneyReceivedBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginTop: 5,
    },

    moneyReceivedText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#7c837e",
    },

    paymentAmount: {
        fontSize: 15,
        fontWeight: "700",
        color: "#15803D",
    },

    moneyIcon: {
        fontSize: 12,
        marginRight: 4,
    },

    centerContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },

    statusText: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 12,
    },

    errorText: {
        fontSize: 15,
        color: "#DC2626",
        textAlign: "center",
        marginTop: 12,
    },

    retryText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2563EB",
        marginTop: 14,
    },

    emptyContainer: {
        flex: 1,
        minHeight: 220,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },

    emptyTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#334155",
        marginTop: 12,
    },

    emptySubtitle: {
        fontSize: 13,
        color: "#64748B",
        textAlign: "center",
        marginTop: 6,
        lineHeight: 20,
    },

});

