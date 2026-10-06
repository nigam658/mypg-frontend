import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function PropertyCardSkeleton() {
    // Controls the shimmer animation.
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Create a continuous shimmer animation.
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 900,
                    useNativeDriver: true,
                }),

                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 900,
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();

        // Stop animation when the component is removed.
        return () => {
            animation.stop();
        };
    }, [shimmer]);

    // Convert animation value into opacity.
    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.45, 1],
    });

    return (
        <View style={styles.card}>

            {/* Skeleton for building icon */}
            <Animated.View
                style={[
                    styles.iconSkeleton,
                    { opacity },
                ]}
            />

            {/* Skeleton for building information */}
            <View style={styles.info}>

                {/* PG name */}
                <Animated.View
                    style={[
                        styles.nameSkeleton,
                        { opacity },
                    ]}
                />

                {/* Address */}
                <Animated.View
                    style={[
                        styles.addressSkeleton,
                        { opacity },
                    ]}
                />

                {/* Total rooms */}
                <Animated.View
                    style={[
                        styles.roomsSkeleton,
                        { opacity },
                    ]}
                />

            </View>

        </View>
    );
}

const styles = StyleSheet.create({

    // Main skeleton card
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E5E9",

        flexDirection: "row",
        alignItems: "center",
    },

    // Skeleton for the building icon
    iconSkeleton: {
        width: 62,
        height: 62,
        borderRadius: 12,
        backgroundColor: "#E2E5E9",
    },

    // Information area
    info: {
        flex: 1,
        marginLeft: 12,
    },

    // Skeleton for PG name
    nameSkeleton: {
        width: "65%",
        height: 20,
        borderRadius: 6,
        backgroundColor: "#E2E5E9",
        marginBottom: 8,
    },

    // Skeleton for address
    addressSkeleton: {
        width: "85%",
        height: 13,
        borderRadius: 5,
        backgroundColor: "#E2E5E9",
        marginBottom: 14,
    },

    // Skeleton for total rooms
    roomsSkeleton: {
        width: "40%",
        height: 14,
        borderRadius: 5,
        backgroundColor: "#E2E5E9",
    },
});