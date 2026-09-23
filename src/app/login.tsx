import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../config/api";


export default function LoginScreen() {

    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const logoutForTesting = async () => {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");

        console.log("Tokens deleted");
    };
    const insets = useSafeAreaInsets();

    const handleLogin = async () => {

        let hasError = false;

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (trimmedEmail === "") {
            setEmailError("Please enter your email");
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setEmailError("Please enter a valid email");
            hasError = true;
        } else {
            setEmailError("");
        }

        if (trimmedPassword === "") {
            setPasswordError("Please enter your password");
            hasError = true;
        } else {
            setPasswordError("");
        }

        if (hasError) {
            return;
        }
        setIsLoading(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: trimmedEmail,
                        password: trimmedPassword,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                await SecureStore.setItemAsync(
                    "access_token",
                    data.access_token
                );

                await SecureStore.setItemAsync(
                    "refresh_token",
                    data.refresh_token
                );

                console.log("Login successful");
                
                router.replace("/home");

            } else {
                setEmailError(data.detail);
            }

        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    };

    return (

        <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >

            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.container}
            >

                <View style={styles.form}>

                    <View style={styles.imageSection}>

                        <Image
                            source={require("../../assets/MYPGIMG.png")}
                            style={styles.image}
                            resizeMode="contain"
                        />

                        <View style={styles.card}>

                            <Text style={styles.subtitle}>
                                Welcome Back
                            </Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#64748B"
                                value={email}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setEmailError("");
                                }}
                            />

                            {emailError !== "" && (
                                <Text style={styles.error}>
                                    {emailError}
                                </Text>
                            )}

                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Password"
                                    placeholderTextColor="#64748B"
                                    value={password}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        setPasswordError("");
                                    }}
                                />

                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={22}
                                        color="#64748B"
                                    />
                                </TouchableOpacity>
                            </View>

                            {passwordError !== "" && (
                                <Text style={styles.error}>
                                    {passwordError}
                                </Text>
                            )}

                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleLogin}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>
                                        LOGIN 
                                    </Text>
                                )}
                            </TouchableOpacity> 

                            <TouchableOpacity
                                style={styles.signupLink}
                                onPress={() => router.push("/signup")}
                            >
                                <Text style={styles.signupNormalText}>
                                    Don't have an account?{" "}
                                    <Text style={styles.signupText}>
                                        Sign Up 
                                    </Text>
                                </Text>
                            </TouchableOpacity>

                        </View>

                    </View>

                </View>

            </ScrollView>

        </KeyboardAvoidingView>
    );
}
const styles = StyleSheet.create({

    keyboardView: {
        flex: 1,
    },

    container: {
        flexGrow: 1,
        backgroundColor: "#FFFFFF",
        paddingTop: 0,
    },

    form: {
        width: "100%",
        maxWidth: 450,
        alignSelf: "center",
        paddingBottom: 40,
    },

    imageSection: {
        position: "relative",
    },

    image: {
        width: "100%",
        height: 260,
        borderRadius: 20,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 10,
        marginTop: -30,
    },

    subtitle: {
        fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 24,
    },

    input: {
        width: "100%",
        height: 52,
        borderColor: "#D9DEE7",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        backgroundColor: "#F8FAFC",
        marginBottom: 12,
        fontSize: 16,
        color: "#1E293B",
    },

    passwordContainer: {
        width: "100%",
        height: 52,
        flexDirection: "row",
        alignItems: "center",
        borderColor: "#D9DEE7",
        borderWidth: 1,
        borderRadius: 14,
        backgroundColor: "#F8FAFC",
        marginBottom: 12,
    },

    passwordInput: {
        flex: 1,
        height: "100%",
        paddingHorizontal: 12,
        fontSize: 16,
        color: "#1E293B",
    },

    eyeButton: {
        height: "100%",
        paddingHorizontal: 14,
        justifyContent: "center",
        alignItems: "center",
    },

    error: {
        marginBottom: 10,
        fontSize: 13,
        color: "red",
    },

    button: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 14,
        backgroundColor: "#0d263d",
    },

    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },

    signupLink: {
        alignSelf: "center",
        marginTop: 18,
        paddingVertical: 10,
    },

    signupNormalText: {
        fontSize: 14,
        color: "#64748B",
    },

    signupText: {
        color: "#0d263d",
        fontSize: 14,
        fontWeight: "700",
    },
});