import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    getFloorsByBuildingId,
    getRoomsByFloorId
} from "@/services/building";

  export default function BuildingPage() {
    const { buildingId } = useLocalSearchParams();
    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const fetchFloors = async () => {
            try {
                const data = await getFloorsByBuildingId(Number(buildingId));

                    setFloors(data);
                    if (data.length > 0) {
                        setSelectedFloorId(data[0].id);
                    }

                    } catch (error) {
                        console.log("Failed to fetch floors:", error);
                    }
        };
        fetchFloors();
        }, [buildingId]);


    useEffect(() => {
        if (selectedFloorId === null) {
            return;
        }
        const fetchRooms = async () => {
            try {
                const data = await getRoomsByFloorId(selectedFloorId);
                setRooms(data);
                }catch (error) {
                    console.log("Failed to fetch rooms:", error);
                }
        };
        fetchRooms();
        }, [selectedFloorId]);
        console.log("ROOMS:", rooms);

        
    return (
        <View style={styles.container}>
            
            <View style={styles.content}>
                <View style={styles.floorSection}>
                    <Text style={styles.floorTitle}>Floors</Text>

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
                </View>
            
                <View style={styles.roomsContainer}>
                    <Text style={styles.roomTitle}>Rooms</Text>

                    <FlatList
                        data={rooms}
                        keyExtractor={(room) => room.id.toString()}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <Pressable
                                style={styles.roomCard}
                                // navigate to bed page // 
                                onPress={() => {
                                    router.push({
                                        pathname: "/room/[roomId]",
                                        params: {
                                            roomId: item.id.toString(),
                                            roomNumber: item.roomNumber.toString(),
                                        },
                                    });
                                }}
                                >
                                <View style={styles.roomRow}>

                                    <View style={styles.roomNumberBox}>
                                        <Text style={styles.roomNumber}>
                                            {item.roomNumber}
                                        </Text>
                                    </View>

                                    <Text style={styles.bedCount}>
                                        {item.totalBeds} beds
                                    </Text>

                                    <Text style={styles.roomArrow}>
                                        ›
                                    </Text>

                                </View>
                            </Pressable>
                        )}
                    />
                </View>
            </View>
        </View>
    );
}


    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: "#172554",
        },

        content: {
            flex: 1,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 20,
            backgroundColor: "#F8FAFC",
        },

        floorSection: {
            marginTop: 20,
        },

        floorTitle: {
            fontSize: 18,
            fontWeight: "600",
            marginBottom: 12,
        },

        floorList: {
            paddingRight: 16,
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

        selectedFloorText: {
            color: "white",
            fontWeight: "600",
        },
        
        floorText: {
            fontSize: 18,
            fontWeight: "500",
        },

        roomsContainer: {
            flex: 1,
            marginTop: 20,
            padding: 16,
            borderRadius: 16,
            backgroundColor: "#EEF2F7",
        },

        roomSection: {
            marginTop: 24,
        },

        roomTitle: {
            fontSize: 18,
            fontWeight: "600",
            marginBottom: 12,
        },

        roomCard: {
            padding: 16,
            marginBottom: 12,
            backgroundColor: "white",
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: "#E5E7EB",
        },

        roomNumberBox: {
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderWidth: 0.5,
            borderColor: "#dbdee0",
            borderRadius: 8,
            backgroundColor: "transparent",
        },

        roomNumber: {
            fontSize: 16,
            fontWeight: "700",
            color: "#142251",
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

        selectedFloorButton: {
            backgroundColor: "#172554",
            borderColor: "#172554"
        },

        roomRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },

});