import { Pressable, StyleSheet, Text } from "react-native";

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
    <Pressable style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >

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

    </Pressable>
  );
}


const styles = StyleSheet.create({
    card: {
        backgroundColor: "#E9EEF3",
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#D8E0E8",
    },

    pgId: {
        position: "absolute",
        top: 16,
        right: 18,
        fontSize: 11,
        fontWeight: "600",
        color: "#8A929D",
    },

    pgName: {
        fontSize: 20,
        fontWeight: "700",
        color: "#071426",
        marginBottom: 5,
    },

    address: {
        fontSize: 13,
        color: "#727B86",
        marginBottom: 15,
    },

    totalRooms: {
        fontSize: 14,
        fontWeight: "600",
        color: "#071426",
    },
    cardPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },

});