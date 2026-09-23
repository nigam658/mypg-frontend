import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { getTenantByBedId, updateTenant, } from "../../../services/tenant";

export default function EditTenant() {

    const { bedId, roomId, roomNumber } = useLocalSearchParams<{
        bedId: string;
        roomId: string;
        roomNumber: string;
    }>();

    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [gender, setGender] = useState("");
    const [rent, setRent] = useState("");
    const [securityDeposit, setSecurityDeposit] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [emergencyPhone, setEmergencyPhone] = useState("");
    const [aadhaar, setAadhaar] = useState("");
    const [checkInDate, setCheckInDate] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const genderOptions = ["MALE", "FEMALE", "OTHER"];

    const [saving, setSaving] = useState(false);
    const [tenantData, setTenantData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // error validation states
    const [nameError, setNameError] = useState("");
    const [rentError, setRentError] = useState("");
    const [securityDepositError, setSecurityDepositError] = useState("");
    const [phoneError, setPhoneError] = useState("");
    const [emergencyPhoneError, setEmergencyPhoneError] = useState("");
    const [aadhaarError, setAadhaarError] = useState("");
    const [addressError, setAddressError] = useState("");
    const [checkInDateError, setCheckInDateError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");


    // it track which field is changed 
    const buildChangedFields = () => {

        if (!tenantData) {
            return {};
        }

        const changedFields: any = {};

        if (fullName.trim() !== tenantData.tenant.full_name) {
            changedFields.full_name = fullName.trim();
        }

        if (phone.trim() !== tenantData.tenant.phone) {
            changedFields.phone = phone.trim();
        }

        if (gender !== tenantData.tenant.gender) {
            changedFields.gender = gender;
        }

        if (
            address.trim() !==
            (tenantData.tenant.permanent_address || "")
        ) {
            changedFields.permanent_address = address.trim() || null;
        }

        if (
            emergencyPhone.trim() !==
            (tenantData.tenant.emergency_contact_phone || "")
        ) {
            changedFields.emergency_contact_phone =
                emergencyPhone.trim() || null;
        }

        const aadhaarNumber = aadhaar.replace(/\D/g, "");
        if (
            aadhaarNumber !==
            (tenantData.tenant.aadhaar_number || "")
        ) {
            changedFields.aadhaar_number = aadhaarNumber || null;
        }

        if (
            checkInDate !==
            tenantData.allocation.check_in_date
        ) {
            changedFields.check_in_date = checkInDate;
        }

        if (
            Number(rent) !==
            Number(tenantData.allocation.rent)
        ) {
            changedFields.rent = Number(rent);
        }

        if (
            Number(securityDeposit) !==
            Number(tenantData.allocation.security_deposit)
        ) {
            changedFields.security_deposit =
                Number(securityDeposit);
        }

        return changedFields;
    };

    const formatAadhaar = (text: string) => {
        // Remove everything except numbers
        const numbers = text.replace(/\D/g, "");

        // Maximum 12 digits
        const limited = numbers.slice(0, 12);

        // Add hyphens after every 4 digits
        return limited.replace(/(\d{4})(?=\d)/g, "$1-");
    };


    const handleSave = async () => {
        try {
            setSaving(true);
            
            // name validation
            if (fullName.trim().length < 2) {
                setNameError("Name must be at least 2 characters.");
                setSaving(false);
                return;
            }
            setNameError("");
            
            // rent validation
            if (!rent.trim() || Number(rent) <= 0) {
                setRentError("Rent must be greater than 0");
                setSaving(false);
                return;
            }
            setRentError("");

            // security deposit validation
            if (securityDeposit.trim() && Number(securityDeposit) < 0) {
                setSecurityDepositError("Cannot be negative");
                setSaving(false);
                return;
            }
            setSecurityDepositError("");

            // Phone validation
            if (!phone.trim()) {
                setPhoneError("Phone number is required");
                setSaving(false);
                return;
            }

            if (!/^\d{10,15}$/.test(phone.trim())) {
                setPhoneError("Enter a valid number");
                setSaving(false);
                return;
            }
            setPhoneError("");

            // Emergencyphone number validation
            if (
                emergencyPhone.trim() &&
                !/^\d{10,15}$/.test(emergencyPhone.trim())
            ) {
                setEmergencyPhoneError("Enter a valid number");
                setSaving(false);
                return;
            }
            setEmergencyPhoneError("");


            // Aadhaar validation
            const aadhaarNumber = aadhaar.replace(/\D/g, "");

            if (
                aadhaarNumber &&
                !/^\d{12}$/.test(aadhaarNumber)
            ) {
                setAadhaarError("Enter a valid Aadhaar number");
                setSaving(false);
                return;
            }

            setAadhaarError("");

            // calender validation
            if (!checkInDate.trim()) {
                setCheckInDateError("Check-in date is required");
                setSaving(false);
                return;
            }

            const selectedDate = new Date(checkInDate);

            if (isNaN(selectedDate.getTime())) {
                setCheckInDateError("Enter a valid date");
                setSaving(false);
                return;
            }

            setCheckInDateError("");

            const changedFields = buildChangedFields();

            if (Object.keys(changedFields).length === 0) {
                console.log("No changes made.");
                return;
            }

            console.log(
                "Sending only changed fields:",
                changedFields
            );

            const result = await updateTenant(
                tenantData.tenant.id,
                changedFields
            );

            console.log(result.message);

            router.replace({
                pathname: "/room/[roomId]",
                params: {
                    roomId,
                    roomNumber,
                    success: "Tenant updated successfully",
                },
            });

        } catch (error: any) {

            console.log(
                "Update error:",
                error.message || error
            );

        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {

        const loadTenant = async () => {

            try {
                setLoading(true);

                const data = await getTenantByBedId(
                    Number(bedId)
                );

                setTenantData(data);

                setFullName(data.tenant.full_name ?? "");
                setGender(data.tenant.gender ?? "MALE");

                setRent(String(data.allocation.rent ?? ""));
                setSecurityDeposit(
                    String(data.allocation.security_deposit ?? "")
                );

                setAddress(data.tenant.permanent_address ?? "");
                setPhone(data.tenant.phone ?? "");
                setEmergencyPhone(
                    data.tenant.emergency_contact_phone ?? ""
                );
                setAadhaar(
                    formatAadhaar(data.tenant.aadhaar_number ?? "")
                );
                setCheckInDate(data.allocation.check_in_date ?? "");

            } catch (error: any) {

                setError(
                    error.message || "Failed to load tenant."
                );

            } finally {

                setLoading(false);

            }
        };

        if (bedId) {
            loadTenant();
        }

    }, [bedId]);


    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text>Loading tenant...</Text>
            </View>
        );
    }


    if (error) {
        return (
            <View style={styles.center}>
                <Text>{error}</Text>
            </View>
        );
    }


    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >


                <Text style={styles.title}>
                    Edit Tenant
                </Text>

                {/* Name + Gender */}
                <View style={styles.row}>

                    <View style={styles.halfField}>
                        <Text style={styles.label}>
                            Name
                        </Text>

                        <View style={styles.inputWrapper}>

                            <TextInput
                                style={[
                                    styles.input,
                                    nameError && styles.inputWithError,
                                ]}
                                value={fullName}
                                onChangeText={(text) => {
                                    setFullName(text);
                                    setNameError("");
                                }}
                            />

                            {nameError ? (
                                <Text
                                    style={styles.errorInside}
                                    numberOfLines={1}
                                >
                                    {nameError}
                                </Text>
                            ) : null}

                        </View>
                    </View>

                    <View style={styles.halfField}>
                        <Text style={styles.label}>
                            Gender
                        </Text>

                        <Pressable
                            style={styles.input}
                            onPress={() => {
                                const currentIndex = genderOptions.indexOf(gender);

                                const nextIndex =
                                    (currentIndex + 1) % genderOptions.length;

                                setGender(genderOptions[nextIndex]);
                            }}
                        >
                            <Text style={styles.genderText}>
                                {gender}
                            </Text>

                            <Text style={styles.arrow}>
                                ▼
                            </Text>
                        </Pressable>
                    </View>

                </View>


                {/* Rent + Security Deposit */}
                <View style={styles.row}>

                    <View style={styles.halfField}>
                        <Text style={styles.label}>
                            Rent
                        </Text>

                        <View style={styles.inputWrapper}>

                            <TextInput
                                style={[
                                    styles.input,
                                    rentError && styles.inputWithError,
                                ]}
                                value={rent}
                                onChangeText={(text) => {
                                    setRent(text);
                                    setRentError("");
                                }}
                                keyboardType="numeric"
                            />

                            {rentError ? (
                                <Text
                                    style={styles.errorInside}
                                    numberOfLines={1}
                                >
                                    {rentError}
                                </Text>
                            ) : null}

                        </View>
                    </View>

                    <View style={styles.halfField}>
                        <Text style={styles.label}>
                            Security Deposit
                        </Text>

                        <View style={styles.inputWrapper}>

                            <TextInput
                                style={[
                                    styles.input,
                                    securityDepositError && styles.inputWithError,
                                ]}
                                value={securityDeposit}
                                onChangeText={(text) => {
                                    setSecurityDeposit(text);
                                    setSecurityDepositError("");
                                }}
                                keyboardType="numeric"
                            />

                            {securityDepositError ? (
                                <Text
                                    style={styles.errorInside}
                                    numberOfLines={1}
                                >
                                    {securityDepositError}
                                </Text>
                            ) : null}

                        </View>
                    </View>

                </View>


                <Text style={styles.label}>
                    Address
                </Text>

                <View style={styles.inputWrapper}>

                    <TextInput
                        style={[
                            styles.input,
                            addressError && styles.inputWithError,
                        ]}
                        value={address}
                        onChangeText={(text) => {
                            setAddress(text);
                            setAddressError("");
                        }}
                    />

                    {addressError ? (
                        <Text
                            style={styles.errorInside}
                            numberOfLines={1}
                        >
                            {addressError}
                        </Text>
                    ) : null}

                </View>

                {/*Phone */}
                <Text style={styles.label}>
                    Phone
                </Text>

                <View style={styles.inputWrapper}>

                    <TextInput
                        style={[
                            styles.input,
                            phoneError && styles.inputWithError,
                        ]}
                        value={phone}
                        onChangeText={(text) => {
                            setPhone(text);
                            setPhoneError("");
                        }}
                        keyboardType="phone-pad"
                    />

                    {phoneError ? (
                        <Text
                            style={styles.errorInside}
                            numberOfLines={1}
                        >
                            {phoneError}
                        </Text>
                    ) : null}

                </View>

                {/*Emergency Phone */}
                <Text style={styles.label}>
                    Emergency Phone
                </Text>

                <View style={styles.inputWrapper}>
                    <TextInput
                        style={[
                            styles.input,
                            emergencyPhoneError && styles.inputWithError,
                        ]}
                        value={emergencyPhone}
                        onChangeText={(text) => {
                            setEmergencyPhone(text);
                            setEmergencyPhoneError("");
                        }}
                        keyboardType="phone-pad"
                    />

                    {emergencyPhoneError ? (
                        <Text
                            style={styles.errorInside}
                            numberOfLines={1}
                        >
                            {emergencyPhoneError}
                        </Text>
                    ) : null}
                </View>


                <Text style={styles.label}>
                    Aadhaar Number
                </Text>

                <View style={styles.inputWrapper}>
                    <TextInput
                        style={[
                            styles.input,
                            aadhaarError && styles.inputWithError,
                        ]}
                        value={aadhaar}
                        placeholder="XXXX-XXXX-XXXX"
                        onChangeText={(text) => {
                            setAadhaar(formatAadhaar(text));
                            setAadhaarError("");
                        }}
                        keyboardType="numeric"
                        maxLength={14}
                    />

                    {aadhaarError ? (
                        <Text
                            style={styles.errorInside}
                            numberOfLines={1}
                        >
                            {aadhaarError}
                        </Text>
                    ) : null}
                </View>


                <Text style={styles.label}>
                    Check-in Date
                </Text>

                <View style={styles.inputWrapper}>

                    <Pressable
                        style={styles.input}
                        onPress={() => {
                            setCheckInDateError("");
                            setShowDatePicker(true);
                        }}
                    >
                        <View style={styles.dateRow}>

                            <Ionicons
                                name="calendar-outline"
                                size={20}
                                color="#475569"
                            />

                            <Text style={styles.dateText}>
                                {checkInDate || "Select date"}
                            </Text>

                        </View>
                    </Pressable>

                    {checkInDateError ? (
                        <Text
                            style={styles.errorInside}
                            numberOfLines={1}
                        >
                            {checkInDateError}
                        </Text>
                    ) : null}

                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={
                            checkInDate
                                ? new Date(checkInDate)
                                : new Date()
                        }
                        mode="date"
                        display="default"
                        onValueChange={(event, selectedDate) => {

                            if (selectedDate) {

                                const year = selectedDate.getFullYear();

                                const month = String(
                                    selectedDate.getMonth() + 1
                                ).padStart(2, "0");

                                const day = String(
                                    selectedDate.getDate()
                                ).padStart(2, "0");

                                setCheckInDate(
                                    `${year}-${month}-${day}`
                                );

                                setCheckInDateError("");
                            }
                        }}
                        onDismiss={() => {
                            setShowDatePicker(false);
                        }}
                    />
                )}

                {successMessage ? (
                    <Text style={styles.successMessage}>
                        {successMessage}
                    </Text>
                ) : null}

                <Pressable
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            Save Changes
                        </Text>
                    )}
                </Pressable>
            </ScrollView>
         </KeyboardAvoidingView>
        
    );
}


