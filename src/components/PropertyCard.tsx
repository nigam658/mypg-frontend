import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, } from "react-native";

type PropertyCardProps = {
  pgId: string;
  name: string;
  address: string;
  totalRooms: number;
  onPress: () => void;
};

export default function PropertyCard({
    pgId,
    name,
    address,
    totalRooms,
    onPress,
    }: PropertyCardProps) {

    return (
        <Pressable
        style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed,
        ]}
        onPress={onPress}
        >
        {/* Building Icon */}
        <View style={styles.iconBox}>
            <Ionicons
                name="business-outline"
                size={28}
                color="#4A5B6A"
            />
        </View>

        {/* Building Information */}
        <View style={styles.info}>
            <Text style={styles.pgId}>
                {pgId}
            </Text>

            <Text style={styles.pgName}>
                {name}
            </Text>

            <Text style={styles.address}>
                {address}
            </Text>

            <Text style={styles.totalRooms}>
                {totalRooms} Rooms
            </Text>
        </View>
        </Pressable>
        );
}

const styles = StyleSheet.create({

    // =========================
    // Main Property Card
    // =========================
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,

        // Subtle card border
        borderWidth: 1,
        borderColor: "#E5E8EC",

        // Place icon and information side by side
        flexDirection: "row",
        alignItems: "center",

        // Allows PG ID to be positioned relative to the card
        position: "relative",
    },


    // =========================
    // Building Icon Container
    // =========================
    iconBox: {
        width: 62,
        height: 62,
        borderRadius: 12,

        // Soft background behind the building icon
        backgroundColor: "#EAF0F5",

        justifyContent: "center",
        alignItems: "center",
    },


    // =========================
    // Building Information
    // =========================
    info: {
        flex: 1,
        marginLeft: 12,
    },


    // =========================
    // PG ID
    // =========================
    pgId: {
        position: "absolute",
        right: 14,
        bottom: 10,

        fontSize: 11,
        fontWeight: "600",
        color: "#8A929D",
    },


    // =========================
    // PG Name
    // =========================
    pgName: {
        fontSize: 20,
        fontWeight: "700",
        color: "#071426",
        marginBottom: 5,
    },


    // =========================
    // PG Address
    // =========================
    address: {
        fontSize: 13,
        color: "#727B86",
        marginBottom: 15,
    },


    // =========================
    // Total Rooms
    // =========================
    totalRooms: {
        fontSize: 14,
        fontWeight: "600",
        color: "#071426",
    },


    // =========================
    // Card Press Animation
    // =========================
    cardPressed: {
        opacity: 0.75,
        transform: [{ scale: 0.98 }],
    },

});


