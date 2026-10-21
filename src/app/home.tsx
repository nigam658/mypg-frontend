import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/api";

import PropertyCard from "../components/PropertyCard";
import PropertyCardSkeleton from "../components/PropertyCardSkeleton";
import { authenticatedFetch } from "../services/auth";
import { getMyBuildings } from "../services/building";


type Property = {
    id: number;
    name: string;
    address: string;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
};


type Owner = {
    owner_id: number;
    name: string;
};


// =========================
// Dynamic Greeting
// =========================
const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 4 && hour < 12) {
        return "Good morning";
    }

    if (hour >= 12 && hour < 18) {
        return "Good afternoon";
    }

    if (hour >= 18) {
        return "Good evening";
    }

    return "Good night";
};


export default function HomeScreen() {

    // =========================
    // State
    // =========================
    const [roomNumber, setRoomNumber] = useState("");
    const [properties, setProperties] = useState<Property[]>([]);
    // Tracks whether building data is currently being fetched.
    const [loadingBuildings, setLoadingBuildings] = useState(true);
    const [buildingError, setBuildingError] = useState(false);
    const [greeting] = useState(getGreeting());
    const [owner, setOwner] = useState<Owner | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const insets = useSafeAreaInsets();

    // =========================
    // Logout
    // =========================

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");

        router.replace("/login");
    };


    // =========================
    // Load Buildings
    // =========================
    const loadBuildings = async () => {

       // Start building data loading.
        setLoadingBuildings(true);

        // Clear any previous error before starting a new request.
        setBuildingError(false);


        try {

            const data = await getMyBuildings();
            setProperties(data.buildings);

        } catch (error) {

        // Building data could not be loaded.
        setBuildingError(true);

        } finally {

            // Building data has finished loading.
            setLoadingBuildings(false);
        }

    };


    // =========================
    // Load Owner Information
    // =========================
    const loadOwner = async () => {

        const response = await authenticatedFetch(
            `${API_BASE_URL}/auth/me`
        );

        if (!response.ok) {  
            throw new Error("Failed to load owner");
        }

        const data = await response.json();

        setOwner(data);
    };


    // =========================
    // Reload home data whenever the screen comes into focus
    // =========================
    useFocusEffect(
        useCallback(() => {
            loadBuildings();
            loadOwner();
        }, [])
    );


    return (

        <SafeAreaView
            edges={["top", "bottom"]}
            style={{ flex: 1, backgroundColor: "#F1F3F5" }}
        >
            <View style={styles.container}>

                {/* =========================
                    Header
                ========================= */}
                <View style={styles.header}>

                    {/* Left Side */}
                    <View style={styles.headerLeft}>

                        <Pressable
                            style={styles.logoutButton}
                            onPress={handleLogout}
                        >
                            <Text style={styles.logoutButtonText}>
                                Logout
                            </Text>
                        </Pressable>

                        <View>
                            <Text style={styles.greeting}>
                                {greeting},{" "}
                                <Text style={styles.greetingName}>
                                    {owner?.name?.trim().split(" ")[0] || ""}
                                </Text>
                            </Text>

                            <Text style={styles.title}>
                                NG PG
                            </Text>
                        </View>

                    </View>

                    {/* Profile */}
                    <Pressable
                        style={styles.profile}
                        onPress={() => setShowProfile(true)}
                    >
                        <Text style={styles.profileText}>
                            {owner?.name?.trim().charAt(0).toUpperCase() || "?"}
                        </Text>
                    </Pressable>

                </View>


                {/* =========================
                    Search
                ========================= */}
                <View style={styles.searchBox}>

                    <Text style={styles.searchIcon}>
                        ⌕
                    </Text>


                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search service comming soon..."
                        placeholderTextColor="#9A9EA5"
                        value={roomNumber}
                        onChangeText={setRoomNumber}
                    />


                    <Pressable style={styles.searchButton}>

                        <Text style={styles.searchButtonText}>
                            →
                        </Text>

                    </Pressable>

                </View>


                {/* =========================
                    Buildings
                ========================= */}

                {/* Buildings Heading */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.buildingsTitle}>
                        Your Buildings
                    </Text>

                    <View style={styles.buildingCount}>
                        <Text style={styles.buildingCountText}>
                            {loadingBuildings ? "..." : properties.length}
                        </Text>
                    </View>
                </View>

                {/* =========================
                    Building Content
                ========================= */}

                {loadingBuildings ? (

                    // Show skeleton cards while buildings are loading.
                    <>
                        <PropertyCardSkeleton />
                        <PropertyCardSkeleton />
                    </>

                ) : buildingError ? (

                    // Show error message when building API fails.
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>
                            Failed to load PGs
                        </Text>

                        <Text style={styles.emptyMessage}>
                            Please check your internet connection and try again.
                        </Text>

                        <TouchableOpacity
                            onPress={loadBuildings}
                            style={{
                                marginTop: 16,
                                paddingHorizontal: 24,
                                paddingVertical: 10,
                                borderRadius: 8,
                                backgroundColor: "#1E3A8A",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#FFFFFF",
                                    fontWeight: "600",
                                }}
                            >
                                Retry
                            </Text>
                        </TouchableOpacity>
                    </View>

                ) : properties.length > 0 ? (

                    // Show actual building cards when data is available.
                    <ScrollView
                        style={styles.cardsContainer}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.cardsContent}
                    >
                        {properties.map((property) => (
                            <PropertyCard
                                key={property.id}
                                pgId={`PG-${property.id}`}
                                name={property.name}
                                address={property.address}
                                totalRooms={property.totalRooms}
                                totalBeds={property.totalBeds}
                                occupiedBeds={property.occupiedBeds}
                                availableBeds={property.availableBeds}
                                onPress={() => {
                                    router.push({
                                        pathname: "/building/[buildingId]",
                                        params: {
                                            buildingId: property.id.toString(),
                                            buildingName: property.name,
                                        },
                                    });
                                }}
                            />
                        ))}
                    </ScrollView>

                ) : (

                    // Show this only when API succeeds but there are no buildings.
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>
                            No PGs yet
                        </Text>

                        <Text style={styles.emptyMessage}>
                            Create your first PG to get started.
                        </Text>
                    </View>
                )}


                {/* =========================
                    Floating Create PG Button
                ========================= */}
                <Pressable
                    style={[
                        styles.floatingCreateButton,
                        { bottom: insets.bottom + 24 },
                    ]}
                    onPress={() => {
                        router.push("/create-pg");
                    }}
                >

                    <Text style={styles.floatingCreateButtonText}>
                        + Create PG
                    </Text>

                </Pressable>


                {/* =========================
                    Profile Preview Modal
                ========================= */}
                <Modal
                    visible={showProfile}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowProfile(false)}
                >

                    <Pressable
                        style={styles.profileOverlay}
                        onPress={() => setShowProfile(false)}
                    >

                        <View style={styles.largeProfile}>

                            <Text style={styles.largeProfileText}>
                                {owner?.name?.trim().charAt(0).toUpperCase() || "?"}
                            </Text>

                        </View>

                    </Pressable>

                </Modal>

            </View>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({

    // =========================
    // Main Container
    // =========================
    container: {
        flex: 1,
        backgroundColor: "#F1F3F5",
        paddingHorizontal: 10,
    },


    // =========================
    // Header
    // =========================
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginTop: 16,
        marginBottom: 36,
    },

    headerLeft: {
        flexDirection: "column",
        alignItems: "flex-start",
    },

    logoutButton: {
        marginBottom: 25,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: "#E2E6EA",
    },

    logoutButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#071426",
    },


    // =========================
    // Greeting
    // =========================
    greeting: {
        fontSize: 14,
        fontWeight: "400",
        color: "#7B8088",
        marginBottom: 6,
    },


    greetingName: {
        fontWeight: "600",
        color: "#7B8088",
    },


    // =========================
    // Page Title
    // =========================
    title: {
        fontSize: 32,
        fontWeight: "700",
        color: "#071426",
        letterSpacing: -0.5,
    },


    // =========================
    // Small Profile
    // =========================
    profile: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginTop:8,
        backgroundColor: "#071426",

        justifyContent: "center",
        alignItems: "center",
    },


    profileText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },


    // =========================
    // Profile Overlay
    // =========================
    profileOverlay: {
        flex: 1,

        backgroundColor: "rgba(0, 0, 0, 0.50)",

        justifyContent: "center",
        alignItems: "center",
    },


    // =========================
    // Large Profile
    // =========================
    largeProfile: {
        width: 200,
        height: 200,
        borderRadius: 100,

        backgroundColor: "#071426",

        justifyContent: "center",
        alignItems: "center",
    },


    largeProfileText: {
        color: "#FFFFFF",
        fontSize: 72,
        fontWeight: "600",
    },


    // =========================
    // Search Box
    // =========================
    searchBox: {
        height: 50,

        backgroundColor: "#FFFFFF",

        borderRadius: 16,

        paddingLeft: 15,
        paddingRight: 5,

        flexDirection: "row",
        alignItems: "center",

        borderWidth: 1,
        borderColor: "#E2E5E9",
    },


    searchIcon: {
        fontSize: 23,
        color: "#071426",

        marginRight: 9,
    },


    searchInput: {
        flex: 1,

        padding: 0,

        fontSize: 15,
        color: "#071426",
    },


    searchButton: {
        width: 42,
        height: 42,

        borderRadius: 13,

        backgroundColor: "#071426",

        justifyContent: "center",
        alignItems: "center",
    },


    searchButtonText: {
        color: "#FFFFFF",
        fontSize: 21,
        fontWeight: "500",
    },


    // =========================
    // Buildings Section
    // =========================
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",

        marginTop: 28,
        marginBottom: 16,
    },


    buildingsTitle: {
        fontSize: 19,
        fontWeight: "700",
        color: "#071426",
    },


    // =========================
    // Building Count
    // =========================
    buildingCount: {
        marginLeft: 8,

        minWidth: 30,
        height: 28,

        paddingHorizontal: 8,

        borderRadius: 8,

        backgroundColor: "#E2E6EA",

        justifyContent: "center",
        alignItems: "center",
    },


    buildingCountText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#071426",
    },


    // =========================
    // Building Cards Container
    // =========================
    cardsContainer: {
        flex: 1,
    },


    cardsContent: {
        paddingBottom: 100,
    },


    // =========================
    // Empty State
    // =========================
    emptyState: {
        alignItems: "center",

        marginTop: 70,
        paddingHorizontal: 20,
    },


    emptyTitle: {
        fontSize: 22,
        fontWeight: "700",

        color: "#071426",

        marginBottom: 8,
    },


    emptyMessage: {
        fontSize: 14,

        color: "#777777",

        textAlign: "center",

        marginBottom: 22,
    },


    // =========================
    // Floating Create PG Button
    // =========================
    floatingCreateButton: {
        position: "absolute",
        right: 20,
        backgroundColor: "#071426",
        paddingHorizontal: 18,
        paddingVertical: 13,
        borderRadius: 14,

        elevation: 5,

        shadowColor: "#000",

        shadowOffset: {
            width: 0,
            height: 3,
        },

        shadowOpacity: 0.18,
        shadowRadius: 6,
    },


    floatingCreateButtonText: {
        color: "#FFFFFF",

        fontSize: 14,
        fontWeight: "600",
    },

});