const styles = StyleSheet.create({

    container: {
        padding: 20,
        paddingBottom: 40,
        backgroundColor: "#F8FAFC",
    },
    
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    inputWrapper: {
        position: "relative",
    },

    inputWithError: {
        height: 58,
        paddingBottom: 24,
    },

    errorInside: {
        position: "absolute",
        left: 12,
        bottom: 7,
        fontSize: 10,
        color: "#DC2626",
    },

    title: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 20,
    },

    row: {
        flexDirection: "row",
        gap: 12,    
    },

    halfField: {
        flex: 1,
    },

    genderText: {
        fontSize: 15,
        color: "#0F172A",
    },

    arrow: {
        position: "absolute",
        right: 12,
        fontSize: 12,
        color: "#475569",
    },

    dropdown: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        marginTop: 4,
        overflow: "hidden",
    },

    option: {
        paddingVertical: 12,
        paddingHorizontal: 12,
    },

    optionText: {
        fontSize: 15,
        color: "#0F172A",
    },

    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
        marginTop: 12,
    },

    input: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#FFFFFF",
        fontSize: 15,
        color: "#0F172A",
    },
    saveButton: {
        marginTop: 24,
        backgroundColor: "#0F172A",
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: "center",
    },

    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },

    successMessage: {
        textAlign: "center",
        color: "#16A34A",
        fontSize: 13,
        fontWeight: "600",
        marginTop: 16,
    },

    dateText: {
        fontSize: 15,
        color: "#0F172A",
    },

    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

});