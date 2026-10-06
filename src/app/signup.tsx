import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { API_BASE_URL } from "../config/api";



export default function SignupScreen() {
    
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const [nameError, setNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [phoneError, setPhoneError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [signupError, setSignupError] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    

    // function start here 
    const handleSignup = async () => {

        setSignupError("");

        let hasError = false;

        // name validation
        const trimmedName = name.trim();

        if (trimmedName === "") {
            setNameError("Please enter your full name");
            hasError = true;
        } else if (trimmedName.length < 2) {
            setNameError("Name must be at least 2 characters");
            hasError = true;
        } else {
            setNameError("");
        }

        // email validation 
        const trimmedEmail = email.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (trimmedEmail === "") {
            setEmailError("Please enter your email");
            hasError = true;
        } else if (!emailPattern.test(trimmedEmail)) {
            setEmailError("Please enter a valid email");
            hasError = true;    
        } else {
            setEmailError("");
        }

        // phone number validation
        const trimmedPhone = phone.trim();

        if (trimmedPhone === "") {
            setPhoneError("Please enter your phone number");
            hasError = true;
        } else if (!/^\d+$/.test(trimmedPhone)) {
            setPhoneError("Phone number must contain digits only");
            hasError = true;
        } else if (trimmedPhone.length < 10 || trimmedPhone.length > 15) {
            setPhoneError("Phone number must be between 10 and 15 digits");
            hasError = true;
        } else {
            setPhoneError("");
        }

        // password validation
        const trimmedPassword = password.trim();

        if (trimmedPassword === "") {
            setPasswordError("Please enter your password");
            hasError = true;
        } else if (trimmedPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters");
            hasError = true;
        } else if (!/[A-Za-z]/.test(trimmedPassword)) {
            setPasswordError("Password must contain at least one letter");
            hasError = true;
        } else if (!/[0-9]/.test(trimmedPassword)) {
            setPasswordError("Password must contain at least one number");
            hasError = true;
        } else {
            setPasswordError("");
        }

        if (hasError) {
        return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                }, 
                body: JSON.stringify({
                    name: trimmedName,
                    email: trimmedEmail,
                    phone: trimmedPhone,
                    password: trimmedPassword,
                }),
                });

                const data = await response.json();

                if (response.ok) {
                    console.log("4. Signup successful");
                    
                    router.push({
                        pathname: "/login",
                        params: {
                            email: trimmedEmail,
                        },
                    });
                    
                } else {
                    console.log("4. Signup failed:", data);
                    setSignupError(data.detail);
                }
            } catch (error) {
                console.log("ERROR:", error);
                setSignupError("Unable to connect to server");  
            } finally {
                setIsLoading(false);
            }
    };

  return (
    <KeyboardAvoidingView
        style={{ flex: 1 }}
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

                        <Text style={styles.subtitle} >Create Your Account</Text>

                        <TextInput 
                            style={styles.input}
                            placeholder="Full name"
                            placeholderTextColor="#64748B"
                            value={name}
                            autoCapitalize="words"
                            onChangeText={(text) => {
                                setName(text);
                                setNameError("");
                            }}
                        />
                        { nameError !== "" &&  <Text style={styles.error}>{nameError}</Text> }

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
                        {emailError !== "" && <Text style={styles.error}>{emailError}</Text>}

                        <TextInput
                            style={styles.input}
                            placeholder="Phone number"
                            placeholderTextColor="#64748B"
                            value={phone}
                            keyboardType="phone-pad"
                            onChangeText={(text) => {
                                setPhone(text);
                                setPhoneError("");
                            }}
                        />
                        {phoneError !== "" && <Text style={styles.error} >{phoneError}</Text>}

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
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off" : "eye"}
                                    size={24}
                                    color="#0d263d"
                                />
                            </TouchableOpacity>

                        </View>
                        {passwordError !== "" && <Text style={styles.error} >{passwordError}</Text>}
                        
                        {signupError !== "" && <Text style={styles.error} >{signupError}</Text>}
                        
                        <TouchableOpacity
                            style={styles.button} 
                            onPress={handleSignup}
                            disabled={isLoading}
                            >
                            
                            {isLoading ? (
                                <ActivityIndicator  color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText} >Sign Up</Text>
                            )}

                        </TouchableOpacity> 

                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={() => router.push("/login")}
                        >
                            <Text style={styles.loginNormalText}>
                                Already have an account?{" "}
                                <Text style={styles.loginText}>
                                    Login
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
    container: {
        flexGrow: 1,
        backgroundColor: "#FFFFFF",
    },

    form: {
        width: "100%",
        maxWidth: 450,
        alignSelf: "center",
        paddingBottom: 40,
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

    error: {
        marginBottom: 10,
        fontSize: 13,
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

    image: {
        width: "100%",
        height: 260,
        borderRadius: 20,
    },

    card:{
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 10,
        marginHorizontal: 0,
        marginTop: -30,
    },

    imageSection: {
        position: "relative",
    },

    passwordContainer: {
        width: "100%",
        height: 52,
        marginBottom: 12,
        position: "relative",
    },

    passwordInput: {
        width: "100%",
        height: 52,
        borderColor: "#D9DEE7",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingRight: 45,
        backgroundColor: "#F8FAFC",
        fontSize: 16,
        color: "#1E293B",
    },

    eyeButton: {
        position: "absolute",
        right: 12,
        height: 52,
        justifyContent: "center",
        alignItems: "center",
    },

    loginLink: {
        alignSelf: "center",
        marginTop: 18,
        paddingVertical: 10,
    },

    loginNormalText: {
        fontSize: 14,
        color: "#64748B",
    },

    loginText: {
        color: "#0d263d",
        fontSize: 14,
        fontWeight: "700",
    },
});