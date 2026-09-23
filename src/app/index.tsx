import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
    checkAccessToken,
    refreshAccessToken,
} from "../services/auth";

export default function IndexScreen() {
    const router = useRouter();

    const [isChecking, setIsChecking] = useState(true);
    const [networkError, setNetworkError] = useState(false);

    useEffect(() => {
        checkAuthentication();
    }, []);

    const checkAuthentication = async () => {
        try {

            // First, check whether the existing
            // access token is still valid.
            await checkAccessToken();

            console.log("Access token is valid");

            // Access token is valid → Home
            router.replace("/home");

        } catch (error) {

            // Access token is missing or expired
            if (
                error instanceof Error &&
                (
                    error.message === "ACCESS_TOKEN_MISSING" ||
                    error.message === "ACCESS_TOKEN_EXPIRED"
                )
            ) {

                try {

                    // Try to get a new access token
                    // using the refresh token.
                    await refreshAccessToken();

                    console.log("Access token refreshed");

                    // Refresh successful → Home
                    router.replace("/home");

                } catch (refreshError) {

                    console.log(
                        "Refresh failed:",
                        refreshError
                    );

                    // Refresh token is invalid,
                    // expired, or unavailable → Login
                    router.replace("/login");
                }

            } else {

                // Network error
                if (
                    error instanceof Error &&
                    error.message === "NETWORK_ERROR"
                ) {
                    setNetworkError(true);
                    setIsChecking(false);
                    return;
                }

                // Other unexpected errors
                console.log(
                    "Authentication check failed:",
                    error
                );

                setIsChecking(false);
            }
        }
    };

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {networkError ? (
                <>
                    <Text
                        style={{
                            fontSize: 22,
                            fontWeight: "700",
                            color: "#071426",
                        }}
                    >
                        Unable to connect
                    </Text>

                    <Text
                        style={{
                            marginTop: 8,
                            fontSize: 14,
                            color: "#64748B",
                        }}
                    >
                        Please check your internet connection.
                    </Text>

                    <Pressable
                        style={{
                            marginTop: 20,
                            backgroundColor: "#071426",
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 10,
                        }}
                        onPress={() => {
                            setNetworkError(false);
                            setIsChecking(true);
                            checkAuthentication();
                        }}
                    >
                        <Text
                            style={{
                                color: "#FFFFFF",
                                fontSize: 14,
                                fontWeight: "600",
                            }}
                        >
                            Retry
                        </Text>
                    </Pressable>
                </>
            ) : (
                <Text>Checking authentication...</Text>
            )}
        </View>
    );
}