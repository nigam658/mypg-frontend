import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
    getVacatingTenantsByBuilding,
    removeTenant,
    setTenantVacating,
    type VacatingTenant,
} from "../../services/tenant";

import {
    generateSelectedMissingRent,
    getMissingRentMonths,
    type MissingRentMonth,
} from "../../services/monthlyRent";

import { getEmptyBedsByBuildingId } from "../../services/bed";



// ==================================================
// 1. Premium color palette
// ==================================================
const COLORS = {
    bg: "#F1EEE6",
    card: "#FFFFFF",
    cardBorder: "#E6E1D5",
    ink: "#14261C",
    muted: "#4F6057",
    green: "#0F5132",
    greenSoft: "#E3F1E9",
    greenPanel: "#F2F8F4",
    greenPanelBorder: "#DCEBE2",
    amberBg: "#FFF9EC",
    amberBorder: "#E4C98A",
    amberText: "#7A4A00",
    redBg: "#FFF4F4",
    redBorder: "#F1CFCF",
    redText: "#A4262C",
};

// ==================================================
// 2. Vacating Tenants screen
// ==================================================
export default function VacatingTenantsScreen() {
    const { width: screenWidth } = useWindowDimensions();

    // Adapt spacing and text sizes to narrow phones.
    const isNarrowScreen = screenWidth < 380;
    
    const insets = useSafeAreaInsets();

    // Read the selected building ID from Expo Router.
    const { buildingId: buildingIdParam } =
        useLocalSearchParams<{ buildingId: string | string[] }>();

    const buildingId = Array.isArray(buildingIdParam)
        ? buildingIdParam[0]
        : buildingIdParam;

    // Controls which header option is active.
    const [activeView, setActiveView] = useState<"vacating" | "beds">("vacating");

    // Tenant list and screen states.
    const [tenants, setTenants] = useState<VacatingTenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removeTenantVisible, setRemoveTenantVisible] = useState(false);
    const [tenantToRemove, setTenantToRemove] = useState<VacatingTenant | null>(null);
    const [removingTenant, setRemovingTenant] = useState(false);
    const [removeTenantError, setRemoveTenantError] = useState("");

    const [tenantMenuVisible, setTenantMenuVisible] = useState(false);
    const tenantMenuButtonRefs = useRef<Record<number, View | null>>({});
    const [tenantMenuItem, setTenantMenuItem] =
        useState<VacatingTenant | null>(null);
    const tenantMenuAnimation = useRef(new Animated.Value(0)).current;
    const [tenantMenuPosition, setTenantMenuPosition] = useState({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });
    // Opens the floating tenant menu with a smooth fade and scale animation.
    const openTenantMenu = () => {
        tenantMenuAnimation.setValue(0);

        setTenantMenuVisible(true);

        Animated.spring(tenantMenuAnimation, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
            tension: 80,
        }).start();
    };
    // Closes the floating menu and runs an optional callback after closing.
    const closeTenantMenu = (callback?: () => void) => {
        Animated.timing(tenantMenuAnimation, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setTenantMenuVisible(false);
                callback?.();
            }
        });
    };


    const [cancelVacatingPopupVisible, setCancelVacatingPopupVisible] =
        useState(false);
    const [selectedVacatingTenant, setSelectedVacatingTenant] =
        useState<VacatingTenant | null>(null);

    // Tracks the popup switch's temporary state.
    // It starts ON because the selected tenant is currently vacating.
    const [pendingCancelVacating, setPendingCancelVacating] =
        useState(true);

    // Controls the animated switch thumb position.
    const cancelSwitchAnimation = useRef(new Animated.Value(1)).current;

    // Controls the animated OK button's visibility.
    const cancelOkAnimation = useRef(new Animated.Value(0)).current;
    
    // Stores eligible missing rent months for each tenant
    const [missingRentMonths, setMissingRentMonths] = useState<
        Record<number, MissingRentMonth[]>
    >({});

    // Stores the number of missing rent months for each tenant
    const [missingRentCounts, setMissingRentCounts] = useState<
        Record<number, number>
    >({});

    // Controls the Generate Rent popup
    const [generateRentPopupVisible, setGenerateRentPopupVisible] =
        useState(false);

    // Stores the tenant selected for rent generation
    const [selectedRentTenant, setSelectedRentTenant] =
        useState<VacatingTenant | null>(null);

    // Stores the selected billing month
    const [selectedBillingMonth, setSelectedBillingMonth] =
        useState<string | null>(null);

    // Tracks loading while fetching missing rent months
    const [rentPopupLoading, setRentPopupLoading] = useState(false);

    // Tracks rent generation progress
    const [generatingRent, setGeneratingRent] = useState(false);

    // Closes the popup without saving any changes.
    const closeCancelVacatingPopup = () => {
        setCancelVacatingPopupVisible(false);
        setSelectedVacatingTenant(null);
        setPendingCancelVacating(true);
    };

    // Toggle the Cancel Vacating switch ON and OFF smoothly.
    const handleCancelVacatingSwitchToggle = () => {
        const nextValue = !pendingCancelVacating;

        // Update the pending switch state.
        setPendingCancelVacating(nextValue);

        // Animate the switch and OK button together.
        Animated.parallel([
            Animated.timing(cancelSwitchAnimation, {
                toValue: nextValue ? 1 : 0,
                duration: 300, // Slower switch movement
                useNativeDriver: false,
            }),
            Animated.timing(cancelOkAnimation, {
                toValue: nextValue ? 0 : 1,
                duration: 250, // Smooth OK button transition
                useNativeDriver: false,
            }),
        ]).start();
    };


    // errrrrrooooooorrrrrrrrrr handle 
    // Stores the custom success or error message shown at the bottom.
    const [toast, setToast] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    // Stores the timer so a previous toast can be cleared before showing another.
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Displays a custom message and automatically hides it after 3 seconds.
    const showToast = (
        type: "success" | "error",
        message: string
    ) => {
        if (toastTimer.current) {
            clearTimeout(toastTimer.current);
        }

        setToast({ type, message });

        toastTimer.current = setTimeout(() => {
            setToast(null);
            toastTimer.current = null;
        }, 3000);
    };

    
    // Cancels Vacating and shows a custom result message.
    const handleConfirmCancelVacating = async () => {
        if (!selectedVacatingTenant) {
            showToast("error", "Please select a tenant.");
            closeCancelVacatingPopup();
            return;
        }

        try {
            // Ask the backend to cancel the tenant's Vacating status.
            await setTenantVacating(
                selectedVacatingTenant.tenant_id,
                false,
                null
            );

            // Remove the tenant only after the backend succeeds.
            setTenants((previousTenants) =>
                previousTenants.filter(
                    (tenant) =>
                        tenant.tenant_id !== selectedVacatingTenant.tenant_id
                )
            );

            // Close the popup and show success on the main page.
            closeCancelVacatingPopup();

            showToast(
                "success",
                "Vacating cancelled successfully."
            );
        } catch (error) {
            console.error("Failed to cancel Vacating status:", error);

            // Close the popup so the bottom error message is visible.
            closeCancelVacatingPopup();

            showToast(
                "error",
                error instanceof Error
                    ? error.message
                    : "Unable to cancel Vacating. Please try again."
            );
        }
    };



    // ==================================================
    // 3. Fetch vacating tenants and their missing rent months
    // ==================================================
    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadTenants = async () => {
                if (!buildingId) {
                    setError("Building ID is missing.");
                    setLoading(false);
                    return;
                }

                try {
                    setLoading(true);
                    setError("");

                    // Fetch the vacating tenants first
                    const response = await getVacatingTenantsByBuilding(
                        Number(buildingId)
                    );

                    if (!isActive) return;

                    // The backend already orders tenants by checkout date.
                    const tenantList = response.tenants ?? [];
                    setTenants(tenantList);

                    // Clear previous results before fetching fresh counts.
                    setMissingRentMonths({});
                    setMissingRentCounts({});

                    // Fetch missing rent months for every tenant.
                    const results = await Promise.all(
                        tenantList.map(async (tenant) => {
                            try {
                                const result = await getMissingRentMonths(
                                    tenant.tenant_id
                                );

                                return {
                                    tenantId: tenant.tenant_id,
                                    months: result.missing_months ?? [],
                                    count: result.missing_count ?? 0,
                                };
                            } catch (err) {
                                // Keep this tenant's result unavailable if its
                                // missing-rent request fails.
                                console.error(
                                    `Failed to load missing rent months for tenant ${tenant.tenant_id}:`,
                                    err
                                );

                                return null;
                            }
                        })
                    );

                    if (!isActive) return;

                    // Store only successful API results.
                    const monthsByTenant: Record<number, MissingRentMonth[]> = {};
                    const countsByTenant: Record<number, number> = {};

                    results.forEach((result) => {
                        if (result !== null) {
                            monthsByTenant[result.tenantId] = result.months;
                            countsByTenant[result.tenantId] = result.count;
                        }
                    });

                    setMissingRentMonths(monthsByTenant);
                    setMissingRentCounts(countsByTenant);
                } catch (err) {
                    console.error(
                        "Failed to load vacating tenants:",
                        err
                    );

                    if (isActive) {
                        setError(
                            "Unable to load vacating tenants. Please try again."
                        );
                    }
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }
            };

            loadTenants();

            // Prevent an old request from updating an inactive screen.
            return () => {
                isActive = false;
            };
        }, [buildingId])
    );


    
    // Opens Generate Rent and fetches the latest missing months
    const handleOpenGenerateRent = async (tenant: VacatingTenant) => {
        // Prevent opening another request while rent generation is running
        if (generatingRent) return;

        setSelectedRentTenant(tenant);
        setSelectedBillingMonth(null);
        setGenerateRentPopupVisible(true);
        setRentPopupLoading(true);

        try {
            // Fetch fresh data so the owner sees the latest eligible months
            const result = await getMissingRentMonths(tenant.tenant_id);

            // Update the missing months and count for this tenant
            setMissingRentMonths((previous) => ({
                ...previous,
                [tenant.tenant_id]: result.missing_months ?? [],
            }));

            setMissingRentCounts((previous) => ({
                ...previous,
                [tenant.tenant_id]: result.missing_count ?? 0,
            }));
        } catch (err) {
            console.error("Failed to fetch missing rent months:", err);

            setGenerateRentPopupVisible(false);
            setSelectedRentTenant(null);

            showToast(
                "error",
                err instanceof Error
                    ? err.message
                    : "Unable to load missing rent months."
            );
        } finally {
            setRentPopupLoading(false);
        }
    };


    // Generates rent for one selected billing month
    const handleGenerateSelectedRent = async () => {
        // Stop repeated taps or invalid submissions
        if (generatingRent || !selectedRentTenant || !selectedBillingMonth) {
            return;
        }

        // Disable further submissions immediately
        setGeneratingRent(true);

        try {
            // Generate exactly the selected month's rent
            await generateSelectedMissingRent(
                selectedRentTenant.tenant_id,
                selectedBillingMonth
            );

            const tenantId = selectedRentTenant.tenant_id;
            const generatedMonth = selectedBillingMonth;

            // Remove the generated month from the tenant's missing months
            setMissingRentMonths((previous) => ({
                ...previous,
                [tenantId]: (previous[tenantId] ?? []).filter(
                    (month) => month.billing_month !== generatedMonth
                ),
            }));

            // Decrease the missing-month count by one
            setMissingRentCounts((previous) => ({
                ...previous,
                [tenantId]: Math.max((previous[tenantId] ?? 1) - 1, 0),
            }));

            // Close the popup and clear the selection
            setGenerateRentPopupVisible(false);
            setSelectedRentTenant(null);
            setSelectedBillingMonth(null);

            showToast("success", "Rent generated successfully.");
        } catch (err) {
            console.error("Failed to generate selected rent:", err);

            showToast(
                "error",
                err instanceof Error
                    ? err.message
                    : "Unable to generate rent. Please try again."
            );
        } finally {
            setGeneratingRent(false);
        }
    };



    // ==================================================
    // 4. Date formatting and checkout countdown
    // ==================================================
    const formatCheckoutDate = (date: string | null) => {
        if (!date) {
            return "Not set";
        }

        const parsedDate = new Date(`${date}T00:00:00`);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Not set";
        }

        return parsedDate.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const getCountdownLabel = (date: string | null) => {
        if (!date) {
            return "No date";
        }

        const target = new Date(`${date}T00:00:00`);

        if (Number.isNaN(target.getTime())) {
            return "No date";
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);

        const days = Math.round(
            (target.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
        );

        if (days < 0) return "Overdate";
        if (days === 0) return "Today";
        if (days === 1) return "Tomorrow";

        return `${days}d left`;
    };

    const isOverdue = (date: string | null) =>
        getCountdownLabel(date) === "Overdate";

    // ==================================================
    // 5. Phone and placeholder action handlers
    // ==================================================
    const callTenant = (phone: string) => {
        Linking.openURL(`tel:${phone}`).catch(() => {
            Alert.alert(
                "Unable to call",
                "Your device could not open the phone dialer."
            );
        });
    };

    // These actions will be connected to the existing backend flows next.
    const showActionNotReady = (action: string) => {
        Alert.alert(
            action,
            "The layout is ready. We will connect this action next."
        );
    };

    // Opens the custom Cancel Vacating popup for the selected tenant.
    const handleCancelVacating = (tenant: VacatingTenant) => {
        // Store the tenant selected by the owner.
        setSelectedVacatingTenant(tenant);

        // Start with the switch ON because the tenant is vacating.
        setPendingCancelVacating(true);

        // Open the custom popup.
        setCancelVacatingPopupVisible(true);

        // Reset animations whenever the popup opens.
        cancelSwitchAnimation.setValue(1);
        cancelOkAnimation.setValue(0);
    };

    const handleRemoveTenant = (tenant: VacatingTenant) => {
        // Store the tenant selected for removal.
        setTenantToRemove(tenant);

        // Clear any previous error message.
        setRemoveTenantError("");

        // Open the Remove Tenant confirmation popup.
        setRemoveTenantVisible(true);
    };


    // ==================================================
    // available bed variables
    // ==================================================
    // Stores the empty-bed counts grouped by room.
    const [availableBeds, setAvailableBeds] = useState<
        { room_number: string; empty_bed_count: number }[]
    >([]);
    const [bedsLoading, setBedsLoading] = useState(false);
    const [bedsError, setBedsError] = useState("");
    const [bedsRetryKey, setBedsRetryKey] = useState(0);

    
    useEffect(() => {
        // Fetch empty-bed counts only when Available Beds is selected.
        if (activeView !== "beds") return;

        let isCancelled = false;

        const fetchAvailableBeds = async () => {
            setBedsLoading(true);
            setBedsError("");

            try {
                // buildingId comes from the current screen's route.
                const id = Number(buildingId);

                if (!Number.isInteger(id) || id <= 0) {
                    throw new Error("Invalid building ID.");
                }

                // Call the API function defined in services/bed.ts.
                const data = await getEmptyBedsByBuildingId(id);

                if (!isCancelled) {
                    setAvailableBeds(data);
                }
            } catch (error) {
                if (!isCancelled) {
                    // Show a friendly message instead of the raw network error.
                    setBedsError(
                        "Unable to load available beds. Please check your internet connection and try again."
                    );
                }
            } finally {
                if (!isCancelled) {
                    setBedsLoading(false);
                }
            }
        };

        fetchAvailableBeds();

        // Prevent state updates if the screen changes before the request finishes.
        return () => {
            isCancelled = true;
        };
    }, [activeView, buildingId, bedsRetryKey]);



    // ==================================================
    // 6. Render one compact tenant card
    // ==================================================
    const renderTenantCard = ({
        item,
    }: {
        item: VacatingTenant;
    }) => {
        const overdue = isOverdue(item.expected_checkout_date);
        const initial =
            item.full_name?.trim()?.[0]?.toUpperCase() ?? "?";

        return (
            <View
                style={[
                    styles.tenantCard,
                    isNarrowScreen && styles.tenantCardNarrow,
                ]}
            >
                {/* Top row: Avatar, tenant name, room number, and three-dot menu */}
                <View style={styles.cardTopRow}>
                    {/* Tenant avatar */}
                    <View
                        style={[
                            styles.avatar,
                            isNarrowScreen && styles.avatarNarrow,
                        ]}
                    >
                        <Text style={styles.avatarText}>
                            {initial}
                        </Text>
                    </View>

                    {/* Tenant name and room number */}
                    <View style={styles.nameBlock}>
                        <Text
                            style={[
                                styles.tenantName,
                                isNarrowScreen && styles.tenantNameNarrow,
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {item.full_name}
                        </Text>

                        <View style={styles.roomRow}>
                            <Text style={styles.roomText} numberOfLines={1}>
                                Room {item.room_number}
                            </Text>
                        </View>
                    </View>

                    
                    {/* Wrapper used to measure the three-dot button position. */}
                    <View
                        ref={(ref) => {
                            tenantMenuButtonRefs.current[item.tenant_id] = ref;
                        }}
                        collapsable={false}
                    >
                        {/* Three-dot menu button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.moreButton,
                                pressed && styles.pressed,
                            ]}
                            onPress={() => {
                                // Store the tenant whose menu was opened.
                                setTenantMenuItem(item);

                                // Measure the wrapper position on the screen.
                                tenantMenuButtonRefs.current[item.tenant_id]?.measureInWindow(
                                    (x, y, width, height) => {
                                        setTenantMenuPosition({ x, y, width, height });
                                        openTenantMenu();
                                    }
                                );
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`More options for ${item.full_name}`}
                        >
                            <Ionicons
                                name="ellipsis-vertical"
                                size={20}
                                color={COLORS.muted}
                            />
                        </Pressable>
                    </View>

                </View>

                {/* Single divider below tenant information */}
                <View style={styles.infoDivider} />

                {/* Countdown on the left and call button on the right */}
                <View style={styles.countdownCallRow}>
                    <View
                        style={[
                            styles.countdownPill,
                            overdue && styles.countdownPillOverdue,
                        ]}
                    >
                        <Text
                            style={[
                                styles.countdownText,
                                overdue && styles.countdownTextOverdue,
                            ]}
                            numberOfLines={1}
                        >
                            {getCountdownLabel(item.expected_checkout_date)}
                        </Text>
                    </View>

                    {/* Call tenant */}
                    <Pressable
                        onPress={() => callTenant(item.phone)}
                        style={({ pressed }) => [
                            styles.callButton,
                            pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${item.full_name}`}
                    >
                        <Ionicons
                            name="call"
                            size={16}
                            color="#0F5132"
                        />
                    </Pressable>
                </View>

                {/* Checkout date below the countdown */}
                <View style={styles.checkoutDateRow}>
                    <Text style={styles.dateValue}>
                        {formatCheckoutDate(item.expected_checkout_date)}
                    </Text>
                </View>

                {/* Cancel Vacating button */}
                <Pressable
                    onPress={() => handleCancelVacating(item)}
                    style={({ pressed }) => [
                        styles.amberButton,
                        styles.actionButtonFullWidth,
                        pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                >
                    <Ionicons
                        name="ban-outline"
                        size={13}
                        color={COLORS.amberText}
                    />

                    <Text
                        style={styles.amberButtonText}
                        numberOfLines={1}
                    >
                        Cancel Vacating
                    </Text>
                </Pressable>


                {/* Remove Tenant button on the tenant card */}
                <Pressable
                    onPress={() => handleRemoveTenant(item)}
                    style={({ pressed }) => [
                        styles.removeTenantCardButton,
                        pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                >
                    <Ionicons
                        name="trash-outline"
                        size={14}
                        color="#DC2626"
                    />
                    <Text style={styles.removeTenantCardButtonText}>
                        Remove Tenant
                    </Text>
                </Pressable>
                
            </View>

        );
    };

    // ==================================================
    // 7. Page return and screen states
    // ==================================================
    return (
        <SafeAreaView
            style={styles.container}
            edges={["top", "bottom"]}
        >
            
            {/* Header: selected page title stays left; inactive option stays right. */}
            <View style={styles.header}>
                {/* Back button always stays on the far left. */}
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color={COLORS.ink}
                    />
                </Pressable>

                {/* Selected page heading always stays on the left. */}
                <View style={styles.headerMain}>
                    <Text style={styles.headerTitle}>
                        {activeView === "vacating" ? "Vacating Tenants" : "Available Beds"}
                    </Text>

                    <Text style={styles.headerSubtitle}>
                        {activeView === "vacating"
                            ? "Manage your upcoming checkouts"
                            : "Find available beds by room"}
                    </Text>
                </View>

                {/* Inactive page switch always stays on the right. */}
                <Pressable
                    style={styles.headerSwitch}
                    onPress={() => {
                        // Give a light vibration when switching views.
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                        // Keep the existing view-switching logic.
                        setActiveView(activeView === "vacating" ? "beds" : "vacating");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                        activeView === "vacating"
                            ? "Show Available Beds"
                            : "Show Vacating Tenants"
                    }
                >
                    <Text style={styles.headerSwitchText} numberOfLines={1}>
                        {activeView === "vacating" ? "Available Beds" : "Vacating Tenants"}
                    </Text>
                </Pressable>
            </View>



            {/* Loading */}
            {activeView === "vacating" && (
                <>
                    {loading ? (
                        <View style={styles.centerContent}>
                            <ActivityIndicator
                                size="large"
                                color={COLORS.green}
                            />
                            <Text style={styles.stateText}>
                                Loading vacating tenants...
                            </Text>
                        </View>
                    ) : error ? (
                        /* Error */
                        <View style={styles.centerContent}>
                            <Ionicons
                                name="alert-circle-outline"
                                size={36}
                                color="#DC2626"
                            />

                            <Text style={styles.errorText}>
                                {error}
                            </Text>

                            <Pressable
                                style={styles.retryButton}
                                onPress={() => {
                                    router.replace({
                                        pathname: "/vacating_tenants/[buildingId]",
                                        params: { buildingId },
                                    });
                                }}
                            >
                                <Text style={styles.retryButtonText}>
                                    Try Again
                                </Text>
                            </Pressable>
                        </View>
                    ) : tenants.length === 0 ? (
                        /* Empty state */
                        <View style={styles.centerContent}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={32}
                                    color={COLORS.green}
                                />
                            </View>

                            <Text style={styles.emptyTitle}>
                                No Vacating Tenants
                            </Text>

                            <Text style={styles.stateText}>
                                Tenants marked as vacating will appear here.
                            </Text>
                        </View>
                    ) : (
                        /* Two-column layout, sorted by checkout date from the API */
                        <FlatList
                            data={tenants}
                            keyExtractor={(item) => String(item.tenant_id)}
                            renderItem={renderTenantCard}
                            numColumns={2}
                            columnWrapperStyle={styles.cardRow}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </>
            )}

            
            {/* Available Beds view */}
            {activeView === "beds" && (
                bedsLoading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={COLORS.green} />
                    </View>
                ) : bedsError ? (
                    <View style={styles.centerContent}>
                        <Text style={styles.errorText}>{bedsError}</Text>

                        <Pressable
                            style={styles.retryButton}
                            onPress={() => setBedsRetryKey((key) => key + 1)}
                        >
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </Pressable>
                    </View>
                ) : availableBeds.length === 0 ? (
                    <View style={styles.centerContent}>
                        <Text style={styles.stateText}>
                            All beds are currently occupied.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={availableBeds}
                        keyExtractor={(item, index) =>
                            `${item.room_number}-${index}`
                        }
                        contentContainerStyle={styles.availableBedsListContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={styles.availableBedCard}>
                                <Text style={styles.availableBedRoomNumber}>
                                    Room {item.room_number}
                                </Text>

                                <Text style={styles.availableBedCount}>
                                    +{item.empty_bed_count}
                                </Text>
                            </View>
                        )}
                    />
                )
            )}


            {/* Cancel Vacating confirmation popup — UI only for now. */}
            <Modal
                visible={cancelVacatingPopupVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeCancelVacatingPopup}
            >
                <View style={styles.cancelVacatingModalOverlay}>
                    <View style={styles.cancelVacatingModalBox}>
                        {/* Close button and animated switch */}
                        <View style={styles.cancelVacatingModalTopRow}>
                            <Pressable
                                style={styles.cancelVacatingCloseButton}
                                onPress={closeCancelVacatingPopup}
                                accessibilityRole="button"
                                accessibilityLabel="Close popup"
                            >
                                <Ionicons
                                    name="close"
                                    size={19}
                                    color="#475569"
                                />
                            </Pressable>

                            <Pressable
                                onPress={handleCancelVacatingSwitchToggle}
                                accessibilityRole="switch"
                                accessibilityState={{
                                    checked: pendingCancelVacating,
                                }}
                                accessibilityLabel="Vacating status"
                            >
                                <Animated.View
                                    style={[
                                        styles.cancelVacatingSwitchTrack,
                                        {
                                            backgroundColor:
                                                cancelSwitchAnimation.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [
                                                        "#CBD5E1",
                                                        "#062450",
                                                    ],
                                                }),
                                        },
                                    ]}
                                >
                                    <Animated.View
                                        style={[
                                            styles.cancelVacatingSwitchThumb,
                                            {
                                                transform: [
                                                    {
                                                        translateX: cancelSwitchAnimation.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [3, 23],
                                                        }),
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                </Animated.View>
                            </Pressable>
                        </View>

                        {/* Divider between the switch row and message */}
                        <View style={styles.cancelVacatingDivider} />

                        {/* Message updates when the switch changes. */}
                        {/* Show only the cancellation instruction */}
                        <View style={styles.cancelVacatingMessageContainer}>
                            <Text style={styles.cancelVacatingMessageStrong}>
                                Turn off the switch to cancel Vacating for{" "}
                                    {selectedVacatingTenant?.full_name}.
                            </Text>
                        </View>
                        
                        {/* Reserve the footer space so the modal height never changes */}
                        <View style={styles.cancelVacatingFooter}>
                            <Animated.View
                                pointerEvents={pendingCancelVacating ? "none" : "auto"}
                                style={{
                                    opacity: cancelOkAnimation,
                                    transform: [
                                        {
                                            translateY: cancelOkAnimation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [8, 0],
                                            }),
                                        },
                                    ],
                                }}
                            >
                                <Pressable
                                    style={styles.cancelVacatingOkButton}
                                    onPress={handleConfirmCancelVacating}
                                    disabled={pendingCancelVacating}
                                >
                                    <Text style={styles.cancelVacatingOkButtonText}>
                                        OK
                                    </Text>
                                </Pressable>
                            </Animated.View>
                        </View>

                    </View>
                </View>
            </Modal>


            {/* generate rent modal */}
            <Modal
                visible={generateRentPopupVisible}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => {
                    if (generatingRent) return;

                    setGenerateRentPopupVisible(false);
                    setSelectedRentTenant(null);
                    setSelectedBillingMonth(null);
                }}
            >
                <View style={[
                    styles.generateRentModalOverlay,
                    { paddingBottom: insets.bottom },
                ]}>
                    <View style={styles.generateRentModalBox}>
                        <View style={styles.generateRentHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.generateRentTitle}>
                                    Generate Rent
                                </Text>

                                <Text style={styles.generateRentSubtitle}>
                                    {selectedRentTenant?.full_name ?? "Select a month"}
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => {
                                    if (generatingRent) return;

                                    setGenerateRentPopupVisible(false);
                                    setSelectedRentTenant(null);
                                    setSelectedBillingMonth(null);
                                }}
                                disabled={generatingRent}
                                accessibilityRole="button"
                                accessibilityLabel="Close Generate Rent popup"
                            >
                                <Ionicons
                                    name="close-circle"
                                    size={28}
                                    color="#64748B"
                                />
                            </Pressable>
                        </View>

                        <Text style={styles.generateRentInstruction}>
                            Select one eligible month to generate its rent.
                        </Text>

                        {rentPopupLoading ? (
                            <View style={styles.generateRentLoading}>
                                <ActivityIndicator
                                    size="large"
                                    color={COLORS.green}
                                />
                                <Text style={styles.generateRentEmptyText}>
                                    Loading eligible months...
                                </Text>
                            </View>
                        ) : (missingRentMonths[
                            selectedRentTenant?.tenant_id ?? -1
                        ] ?? []).length === 0 ? (
                            <View style={styles.generateRentLoading}>
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={36}
                                    color={COLORS.green}
                                />
                                <Text style={styles.generateRentEmptyText}>
                                    No eligible missing rent months.
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={
                                    missingRentMonths[
                                        selectedRentTenant?.tenant_id ?? -1
                                    ] ?? []
                                }
                                keyExtractor={(item) => item.billing_month}
                                style={styles.generateRentMonthList}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const isSelected =
                                        selectedBillingMonth ===
                                        item.billing_month;

                                    const monthLabel = new Date(
                                        `${item.billing_month.slice(0, 7)}-15T12:00:00`
                                    ).toLocaleDateString("en-IN", {
                                        month: "long",
                                        year: "numeric",
                                    });

                                    return (
                                        <Pressable
                                            style={[
                                                styles.generateRentMonthCard,
                                                isSelected &&
                                                    styles.generateRentMonthCardSelected,
                                            ]}
                                            onPress={() =>
                                                setSelectedBillingMonth(
                                                    item.billing_month
                                                )
                                            }
                                            disabled={generatingRent}
                                            accessibilityRole="radio"
                                            accessibilityState={{
                                                checked: isSelected,
                                            }}
                                        >
                                            <View style={styles.generateRentMonthInfo}>
                                                <Text
                                                    style={
                                                        styles.generateRentMonthTitle
                                                    }
                                                >
                                                    {monthLabel}
                                                </Text>

                                                <Text
                                                    style={
                                                        styles.generateRentDueDate
                                                    }
                                                >
                                                    Due: {item.due_date}
                                                </Text>
                                            </View>

                                            <View style={styles.generateRentAmountAndRadio}>
                                                <Text
                                                    style={
                                                        styles.generateRentAmount
                                                    }
                                                >
                                                    ₹
                                                    {Number(
                                                        item.rent_amount
                                                    ).toLocaleString("en-IN")}
                                                </Text>

                                                <Ionicons
                                                    name={
                                                        isSelected
                                                            ? "radio-button-on"
                                                            : "radio-button-off"
                                                    }
                                                    size={23}
                                                    color={
                                                        isSelected
                                                            ? COLORS.green
                                                            : "#94A3B8"
                                                    }
                                                />
                                            </View>
                                        </Pressable>
                                    );
                                }}
                            />
                        )}

                        <View style={styles.generateRentFooter}>
                            <Pressable
                                style={styles.generateRentCancelButton}
                                onPress={() => {
                                    if (generatingRent) return;

                                    setGenerateRentPopupVisible(false);
                                    setSelectedRentTenant(null);
                                    setSelectedBillingMonth(null);
                                }}
                                disabled={generatingRent}
                            >
                                <Text
                                    style={styles.generateRentCancelButtonText}
                                >
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.generateRentConfirmButton,
                                    (!selectedBillingMonth ||
                                        rentPopupLoading ||
                                        generatingRent) &&
                                        styles.generateRentConfirmButtonDisabled,
                                ]}
                                onPress={handleGenerateSelectedRent}
                                disabled={
                                    !selectedBillingMonth ||
                                    rentPopupLoading ||
                                    generatingRent
                                }
                            >
                                {generatingRent ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />
                                ) : (
                                    <Text
                                        style={
                                            styles.generateRentConfirmButtonText
                                        }
                                    >
                                        Generate Rent
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            
            {/* Floating tenant menu */}
            <Modal
                visible={tenantMenuVisible}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={() => closeTenantMenu()}
            >
                {/* Tapping outside the menu closes it. */}
                <Pressable
                    style={styles.tenantMenuOverlay}
                    onPress={() => closeTenantMenu()}
                >
                    {/* Position the popup beside the selected three-dot button. */}
                    <Animated.View
                        style={[
                            styles.tenantActionMenu,
                            {
                                top: tenantMenuPosition.y + tenantMenuPosition.height + 4,
                                right:
                                    screenWidth -
                                    tenantMenuPosition.x -
                                    tenantMenuPosition.width,
                                opacity: tenantMenuAnimation,
                                transform: [
                                    {
                                        scale: tenantMenuAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.95, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        {/* Generate Rent option inside the three-dot menu */}
                        <Pressable
                            style={styles.tenantMenuOption}
                            onPress={() => {
                                // Save the selected tenant before closing the menu.
                                const selectedTenant = tenantMenuItem;

                                // Close the menu, then open the Generate Rent popup.
                                closeTenantMenu(() => {
                                    if (selectedTenant) {
                                        handleOpenGenerateRent(selectedTenant);
                                    }
                                });
                            }}
                        >
                            <Ionicons
                                name="receipt-outline"
                                size={15}
                                color={COLORS.green}
                            />
                            <Text style={styles.tenantMenuGenerateText}>
                                Generate Rent
                            </Text>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>


            
            {/* Remove Tenant Confirmation Modal */}
            <Modal
                visible={removeTenantVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setRemoveTenantVisible(false);
                    setTenantToRemove(null);
                    setRemoveTenantError("");
                }}
            >
                <View style={styles.removeModalContainer}>
                    <View style={styles.removeModalBox}>
                        <Text style={styles.removeModalTitle}>
                            Remove Tenant?
                        </Text>

                        <Text style={styles.removeModalMessage}>
                            {`Are you sure you want to permanently remove ${tenantToRemove?.full_name} from your PG?`}
                        </Text>

                        {removeTenantError ? (
                            <Text style={styles.removeModalError}>
                                {removeTenantError}
                            </Text>
                        ) : null}

                        <View style={styles.removeModalButtons}>
                            <Pressable
                                style={styles.dangerButton}
                                disabled={removingTenant}
                                onPress={() => {
                                    setRemoveTenantVisible(false);
                                    setTenantToRemove(null);
                                    setRemoveTenantError("");
                                }}
                            >
                                <Text style={styles.dangerButtonText}>
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.dangerButton,
                                    removingTenant && { opacity: 0.7 },
                                ]}
                                disabled={removingTenant}
                                onPress={async () => {
                                    if (!tenantToRemove) {
                                        return;
                                    }

                                    try {
                                        setRemovingTenant(true);
                                        setRemoveTenantError("");

                                        // Call the existing backend removal API.
                                        const result = await removeTenant(
                                            tenantToRemove.tenant_id
                                        );

                                        // Remove the tenant from the current list.
                                        setTenants((previous) =>
                                            previous.filter(
                                                (item) =>
                                                    item.tenant_id !==
                                                    tenantToRemove.tenant_id
                                            )
                                        );

                                        // Clear this tenant's cached missing-rent information.
                                        setMissingRentMonths((previous) => {
                                            const updated = { ...previous };
                                            delete updated[tenantToRemove.tenant_id];
                                            return updated;
                                        });

                                        setMissingRentCounts((previous) => {
                                            const updated = { ...previous };
                                            delete updated[tenantToRemove.tenant_id];
                                            return updated;
                                        });

                                        // Close the popup after successful removal.
                                        setRemoveTenantVisible(false);
                                        setTenantToRemove(null);

                                        // Show a success toast after removing the tenant.
                                        showToast(
                                            "success",
                                            result.message || "Tenant removed successfully."
                                        );
                                    } catch (error) {
                                        setRemoveTenantError(
                                            error instanceof Error
                                                ? error.message
                                                : "Failed to remove tenant. Please try again."
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
                                    <>
                                        <Ionicons
                                            name="trash-outline"
                                            size={15}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.dangerButtonText} numberOfLines={1}>
                                            Remove
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>



            {/* Custom success/error toast displayed at the bottom of the page. */}
            {toast && (
                <View
                    style={[
                        styles.toastContainer,
                        toast.type === "success"
                            ? styles.toastSuccess
                            : styles.toastError,
                    ]}
                >
                    <Ionicons
                        name={
                            toast.type === "success"
                                ? "checkmark-circle"
                                : "alert-circle"
                        }
                        size={24}
                        color={
                            toast.type === "success"
                                ? "#15803D"
                                : "#B91C1C"
                        }
                    />

                    <Text
                        style={[
                            styles.toastMessage,
                            toast.type === "success"
                                ? styles.toastSuccessText
                                : styles.toastErrorText,
                        ]}
                    >
                        {toast.message}
                    </Text>

                    <Pressable
                        onPress={() => {
                            if (toastTimer.current) {
                                clearTimeout(toastTimer.current);
                                toastTimer.current = null;
                            }

                            setToast(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss message"
                    >
                        <Ionicons
                            name="close"
                            size={19}
                            color={COLORS.muted}
                        />
                    </Pressable>
                </View>
            )}

        </SafeAreaView>
    );
}

// ==================================================
// 8. Responsive styles
// ==================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16, // More space from both screen edges
        paddingTop: 12,
        paddingBottom: 12,
        gap: 12,
    },

    backButton: {
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 13,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        alignItems: "center",
        justifyContent: "center",
    },

    headerTextContainer: {
        flex: 1,
        minWidth: 0,
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.ink,
    },

    headerSubtitle: {
        fontSize: 11,
        color: COLORS.muted,
        marginTop: 3,
    },

    // Main heading gets approximately 70% of the remaining header space.
    headerMain: {
        flex: 7,
        minWidth: 0,
        marginLeft: 8,
    },

    // Inactive option gets approximately 30% of the remaining space.
    headerSwitch: {
        flex: 3,
        minWidth: 0,
        minHeight: 40,
        paddingHorizontal: 6,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        backgroundColor: COLORS.card,
        alignItems: "center",
        justifyContent: "center",
    },

    headerSwitchText: {
        fontSize: 10,
        fontWeight: "700",
        color: COLORS.ink,
        textAlign: "center",
    },

    countBadge: {
        minWidth: 34,
        height: 34,
        paddingHorizontal: 7,
        flexShrink: 0,
        borderRadius: 12,
        backgroundColor: COLORS.greenSoft,
        alignItems: "center",
        justifyContent: "center",
    },

    countText: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.green,
    },

    // List and two-column row spacing
    listContent: {
        paddingHorizontal: 10,
        paddingTop: 2,
        paddingBottom: 16,
    },

    cardRow: {
        gap: 10,
        marginBottom: 10,
        alignItems: "stretch",
    },

    // Main tenant card with responsive width and natural height.
    tenantCard: {
        flex: 1,
        minWidth: 0,
        padding: 10,
        gap: 9,
        borderRadius: 17,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        shadowColor: COLORS.ink,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 5,
        elevation: 2,
    },

    // Slightly smaller spacing on narrow phone screens.
    tenantCardNarrow: {
        padding: 8,
        gap: 7,
        borderRadius: 14,
    },

    // Keeps the countdown left-aligned and the call button on the right.
    countdownCallRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },

    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    // Compact three-dot action button beside the tenant name.
    moreButton: {
        width: 26,
        height: 32,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
    },

    avatar: {
        width: 32,
        height: 32,
        flexShrink: 0,
        borderRadius: 16,
        backgroundColor: "#86a898" ,
        borderWidth: 2,
        borderColor: COLORS.greenSoft,
        alignItems: "center",
        justifyContent: "center",
    },

    avatarNarrow: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },

    avatarText: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFFFFF",
    },

    nameBlock: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },

    tenantName: {
        fontSize: 13,
        fontWeight: "800",
        color: "#14261C",
        letterSpacing: 0.2,
    },

    tenantNameNarrow: {
        fontSize: 12,
    },

    roomRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },

    roomText: {
        flex: 1,
        minWidth: 0,
        fontSize: 10,
        color: COLORS.muted,
    },

    infoDivider: {
        height: 1,
        backgroundColor: "#E6E1D5",
        marginVertical: 2,
    },

    // Checkout date appears directly below the countdown.
    checkoutDateRow: {
        alignItems: "flex-start",
        marginTop: -8,
        marginBottom: 30,
    },


    // Countdown
    countdownPill: {
        alignSelf: "flex-start",
        maxWidth: "100%",
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: COLORS.greenSoft,
    },

    countdownPillOverdue: {
        backgroundColor: COLORS.redBg,
    },

    countdownText: {
        fontSize: 10,
        fontWeight: "800",
        color: COLORS.green,
    },

    countdownTextOverdue: {
        color: COLORS.redText,
    },

    // Vacating date and call icon
    vacatingDateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: COLORS.greenPanelBorder,
    },

    dateTextBlock: {
        flex: 1,
        minWidth: 0,
    },

    dateLabel: {
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 0.3,
        color: COLORS.muted,
    },

    dateValue: {
        marginTop: 3,
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.green,
    },

    callButton: {
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 15,
        backgroundColor: "transparent",
        borderWidth: 0,
        alignItems: "center",
        justifyContent: "center",
    },

    // Two action buttons
    actionsRow: {
        flexDirection: "row",
        gap: 5,
    },

    primaryButton: {
        flex: 1,
        minWidth: 0,
        minHeight: 31,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderRadius: 9,
        backgroundColor: COLORS.green,
    },

    primaryButtonText: {
        flexShrink: 1,
        fontSize: 11,
        lineHeight: 15,
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center",
    },

    amberButton: {
        flex: 1,
        minWidth: 0,
        minHeight: 31,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderRadius: 9,
        backgroundColor: COLORS.amberBg,
        borderWidth: 1,
        borderColor: COLORS.amberBorder,
    },

    amberButtonText: {
        flexShrink: 1,
        fontSize: 11,
        lineHeight: 15,
        fontWeight: "700",
        color: COLORS.amberText,
        textAlign: "center",
    },

    buttonTextNarrow: {
        fontSize: 8,
        lineHeight: 10,
    },

    // Makes each action button fill the card width on its own row.
    actionButtonFullWidth: {
        width: "100%",
        minHeight: 30,
        alignSelf: "stretch",
    },


    pressed: {
        opacity: 0.75,
    },

    // Loading, error, and empty states
    centerContent: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },

    stateText: {
        marginTop: 10,
        fontSize: 13,
        lineHeight: 19,
        color: COLORS.muted,
        textAlign: "center",
    },

    errorText: {
        marginTop: 12,
        fontSize: 14,
        lineHeight: 20,
        color: "#B91C1C",
        textAlign: "center",
    },

    retryButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 11,
        backgroundColor: COLORS.green,
    },

    retryButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    emptyIconContainer: {
        width: 66,
        height: 66,
        borderRadius: 22,
        backgroundColor: COLORS.greenSoft,
        alignItems: "center",
        justifyContent: "center",
    },

    emptyTitle: {
        marginTop: 14,
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.ink,
    },

    // Dark background behind the Cancel Vacating popup.
    cancelVacatingModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    cancelVacatingModalBox: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 16,
        elevation: 8,
    },

    // Close button on the left and switch on the right.
    cancelVacatingModalTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    cancelVacatingCloseButton: {
        width: 25,
        height: 25,
        borderRadius: 16,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },

    cancelVacatingSwitchTrack: {
        width: 40,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        overflow: "hidden",
    },

    cancelVacatingSwitchThumb: {
        position: "absolute",
        left: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        elevation: 2,
    },

    cancelVacatingDivider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginTop: 7,
        marginBottom: 1,
    },
    
    cancelVacatingMessageContainer: {
        marginTop: 7,
        alignItems: "flex-start",
    },

    cancelVacatingMessageStrong: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1E293B",
        lineHeight: 22,
    },

    cancelVacatingMessageHint: {
        marginTop: 6,
        fontSize: 12,
        color: "#64748B",
        lineHeight: 18,
    },

    cancelVacatingFooter: {
        marginTop: 8,
        alignItems: "flex-end",
        justifyContent: "center",
    },

    cancelVacatingOkButton: {
        minWidth: 80,
        height: 36,
        paddingHorizontal: 18,
        borderRadius: 10,
        backgroundColor: "#071b46",
        alignItems: "center",
        justifyContent: "center",
    },

    cancelVacatingOkButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    // ==================================================
    //  error styles
    // ==================================================  
    // Custom bottom toast.
    toastContainer: {
        position: "absolute",
        bottom: 22,
        left: 16,
        right: 16,
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 15,
        paddingVertical: 13,
        borderRadius: 16,
        borderWidth: 1,
        elevation: 8,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        zIndex: 100,
    },

    toastSuccess: {
        backgroundColor: "#F0FDF4",
        borderColor: "#BBF7D0",
    },

    toastError: {
        backgroundColor: "#FEF2F2",
        borderColor: "#FECACA",
    },

    toastMessage: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        fontWeight: "600",
    },

    toastSuccessText: {
        color: "#166534",
    },

    toastErrorText: {
        color: "#991B1B",
    },


    
    // Generate Rent popup overlay
    generateRentModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.48)",
        justifyContent: "flex-end",
    },

    // Generate Rent popup container
    generateRentModalBox: {
        width: "100%",
        maxHeight: "82%",
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    // Popup title and close button row
    generateRentHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },

    // Popup heading
    generateRentTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#14261C",
    },

    // Tenant name below the heading
    generateRentSubtitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
        marginTop: 4,
    },

    // Instructions for selecting a month
    generateRentInstruction: {
        fontSize: 13,
        lineHeight: 19,
        color: "#64748B",
        marginBottom: 16,
    },

    // Loading and empty states
    generateRentLoading: {
        minHeight: 130,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 20,
    },

    generateRentEmptyText: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
    },

    // Scrollable list of eligible rent months
    generateRentMonthList: {
        flexGrow: 0,
        flexShrink: 1,
    },

    // Individual month card
    generateRentMonthCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 15,
        marginBottom: 10,
    },

    // Highlight the selected month
    generateRentMonthCardSelected: {
        backgroundColor: "#F0FDF4",
        borderColor: "#16A34A",
        borderWidth: 1.5,
    },

    // Month and due-date information
    generateRentMonthInfo: {
        flex: 1,
        paddingRight: 10,
    },

    generateRentMonthTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#14261C",
    },

    generateRentDueDate: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 5,
    },

    // Rent amount and selection icon
    generateRentAmountAndRadio: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    generateRentAmount: {
        fontSize: 15,
        fontWeight: "800",
        color: "#14261C",
    },

    // Bottom action buttons
    generateRentFooter: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },

    generateRentCancelButton: {
        flex: 1,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        backgroundColor: "#FFFFFF",
    },

    generateRentCancelButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#475569",
    },

    generateRentConfirmButton: {
        flex: 1.4,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        backgroundColor: "#0F5132",
        paddingHorizontal: 12,
    },

    generateRentConfirmButtonDisabled: {
        backgroundColor: "#94A3B8",
    },

    generateRentConfirmButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },


    // ==================================================
    //  remove tenant modal
    // ==================================================  
    
    removeModalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },

    removeModalBox: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 15,
    },

    removeModalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 12,
    },

    removeModalMessage: {
        fontSize: 15,
        lineHeight: 22,
        color: "#334155",
        marginBottom: 12,
    },

    removeModalHint: {
        fontSize: 13,
        lineHeight: 20,
        color: "#64748B",
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
    },

    removeModalError: {
        fontSize: 13,
        lineHeight: 19,
        color: "#DC2626",
        marginBottom: 12,
    },



    // Confirmation modal buttons row
    removeModalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
    },

    // Cancel button
    cancelButton: {
        minWidth: 95,
        height: 44,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },

    // Cancel button text
    cancelButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.ink,
    },


    dangerButton: {
        minWidth: 95,
        height: 44,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#b91c1c",

        // Keep the icon and text on one line.
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },

    // Remove button text
    dangerButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },


    
    tenantMenuOverlay: {
        flex: 1,
        backgroundColor: "transparent",
    },

    // Small floating tenant menu
    tenantActionMenu: {
        position: "absolute",
        minWidth: 145, // Reduced from 175
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        paddingVertical: 3, // Less vertical space
        borderWidth: 1,
        borderColor: "#E6E1D5",
        elevation: 8,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 6,
        zIndex: 100,
    },


    // Smaller menu button
    tenantMenuOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 10,
        paddingVertical: 9, // Reduced from 13
    },

    // Smaller text
    tenantMenuOptionText: {
        fontSize: 12, // Reduced from 14
        fontWeight: "600",
        color: COLORS.redText,
    },

    // Remove Tenant button on the tenant card
    removeTenantCardButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 31,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 9,
        backgroundColor: "#FFF4F4",
        borderWidth: 1,
        borderColor: "#F1CFCF",
    },

    removeTenantCardButtonText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#DC2626",
    },

    // Generate Rent text in the three-dot menu
    tenantMenuGenerateText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.green,
    },









    // EMPTY BED page

    availableBedsListContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },

    availableBedCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E6E1D5",
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 10,
    },

    availableBedRoomNumber: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.ink,
    },

    availableBedCount: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.green,
    },


});