import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, } from "react-native";

type PropertyCardProps = {
  pgId: string;
  name: string;
  address: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  onPress: () => void;
};

export default function PropertyCard({
    pgId,
    name,
    address,
    totalRooms,
    totalBeds,
    occupiedBeds,
    availableBeds,
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

            <Text style={styles.pgName}>
                {name}
            </Text>

            <Text style={styles.address}>
                {address}
            </Text>

            <View style={styles.propertyStats}>

                {/* Total rooms */}
                <View style={styles.statItem}>
                    <MaterialCommunityIcons
                        name="door-closed"
                        size={15}
                        color="#071426"
                    />
                    <Text style={styles.statText}>
                        {totalRooms}
                    </Text>
                </View>

                {/* Total beds */}
                <View style={styles.statItem}>
                    <Ionicons
                        name="bed-outline"
                        size={14}
                        color="#071426"
                    />
                    <Text style={styles.statText}>
                        {totalBeds}
                    </Text>
                </View>

                {/* Occupied beds */}
                <View style={styles.statItem}>
                    <Ionicons
                        name="ellipse"
                        size={9}
                        color="#071426"
                    />
                    <Text style={styles.statText}>
                        {occupiedBeds}
                    </Text>
                </View>

                {/* Available beds */}
                <View style={styles.statItem}>
                    <Ionicons
                        name="ellipse-outline"
                        size={9}
                        color="#071426"
                    />
                    <Text style={styles.statText}>
                        {availableBeds}
                    </Text>
                </View>

            </View>
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
    // Property Statistics
    // =========================
    propertyStats: {
        flexDirection: "row",
        alignItems: "center",
        gap: 35,
    },

    statText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#071426",
    },

    // =========================
    // Individual Property Stat
    // =========================
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },


    // =========================
    // Card Press Animation
    // =========================
    cardPressed: {
        opacity: 0.75,
        transform: [{ scale: 0.98 }],
    },

});


