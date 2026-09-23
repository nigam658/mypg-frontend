import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native";
import { API_BASE_URL } from "../config/api";


export default function OtpScreen() {

    const { email } = useLocalSearchParams();

    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (resendTimer <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setResendTimer((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [resendTimer]);

    const handleVerifyOtp =  async () => {

        let hasError = false;

        const trimmedOtp = otp.trim();

        if (trimmedOtp === "") {
            setOtpError("Please enter the OTP");
            hasError = true;
        } else if (!/^\d+$/.test(trimmedOtp)) {
            setOtpError("OTP must contain digits only");
            hasError = true;
        } else if (trimmedOtp.length !== 6) {
            setOtpError("OTP must be exactly 6 digits");
            hasError = true;
        } else {
            setOtpError("");
        }

        if (hasError) {
            return;
        }
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email,
                    otp: trimmedOtp,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                router.replace("/login");
            } else {
                setOtpError(data.detail);
            }

        } catch (error) {
            setOtpError("Unable to connect to server");

        } finally {
            setIsLoading(false);
        }
    };

    // ressend otp
    const handleResendOtp = async () => {

    setIsResending(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/resend-otp`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email,
                }),
            }
        );

        const data = await response.json();

        if (response.ok) {
            setResendTimer(30);
        } else {
            setOtpError(data.detail);
        }

    } catch (error) {
        setOtpError("Unable to connect to server");

    } finally {
        setIsResending(false);
    }
};

    return (
        <View style={styles.container}>

            <Text style={styles.title}>
                OTP Verification
            </Text>

            <Text style={styles.subtitle}>
                Enter the 6-digit code sent to
            </Text>

            <Text style={styles.email}>
                {email}
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                placeholderTextColor="#64748B"
                value={otp}
                onChangeText={(text) => {
                    setOtp(text);
                    setOtpError("");
                }}
                keyboardType="number-pad"
                maxLength={6}
            />

            {otpError !== "" && (
                <Text style={styles.error}>
                    {otpError}
                </Text>
            )}

            <TouchableOpacity
                style={styles.button}
                onPress={handleVerifyOtp}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>
                        Verify OTP
                    </Text>
                )}
            </TouchableOpacity>

            <Text style={styles.resendText}>
                Didn't receive the code?
            </Text>

            <TouchableOpacity
                onPress={handleResendOtp}
                disabled={isResending || resendTimer > 0}
            >
                <Text style={styles.resendButton}>
                    {isResending
                        ? "Sending..."
                        : resendTimer > 0
                        ? `Resend OTP in ${resendTimer}s`
                        : "Resend OTP"}
                </Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#FFFFFF",
    },

    title: {
        fontSize: 24,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 10,
    },

    subtitle: {
        fontSize: 15,
        textAlign: "center",
        color: "#64748B",
    },

    email: {
        fontSize: 15,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 4,
        marginBottom: 40,
    },

    input: {
        width: "100%",
        height: 58,
        borderColor: "#D9DEE7",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        backgroundColor: "#F8FAFC",
        fontSize: 20,
        color: "#1E293B",
        textAlign: "center",
        letterSpacing: 6,
    },

    error: {
        marginTop: 8,
        fontSize: 13,
        color: "#DC2626",
        textAlign: "center",
    },

    button: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 18,
        backgroundColor: "#0d263d",
    },

    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
        resendText: {
        textAlign: "center",
        marginTop: 20,
        fontSize: 14,
        color: "#64748B",
    },

    resendButton: {
        textAlign: "center",
        marginTop: 6,
        fontSize: 15,
        fontWeight: "600",
        color: "#0d263d",
    },
});