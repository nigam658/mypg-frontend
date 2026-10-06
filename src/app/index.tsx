import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import {
    checkAccessToken,
    refreshAccessToken,
} from "../services/auth";

export default function IndexScreen() {
    const router = useRouter();

    const [isChecking, setIsChecking] = useState(true);
    const [networkError, setNetworkError] = useState(false);
    const [authError, setAuthError] = useState(false);

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

                    // Refresh token is genuinely invalid or expired.
                    // The current session cannot be restored.
                    if (
                        refreshError instanceof Error &&
                        refreshError.message === "REFRESH_TOKEN_EXPIRED"
                    ) {
                        // The refresh token is no longer valid.
                        // The existing session cannot be restored.
                        await SecureStore.deleteItemAsync("access_token");
                        await SecureStore.deleteItemAsync("refresh_token");

                        router.replace("/login");
                        return;
                    }

                    // Network/server/unexpected refresh errors
                    // should NOT send the owner to Login.
                    setAuthError(true);
                    setIsChecking(false);

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

                setAuthError(true);
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
            ) : authError ? (
                <>
                    <Text
                        style={{
                            fontSize: 22,
                            fontWeight: "700",
                            color: "#071426",
                            textAlign: "center",
                        }}
                    >
                        We couldn't verify your account
                    </Text>

                    <Text
                        style={{
                            marginTop: 8,
                            fontSize: 14,
                            color: "#64748B",
                            textAlign: "center",
                        }}
                    >
                        Please try again.
                    </Text>

                    {/* Retry button */}
                    <Pressable
                        style={{
                            marginTop: 20,
                            backgroundColor: "#071426",
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 10,
                        }}
                        onPress={() => {
                            setAuthError(false);
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

                    {/* Log in again button */}
                    <Pressable
                        style={{
                            marginTop: 12,
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: "#071426",
                        }}
                        onPress={async () => {
                            // Remove the current authentication tokens.
                            await SecureStore.deleteItemAsync("access_token");
                            await SecureStore.deleteItemAsync("refresh_token");

                            // Send the owner to the Login screen.
                            router.replace("/login");

                        }}
                    >
                        <Text
                            style={{
                                color: "#071426",
                                fontSize: 14,
                                fontWeight: "600",
                            }}
                        >
                            Log in again
                        </Text>
                    </Pressable>
                </>
            ) : (
                <Image
                    source={require("../../assets/images/NGPGnew.png")}
                    style={{
                        width: 160,
                        height: 160,
                        borderRadius: 50,
                        resizeMode: "cover",
                    }}
                />
            )}
        </View>
    );
}