import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";

import PropertyCard from "../components/PropertyCard";
import { getMyBuildings } from "../services/building";


type Property = {
  id: number;
  name: string;
  address: string;
  totalRooms: number;
};

export default function HomeScreen() {
    const [roomNumber, setRoomNumber] = useState("");
    const [properties, setProperties] = useState<Property[]>([]);

    const loadBuildings = async () => {
        const data = await getMyBuildings();

        setProperties(data.buildings);
        };

    useEffect(() => {
    loadBuildings();
    }, []);
    
    return (
    <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>

        <View>
            <Text style={styles.greeting}>Good evening</Text>
            <Text style={styles.title}>Your PG</Text>
        </View>

        <View style={styles.profile}>
            <Text style={styles.profileText}>N</Text>
        </View>

        </View>

        {/* Search */}
        <View style={styles.searchBox}>

            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#888888"
                value={roomNumber}
                onChangeText={setRoomNumber}
            />

            <Pressable style={styles.searchButton}>
                <Text style={styles.searchButtonText}>→</Text>
            </Pressable>

        </View>

        
        {properties.length > 0 ? (
        <>
            <Text style={styles.buildingsTitle}>
                Your Buildings
            </Text>

            <ScrollView style={styles.cardsContainer}>
                {properties.map((property) => (
                    <PropertyCard
                        key={property.id}
                        pgId={`PG-${property.id}`}
                        name={property.name}
                        address={property.address}
                        totalRooms={property.totalRooms}
                        onPress={() => {
                            router.push({
                                pathname: "/building/[buildingId]",
                                params: {
                                    buildingId: property.id.toString(),
                                },
                            });
                        }}
                    />
                ))}
            </ScrollView>

        </>
        ) : (
            <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                    No PGs yet
                </Text> 

                <Text style={styles.emptyMessage}>
                    Create your first PG to get started.
                </Text>

                <Pressable 
                    style={styles.createButton}
                    onPress={() => {
                        router.push({
                            pathname: "/create-pg",
                        });
                    }}
                >
                    <Text style={styles.createButtonText}>
                        + Create PG
                    </Text>
                </Pressable>
            </View>
        )}

    </View>
    );

    }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F1F3F5",
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 30,
        marginBottom: 36,
    },

    greeting: {
        fontSize: 14,
        fontWeight: "500",
        color: "#777777",
        marginBottom: 4,
    },

    title: {
        fontSize: 32,
        fontWeight: "700",
        color: "#071426",
    },

    profile: {
        width: 42,
        height: 42,
        borderRadius: 26,
        backgroundColor: "#071426",
        justifyContent: "center",
        alignItems: "center",
    },

    profileText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "600",
    },

    searchBox: {
        marginTop:5,
        height: 46,
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        paddingLeft: 16,
        paddingRight: 6,
        flexDirection: "row",
        alignItems: "center",
    },

    searchLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#888888",
        letterSpacing: 0.8,
        marginBottom: 6,
    },

    searchInput: {
        flex: 1,
        padding: 0,
        fontSize: 16,
        color: "#071426",
    },
    
    searchContent: {
        flex: 1,
    },

    searchButton: {
        width: 47,
        height: 46,
        borderRadius: 16,
        backgroundColor: "#071426",
        justifyContent: "center",
        alignItems: "center",
    },

    searchButtonText: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "500",
    },

    searchIcon: {
        fontSize: 22,
        color: "#071426",
        marginRight: 10,
    },
    
    buildingsTitle: {
        fontSize: 19,
        fontWeight: "700",
        color: "#071426",
        marginTop: 30,
        marginBottom: 16,
    },

    emptyState: {
        alignItems: "center",
        marginTop: 70,
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
        marginBottom: 22,
    },

    createButton: {
        backgroundColor: "#071426",
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderRadius: 14,
    },

    createButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
    },

    cardsContainer: {
        flex: 1,
    },
});