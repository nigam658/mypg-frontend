import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { createPG } from "@/services/building";

export default function CreatePG() {

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");

    const [floors, setFloors] = useState(1);
    const [roomsPerFloor, setRoomsPerFloor] = useState(1);
    const [bedsPerRoom, setBedsPerRoom] = useState(1);

    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState("");
    const [addressError, setAddressError] = useState("");
    const [cityError, setCityError] = useState("");
    const [apiError, setApiError] = useState("");

    const handleCreatePG = async () => {

        // Clear previous errors
        setNameError("");
        setAddressError("");
        setCityError("");
        setApiError("");

        let hasError = false;

        // Validate PG name
        if (!name.trim()) {
            setNameError("PG name is required.");
            hasError = true;
        }

        // Validate address
        if (!address.trim()) {
            setAddressError("Address is required.");
            hasError = true;
        }

        // Validate city
        if (!city.trim()) {
            setCityError("City is required.");
            hasError = true;
        }

        // Stop here if validation failed
        if (hasError) {
            return;
        }

        try {

            setLoading(true);

            const data = {
                name: name.trim(),
                address: address.trim(),
                city: city.trim(),
                number_of_floors: floors,
                rooms_per_floor: roomsPerFloor,
                beds_per_room: bedsPerRoom,
            };

            const response = await createPG(data);

            console.log("PG created:", response);

            router.replace("/home");

        } catch (error) {

            console.log("Create PG failed:", error);

            if (error instanceof Error) {
                setApiError(error.message);
            } else {
                setApiError("Failed to create PG.");
            }

        } finally {

            setLoading(false);

        }
    };
    return (
        <View style={styles.container}>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >

                <Text style={styles.title}>
                    Create PG
                </Text>

                <Text style={styles.subtitle}>
                    Set up your property in a few simple steps.
                </Text>

                {/* PG INFORMATION */}

                <Text style={styles.sectionTitle}>
                    PG Information
                </Text>

                {/*PG NAME */}
                <TextInput
                    style={styles.input}
                    placeholder="PG name"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                />
                {nameError !== "" && (
                    <Text style={styles.errorText}>
                        {nameError}
                    </Text>
                )}


                {/*ADRESS INPUT*/}
                <TextInput
                    style={styles.input}
                    placeholder="Address"
                    placeholderTextColor="#94A3B8"
                    value={address}
                    onChangeText={setAddress}
                />
                {addressError !== "" && (
                    <Text style={styles.errorText}>
                        {addressError}
                    </Text>
                )}


                {/*CITY INPUT */}
                <TextInput
                    style={styles.input}
                    placeholder="City"
                    placeholderTextColor="#94A3B8"
                    value={city}
                    onChangeText={setCity}
                />
                {cityError !== "" && (
                    <Text style={styles.errorText}>
                        {cityError}
                    </Text>
                )}



                {/* PROPERTY STRUCTURE */}

                <Text style={styles.sectionTitle}>
                    Property Structure
                </Text>

                <Text style={styles.helperText}>
                    How is your PG arranged?
                </Text>


                {/* Floors */}

                <View style={styles.settingRow}>

                    <View>
                        <Text style={styles.settingTitle}>
                            Floors
                        </Text>
                        <Text style={styles.settingSubtitle}>
                            Number of floors
                        </Text>
                    </View>

                    <View style={styles.stepper}>

                        <Pressable
                            style={styles.stepButton}
                            onPress={() =>
                                setFloors(Math.max(1, floors - 1))
                            }
                        >
                            <Text style={styles.stepText}>−</Text>
                        </Pressable>

                        <Text style={styles.valueText}>
                            {floors}
                        </Text>

                        <Pressable
                            style={styles.stepButton}
                            onPress={() =>
                                setFloors(floors + 1)
                            }
                        >
                            <Text style={styles.stepText}>+</Text>
                        </Pressable>

                    </View>

                </View>


                {/* Rooms */}

                <View style={styles.settingRow}>

                    <View>
                        <Text style={styles.settingTitle}>
                            Rooms per floor
                        </Text>
                        <Text style={styles.settingSubtitle}>
                            Rooms on each floor
                        </Text>
                    </View>

                    <View style={styles.stepper}>

                        <Pressable
                            style={styles.stepButton}
                            onPress={() =>
                                setRoomsPerFloor(
                                    Math.max(1, roomsPerFloor - 1)
                                )
                            }
                        >
                            <Text style={styles.stepText}>−</Text>
                        </Pressable>

                        <Text style={styles.valueText}>
                            {roomsPerFloor}
                        </Text>

                        <Pressable
                            style={styles.stepButton}
                            onPress={() =>
                                setRoomsPerFloor(
                                    roomsPerFloor + 1
                                )
                            }
                        >
                            <Text style={styles.stepText}>+</Text>
                        </Pressable>

                    </View>

                </View>


                {/* Beds */}

                <View style={styles.settingRow}>

                    <View>
                        <Text style={styles.settingTitle}>
                            Beds per room
                        </Text>
                        <Text style={styles.settingSubtitle}>
                            Beds in each room
                        </Text>
                    </View>

                    <View style={styles.stepper}>

                        <Pressable
                            style={styles.stepButton}
                            onPress={() =>
                                setBedsPerRoom(
                                    Math.max(1, bedsPerRoom - 1)
                                )
                            }
                        >
                            <Text style={styles.stepText}>−</Text>
                        </Pressable>

                        <Text style={styles.valueText}>
                            {bedsPerRoom}
                        </Text>

                        <Pressable
                            style={styles.stepButton}
                            onPress={() =>
                                setBedsPerRoom(
                                    bedsPerRoom + 1
                                )
                            }
                        >
                            <Text style={styles.stepText}>+</Text>
                        </Pressable>

                    </View>

                </View>

                <Pressable
                    style={[
                        styles.createButton,
                        loading && styles.disabledButton,
                    ]}
                    onPress={handleCreatePG}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.createButtonText}>
                            Create PG
                        </Text>
                    )}
                </Pressable>

            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },

    content: {
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 40,
    },

    title: {
        fontSize: 30,
        fontWeight: "700",
        color: "#071426",
    },

    subtitle: {
        marginTop: 6,
        fontSize: 14,
        color: "#64748B",
        marginBottom: 32,
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#071426",
        marginBottom: 14,
    },

    helperText: {
        fontSize: 13,
        color: "#64748B",
        marginTop: -6,
        marginBottom: 18,
    },

    input: {
        height: 52,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        color: "#071426",
        marginBottom: 14,
    },

    settingRow: {
        minHeight: 72,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    settingTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#071426",
    },

    settingSubtitle: {
        fontSize: 12,
        color: "#94A3B8",
        marginTop: 3,
    },

    stepper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    stepButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "#172554",
        justifyContent: "center",
        alignItems: "center",
    },

    stepText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "500",
    },

    valueText: {
        minWidth: 20,
        textAlign: "center",
        fontSize: 16,
        fontWeight: "700",
        color: "#071426",
    },

    createButton: {
        height: 54,
        backgroundColor: "#172554",
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
    },

    createButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },

    errorText: {
        color: "#DC2626",
        fontSize: 13,
        marginTop: -4,
        marginBottom: 16,
    },

    disabledButton: {
        opacity: 0.7,
    },

});