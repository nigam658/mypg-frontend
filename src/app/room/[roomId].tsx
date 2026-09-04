import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

import { deleteBed, getBedsByRoomId } from "@/services/bed";
import { addTenant, getTenantByBedId, removeTenant } from "@/services/tenant";


type Bed = {
    bed_id: number;
    bed_number: string;
    status: string;
    rent: number | null;
    tenant: {
        tenant_id: number;
        full_name: string;
    } | null;
};


export default function RoomPage() {

    // Get room ID from the navigation parameters
    const { roomId, roomNumber, success } = useLocalSearchParams<{
        roomId: string;
        roomNumber: string;
        success?: string;
    }>();

    // Store all beds belonging to this room
    const [beds, setBeds] = useState<Bed[]>([]);
    const [openMenuBedId, setOpenMenuBedId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState({
        x: 0,
        y: 0,
        height: 0,
    });
    const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
    const [tenantDetails, setTenantDetails] = useState<any>(null);
    const [tenantLoading, setTenantLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const [removeTenantVisible, setRemoveTenantVisible] = useState(false);
    const [removingTenant, setRemovingTenant] = useState(false);
    const [tenantToRemove, setTenantToRemove] = useState<number | null>(null);

    const [addTenantVisible, setAddTenantVisible] = useState(false);
    const [tenantToAddBedId, setTenantToAddBedId] = useState<number | null>(null);
    const [tenantToAddBedNumber, setTenantToAddBedNumber] = useState("");
    const [addTenantDatePickerVisible, setAddTenantDatePickerVisible] =
    useState(false);

    const [addFullName, setAddFullName] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [addRent, setAddRent] = useState("");
    const [addSecurityDeposit, setAddSecurityDeposit] = useState("");
    const [addCheckInDate, setAddCheckInDate] = useState("");
    const [addGender, setAddGender] = useState("");
    const [addAddress, setAddAddress] = useState("");
    const [addEmergencyPhone, setAddEmergencyPhone] = useState("");
    const [addAadhaar, setAddAadhaar] = useState("");

    const [addNameError, setAddNameError] = useState("");
    const [addPhoneError, setAddPhoneError] = useState("");
    const [addRentError, setAddRentError] = useState("");
    const [addSecurityDepositError, setAddSecurityDepositError] = useState("");
    const [addCheckInDateError, setAddCheckInDateError] = useState("");
    const [addGenderError, setAddGenderError] = useState("");
    const [addEmergencyPhoneError, setAddEmergencyPhoneError] = useState("");
    const [addAadhaarError, setAddAadhaarError] = useState("");
    const [addAddressError, setAddAddressError] = useState("");
    const [addTenantError, setAddTenantError] = useState("");
    const [deleteBedError, setDeleteBedError] = useState("");

    const [addingTenant, setAddingTenant] = useState(false);

    const router = useRouter();

    useEffect(() => {
        if (success) {
            setSuccessMessage(success);

            const timer = setTimeout(() => {
                setSuccessMessage("");
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [success]);

    // defult room screen , showing bed informations
    const fetchBeds = async () => {

        try {

            const data = await getBedsByRoomId(
                Number(roomId)
            );

            setBeds(
                data.filter((bed: any) => bed.status !== "INACTIVE")
            );

        } catch (error) {

            console.log("Failed to fetch beds:", error);

        }
    };
    


    useEffect(() => {

        if (roomId) {
            fetchBeds();
        }

    }, [roomId]);


    const handleDeleteBed = async (bedId: number) => {

        try {
            const result = await deleteBed(bedId);

            console.log("Delete bed response:", result);

            await fetchBeds();

            setSuccessMessage(
                result.message || "Bed deleted successfully."
            );

            setTimeout(() => {
                setSuccessMessage("");
            }, 4000);

        } catch (error) {
            console.log("Failed to delete bed:", error);

            setDeleteBedError(
                error instanceof Error
                    ? error.message
                    : "Failed to delete bed."
            );

            setTimeout(() => {
                setDeleteBedError("");
            }, 4000);
        }

    };

    const resetAddTenantForm = () => {
        setAddFullName("");
        setAddPhone("");
        setAddRent("");
        setAddSecurityDeposit("");
        setAddCheckInDate("");
        setAddGender("");
        setAddAddress("");
        setAddEmergencyPhone("");
        setAddAadhaar("");

        setAddNameError("");
        setAddPhoneError("");
        setAddRentError("");
        setAddSecurityDepositError("");
        setAddCheckInDateError("");
        setAddGenderError("");
        setAddAddressError("");
        setAddEmergencyPhoneError("");
        setAddAadhaarError("");

        setAddTenantDatePickerVisible(false);
    };


    return (
        <View style={styles.container}>

            {successMessage ? (
                <View style={styles.successMessage}>
                    <Text style={styles.successMessageText}>
                        {successMessage}
                    </Text>
                </View>
            ) : null}

            {deleteBedError ? (
                <View style={styles.deleteBedError}>
                    
                    <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color="#ff4d4f"
                    />

                    <Text style={styles.deleteBedErrorText}>
                        {deleteBedError}
                    </Text>
                </View>
            ) : null}


            <Text style={styles.title}>
                Room {roomNumber}
            </Text>

            <Text style={styles.subtitle}>
                Beds
            </Text>

            <FlatList
                data={beds}
                keyExtractor={(bed) => bed.bed_id.toString()}
                renderItem={({ item }) => {
                    const isOccupied = item.tenant !== null;
                    let buttonRef: View | null = null;

                    return (
                        <>
                            <View style={styles.bedCard}>

                                {/* Bed information */}
                                <Pressable
                                    onPress={async () => {

                                        // If this bed is already open, close it
                                        if (selectedBedId === item.bed_id) {
                                            setSelectedBedId(null);
                                            setTenantDetails(null);
                                            return;
                                        }

                                        // Select this bed
                                        setSelectedBedId(item.bed_id);

                                        // Available bed → no tenant API call
                                        if (!item.tenant) {
                                            setTenantDetails(null);
                                            return;
                                        }

                                        try {
                                            setTenantLoading(true);

                                            const data = await getTenantByBedId(
                                                item.bed_id
                                            );

                                            setTenantDetails(data);

                                        } catch (error) {

                                            console.log(
                                                "Failed to fetch tenant information:",
                                                error
                                            );

                                            setTenantDetails(null);

                                        } finally {
                                            setTenantLoading(false);
                                        }
                                    }}
                                >
                                    <Text style={styles.bedNumber}>
                                        Bed {item.bed_number}
                                    </Text>

                                    <Text style={styles.status}>
                                        {item.tenant
                                            ? item.tenant.full_name
                                            : item.status === "AVAILABLE"
                                                ? "Available"
                                                : item.status}
                                    </Text>

                                    {item.rent !== null && (
                                        <Text style={styles.rent}>
                                            ₹{item.rent.toLocaleString("en-IN")} / month
                                        </Text>
                                    )}
                                </Pressable>


                                {/* Maintenance indicator */}
                                {item.status === "MAINTENANCE" && (
                                    <View style={styles.maintenanceIndicator}>
                                        <Text style={styles.maintenanceText}>
                                            🔧
                                        </Text>
                                    </View>
                                )}


                                {/* Menu button */}
                                <Pressable
                                    ref={(ref) => {
                                        buttonRef = ref;
                                    }}
                                    style={styles.menuButton}
                                    onPress={() => {
                                        buttonRef?.measureInWindow(
                                            (x, y, width, height) => {

                                                console.log(
                                                    "Button position:",
                                                    x,
                                                    y,
                                                    width,
                                                    height
                                                );

                                                setMenuPosition({
                                                    x,
                                                    y,
                                                    height,
                                                });
                                            }
                                        );

                                        setOpenMenuBedId(item.bed_id);
                                    }}
                                >
                                    <Text style={styles.menuDots}>
                                        ⋮
                                    </Text>
                                </Pressable>


                                {/* Menu */}
                                <Modal
                                    transparent={true}
                                    visible={
                                        openMenuBedId === item.bed_id
                                    }
                                    onRequestClose={() =>
                                        setOpenMenuBedId(null)
                                    }
                                >
                                    <View style={styles.modalContainer}>

                                        <Pressable
                                            style={styles.modalOverlay}
                                            onPress={() =>
                                                setOpenMenuBedId(null)
                                            }
                                        />

                                        <View
                                            style={[
                                                styles.actionMenu,
                                                {
                                                    left:
                                                        menuPosition.x - 120,
                                                    top:
                                                        menuPosition.y +
                                                        menuPosition.height,
                                                },
                                            ]}
                                        >

                                            {isOccupied ? (
                                                <>

                                                    {/* UPDATE TENANT */}
                                                    <Pressable
                                                        style={styles.actionItem}
                                                        onPress={() => {
                                                            setOpenMenuBedId(null);

                                                            router.push({
                                                                pathname: "/tenant/edit/[bedId]",
                                                                params: {
                                                                    bedId: item.bed_id.toString(),
                                                                    roomId: roomId.toString(),
                                                                    roomNumber: roomNumber.toString(),
                                                                },
                                                            });
                                                        }}
                                                    >
                                                        <Text
                                                            style={
                                                                styles.actionText
                                                            }
                                                        >
                                                            Update Tenant
                                                        </Text>
                                                    </Pressable>


                                                    {/* MOVE TENANT */}
                                                    <Pressable
                                                        style={styles.actionItem}
                                                        onPress={() => {
                                                            setOpenMenuBedId(null);

                                                            console.log(
                                                                "Move tenant:",
                                                                item.tenant?.tenant_id
                                                            );
                                                        }}
                                                    >
                                                        <Text
                                                            style={
                                                                styles.actionText
                                                            }
                                                        >
                                                            Move Tenant
                                                        </Text>
                                                    </Pressable>


                                                    {/* REMOVE TENANT */}
                                                    <Pressable
                                                        style={styles.actionItem}
                                                        onPress={() => {
                                                            setOpenMenuBedId(null);

                                                            if (item.tenant?.tenant_id) {
                                                                setTenantToRemove(item.tenant.tenant_id);
                                                                setRemoveTenantVisible(true);
                                                            }
                                                        }}
                                                    >
                                                        <Text style={styles.actionText}>
                                                            Remove Tenant
                                                        </Text>
                                                    </Pressable>

                                                </>
                                            ) : (
                                                <>

                                                    {/* Add tenant */}
                                                    <Pressable
                                                        style={styles.actionItem}
                                                        onPress={() => {
                                                            setOpenMenuBedId(null);

                                                            resetAddTenantForm();

                                                            setTenantToAddBedId(item.bed_id);
                                                            setTenantToAddBedNumber(item.bed_number);
                                                            setAddTenantVisible(true);
                                                        }}
                                                    >
                                                        <Text
                                                            style={
                                                                styles.actionText
                                                            }
                                                        >
                                                            Add Tenant
                                                        </Text>
                                                    </Pressable>

                                                    {!item.tenant && item.status !== "INACTIVE" && (
                                                        <>
                                                            {/* Delete bed */}
                                                            <Pressable
                                                                style={styles.actionItem}
                                                                onPress={() => {
                                                                    setOpenMenuBedId(null);

                                                                    Alert.alert(
                                                                        "Delete Bed",
                                                                        "Are you sure you want to delete this bed?",
                                                                        [
                                                                            {
                                                                                text: "Cancel",
                                                                                style: "cancel",
                                                                            },
                                                                            {
                                                                                text: "Delete",
                                                                                style: "destructive",
                                                                                onPress: () => handleDeleteBed(9999),
                                                                            },
                                                                        ]
                                                                    );
                                                                }}
                                                            >
                                                                <Text
                                                                    style={
                                                                        styles.actionText
                                                                    }
                                                                >
                                                                    Delete Bed
                                                                </Text>
                                                            </Pressable>
                                                        </>
                                                    )}

                                                </>
                                            )}

                                        </View>
                                    </View>
                                </Modal>

                            </View>


                            {/* Expanded information card */}
                            {selectedBedId === item.bed_id && (
                                <View style={styles.tenantDetailsCard}>

                                    {tenantLoading ? (
                                        <ActivityIndicator size="small" />

                                    ) : item.tenant && tenantDetails ? (

                                        <>
                                            {/* Tenant Information */}
                                            <Text style={styles.detailsTitle}>
                                                Tenant Information
                                            </Text>

                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Name
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    {tenantDetails.tenant.full_name}
                                                </Text>
                                            </View>


                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Phone
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    {tenantDetails.tenant.phone}
                                                </Text>
                                            </View>


                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Gender
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    {tenantDetails.tenant.gender}
                                                </Text>
                                            </View>


                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Address
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    {tenantDetails.tenant.permanent_address || "-"}
                                                </Text>
                                            </View>


                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Emergency
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    {tenantDetails.tenant.emergency_contact_phone || "-"}
                                                </Text>
                                            </View>


                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Aadhaar
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    {tenantDetails.tenant.aadhaar_number || "-"}
                                                </Text>
                                            </View>


                                            {/* Allocation Information */}
                                            <Text style={styles.detailsTitle}>
                                                Allocation Information
                                            </Text>


                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Rent Date
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    {tenantDetails.allocation.check_in_date}
                                                </Text>
                                            </View>


                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Rent
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    ₹{tenantDetails.allocation.rent}
                                                </Text>
                                            </View>


                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>
                                                    Security
                                                </Text>

                                                <Text style={styles.detailValue}>
                                                    ₹{tenantDetails.allocation.security_deposit}
                                                </Text>
                                            </View>

                                        </>

                                    ) : !item.tenant ? (

                                        <>
                                            <Text style={styles.availableTitle}>
                                                Bed is available
                                            </Text>

                                            <Pressable
                                                style={styles.addTenantButton}
                                                onPress={() => {
                                                    resetAddTenantForm();
                                                    setTenantToAddBedId(item.bed_id);
                                                    setTenantToAddBedNumber(item.bed_number);
                                                    setAddTenantVisible(true);
                                                }}
                                            >
                                                <Text
                                                    style={
                                                        styles.addTenantButtonText
                                                    }
                                                >
                                                    + Add Tenant
                                                </Text>
                                            </Pressable>
                                        </>

                                    ) : null}

                                </View>
                            )}

                        </>
                    );
                }}
            />

            {/* Remove Tenant Confirmation Modal */}
            <Modal
                visible={removeTenantVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setRemoveTenantVisible(false);
                    setTenantToRemove(null);
                }}
            >
                <View style={styles.removeModalContainer}>

                    <View style={styles.removeModalBox}>

                        <Text style={styles.removeModalTitle}>
                            Remove Tenant?
                        </Text>

                        <Text style={styles.removeModalMessage}>
                            Are you sure you want to remove this tenant?
                        </Text>

                        <View style={styles.removeModalButtons}>

                            <Pressable
                                style={styles.cancelButton}
                                onPress={() => {
                                    setRemoveTenantVisible(false);
                                    setTenantToRemove(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.removeButton}
                                disabled={removingTenant}
                                onPress={async () => {

                                    if (!tenantToRemove) {
                                        return;
                                    }

                                    try {

                                        // Show loading
                                        setRemovingTenant(true);

                                        // Remove tenant
                                        const result = await removeTenant(
                                            tenantToRemove
                                        );

                                        console.log(
                                            "Remove tenant response:",
                                            result
                                        );

                                        // Close popup
                                        setRemoveTenantVisible(false);
                                        setTenantToRemove(null);

                                        // Close expanded tenant information
                                        setSelectedBedId(null);
                                        setTenantDetails(null);

                                        // Refresh beds
                                        await fetchBeds();

                                        // Show success message
                                        setSuccessMessage(
                                            result.message || "Tenant removed successfully."
                                        );

                                        // Hide success message after 4 seconds
                                        setTimeout(() => {
                                            setSuccessMessage("");
                                        }, 4000);

                                    } catch (error) {

                                        console.log(
                                            "Failed to remove tenant:",
                                            error
                                        );

                                    } finally {

                                        setRemovingTenant(false);

                                    }
                                }}
                            >
                                {removingTenant ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />
                                ) : (
                                    <Text style={styles.removeButtonText}>
                                        Remove
                                    </Text>
                                )}
                            </Pressable>

                        </View>

                    </View>

                </View>
            </Modal>

            {/* Add Tenant Bottom Sheet */}
            <Modal
                visible={addTenantVisible}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setAddTenantVisible(false);
                    setTenantToAddBedId(null);
                    setTenantToAddBedNumber("");
                }}
            >
                <View style={styles.addTenantModalContainer}>

                    {/* Space above the bottom sheet */}
                    <Pressable
                        style={styles.addTenantOverlay}
                        onPress={() => {
                            setAddTenantVisible(false);
                            setTenantToAddBedId(null);
                            setTenantToAddBedNumber("");
                        }}
                    />

                    {/* Bottom sheet */}
                    <KeyboardAvoidingView
                        behavior={
                            Platform.OS === "ios"
                                ? "padding"
                                : undefined
                        }
                        style={styles.addTenantSheet}
                    >

                        {/* Drag handle */}
                        <View style={styles.addTenantHandle} />

                        {/* Bed number */}
                        <Text style={styles.addTenantBedNumber}>
                            Bed {tenantToAddBedNumber}
                        </Text>

                        {/* Form will come here later */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >

                            {/* Name */}
                            <Text style={styles.addTenantLabel}>
                                Name
                            </Text>

                            <View style={styles.addTenantInputWrapper}>

                                <TextInput
                                    style={[
                                        styles.addTenantInput,
                                        addNameError && styles.addTenantInputWithError,
                                    ]}
                                    value={addFullName}
                                    onChangeText={(text) => {
                                        setAddFullName(text);
                                        setAddNameError("");
                                    }}
                                    placeholder="Enter full name"
                                />

                                {addNameError ? (
                                    <Text style={styles.addTenantErrorInside}>
                                        {addNameError}
                                    </Text>
                                ) : null}

                            </View>


                            {/* Phone */}
                            <Text style={styles.addTenantLabel}>
                                Phone
                            </Text>

                            <View style={styles.addTenantInputWrapper}>

                                <TextInput
                                    style={[
                                        styles.addTenantInput,
                                        addPhoneError && styles.addTenantInputWithError,
                                    ]}
                                    value={addPhone}
                                    onChangeText={(text) => {
                                        setAddPhone(text);
                                        setAddPhoneError("");
                                    }}
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                />

                                {addPhoneError ? (
                                    <Text style={styles.addTenantErrorInside}>
                                        {addPhoneError}
                                    </Text>
                                ) : null}

                            </View>


                            {/* Rent + Security Deposit */}
                            <View style={styles.addTenantRow}>

                                <View style={styles.addTenantHalfField}>

                                    <Text style={styles.addTenantLabel}>
                                        Rent
                                    </Text>

                                    <View style={styles.addTenantInputWrapper}>

                                        <TextInput
                                            style={[
                                                styles.addTenantInput,
                                                addRentError && styles.addTenantInputWithError,
                                            ]}
                                            value={addRent}
                                            onChangeText={(text) => {
                                                setAddRent(text);
                                                setAddRentError("");
                                            }}
                                            placeholder="Rent"
                                            keyboardType="numeric"
                                        />

                                        {addRentError ? (
                                            <Text style={styles.addTenantErrorInside}>
                                                {addRentError}
                                            </Text>
                                        ) : null}

                                    </View>

                                </View>


                                <View style={styles.addTenantHalfField}>

                                    <Text style={styles.addTenantLabel}>
                                        Security Deposit
                                    </Text>

                                    <View style={styles.addTenantInputWrapper}>

                                        <TextInput
                                            style={[
                                                styles.addTenantInput,
                                                addSecurityDepositError &&
                                                    styles.addTenantInputWithError,
                                            ]}
                                            value={addSecurityDeposit}
                                            onChangeText={(text) => {
                                                setAddSecurityDeposit(text);
                                                setAddSecurityDepositError("");
                                            }}
                                            placeholder="Security"
                                            keyboardType="numeric"
                                        />

                                        {addSecurityDepositError ? (
                                            <Text style={styles.addTenantErrorInside}>
                                                {addSecurityDepositError}
                                            </Text>
                                        ) : null}

                                    </View>

                                </View>

                            </View>


                            {/* Check-in Date + Gender */}
                            <View style={styles.addTenantRow}>

                                {/* Check-in Date */}
                                <View style={styles.addTenantHalfField}>

                                    <Text style={styles.addTenantLabel}>
                                        Check-in Date
                                    </Text>

                                    <View style={styles.addTenantInputWrapper}>

                                        <Pressable
                                            style={[
                                                styles.addTenantInput,
                                                addCheckInDateError &&
                                                    styles.addTenantInputWithError,
                                            ]}
                                            onPress={() => {
                                                setAddCheckInDateError("");
                                                setAddTenantDatePickerVisible(true);
                                            }}
                                        >
                                            <Text style={styles.addTenantInputText}>
                                                {addCheckInDate || "Select date"}
                                            </Text>
                                        </Pressable>

                                        {addCheckInDateError ? (
                                            <Text style={styles.addTenantErrorInside}>
                                                {addCheckInDateError}
                                            </Text>
                                        ) : null}

                                    </View>

                                    {/* Date Picker */}
                                    {addTenantDatePickerVisible && (
                                        <DateTimePicker
                                            value={
                                                addCheckInDate
                                                    ? new Date(addCheckInDate)
                                                    : new Date()
                                            }
                                            mode="date"
                                            display="default"
                                            onValueChange={(event, selectedDate) => {

                                                setAddTenantDatePickerVisible(false);

                                                if (selectedDate) {
                                                    const year = selectedDate.getFullYear();

                                                    const month = String(
                                                        selectedDate.getMonth() + 1
                                                    ).padStart(2, "0");

                                                    const day = String(
                                                        selectedDate.getDate()
                                                    ).padStart(2, "0");

                                                    setAddCheckInDate(
                                                        `${year}-${month}-${day}`
                                                    );
                                                }
                                            }}
                                            onDismiss={() => {
                                                setAddTenantDatePickerVisible(false);
                                            }}
                                        />
                                    )}

                                </View>


                                {/* Gender */}
                                <View style={styles.addTenantHalfField}>

                                    <Text style={styles.addTenantLabel}>
                                        Gender
                                    </Text>

                                    <View style={styles.addTenantInputWrapper}>

                                        <Pressable
                                            style={[
                                                styles.addTenantInput,
                                                addGenderError && styles.addTenantInputWithError,
                                            ]}
                                            onPress={() => {

                                                setAddGenderError("");

                                                const options = [
                                                    "MALE",
                                                    "FEMALE",
                                                    "OTHER"
                                                ];

                                                const currentIndex =
                                                    options.indexOf(addGender);

                                                const nextIndex =
                                                    (currentIndex + 1) % options.length;

                                                setAddGender(
                                                    options[nextIndex]
                                                );
                                            }}
                                        >
                                            <Text style={styles.addTenantInputText}>
                                                {addGender || "Select gender"}
                                            </Text>
                                        </Pressable>

                                        {addGenderError ? (
                                            <Text style={styles.addTenantErrorInside}>
                                                {addGenderError}
                                            </Text>
                                        ) : null}

                                    </View>

                                </View>

                            </View>


                            {/* Address */}
                            <Text style={styles.addTenantLabel}>
                                Address
                            </Text>

                            <TextInput
                                style={[
                                    styles.addTenantInput,
                                    addAddressError &&
                                        styles.addTenantInputWithError,
                                ]}
                                value={addAddress}
                                onChangeText={(text) => {
                                    setAddAddress(text);
                                    setAddAddressError("");
                                }}
                                placeholder="Enter address"
                            />

                            {addAddressError ? (
                                <Text style={styles.addTenantErrorInside}>
                                    {addAddressError}
                                </Text>
                            ) : null}


                            {/* Emergency Phone */}
                            <Text style={styles.addTenantLabel}>
                                Emergency Phone
                            </Text>

                            <TextInput
                                style={styles.addTenantInput}
                                value={addEmergencyPhone}
                                onChangeText={setAddEmergencyPhone}
                                placeholder="Emergency phone"
                                keyboardType="phone-pad"
                            />

                            {addEmergencyPhoneError ? (
                                <Text style={styles.addTenantErrorInside}>
                                    {addEmergencyPhoneError}
                                </Text>
                            ) : null}


                            {/* Aadhaar */}
                            <Text style={styles.addTenantLabel}>
                                Aadhaar Number
                            </Text>

                            <TextInput
                                style={[
                                    styles.addTenantInput,
                                    addAadhaarError &&
                                        styles.addTenantInputWithError,
                                ]}
                                value={addAadhaar}
                                onChangeText={(text) => {
                                    setAddAadhaar(text);
                                    setAddAadhaarError("");
                                }}
                                placeholder="Aadhaar number"
                                keyboardType="numeric"
                            />

                            {addAadhaarError ? (
                                <Text style={styles.addTenantErrorInside}>
                                    {addAadhaarError}
                                </Text>
                            ) : null}
                            
                            {addTenantError ? (
                                <Text style={styles.addTenantApiError}>
                                    {addTenantError}
                                </Text>
                            ) : null}

                            {/* Add Tenant */}
                            <Pressable
                                style={[
                                    styles.addTenantSaveButton,
                                    addingTenant && { opacity: 0.9 },
                                ]}
                                disabled={addingTenant}
                                onPress={ async () => {

                                    let hasError = false;

                                    // Name
                                    if (addFullName.trim().length < 2) {
                                        setAddNameError("Name must be at least 2 characters.");
                                        hasError = true;
                                    } else {
                                        setAddNameError("");
                                    }

                                    // Phone
                                    if (!/^\d{10,15}$/.test(addPhone.trim())) {
                                        setAddPhoneError("Enter a valid number");
                                        hasError = true;
                                    } else {
                                        setAddPhoneError("");
                                    }

                                    // Rent
                                    if (!addRent.trim() || Number(addRent) <= 0) {
                                        setAddRentError("Rent must be greater than 0");
                                        hasError = true;
                                    } else {
                                        setAddRentError("");
                                    }

                                    // Security Deposit
                                    if (
                                        addSecurityDeposit.trim() &&
                                        Number(addSecurityDeposit) < 0
                                    ) {
                                        setAddSecurityDepositError("Cannot be negative");
                                        hasError = true;
                                    } else {
                                        setAddSecurityDepositError("");
                                    }

                                    // Check-in Date
                                    if (!addCheckInDate.trim()) {
                                        setAddCheckInDateError("Check-in date is required");
                                        hasError = true;
                                    } else {
                                        const selectedDate = new Date(addCheckInDate);

                                        if (isNaN(selectedDate.getTime())) {
                                            setAddCheckInDateError("Enter a valid date");
                                            hasError = true;
                                        } else {
                                            setAddCheckInDateError("");
                                        }
                                    }


                                    // Gender
                                    if (!addGender) {
                                        setAddGenderError("Gender is required");
                                        hasError = true;
                                    } else {
                                        setAddGenderError("");
                                    }

        
                                    // Emergency Phone
                                    if (addEmergencyPhone.trim() !== "") {
                                        const phone = addEmergencyPhone.trim();

                                        if (!/^\d{10,15}$/.test(phone)) {
                                            setAddEmergencyPhoneError(
                                                "Enter a valid phone number."
                                            );
                                            hasError = true;
                                        } else {
                                            setAddEmergencyPhoneError("");
                                        }
                                    } else {
                                        setAddEmergencyPhoneError("");
                                    }

                                    
                                    // Aadhaar
                                    if (addAadhaar.trim() !== "") {
                                        const aadhaar = addAadhaar.trim();

                                        if (!/^\d{12}$/.test(aadhaar)) {
                                            setAddAadhaarError(
                                                "Aadhaar number must be 12 digits."
                                            );
                                            hasError = true;
                                        } else {
                                            setAddAadhaarError("");
                                        }
                                    } else {
                                        setAddAadhaarError("");
                                    }

                                    
                                    // Address
                                    if (addAddress.trim() !== "") {
                                        const address = addAddress.trim();

                                        if (address.length < 2) {
                                            setAddAddressError(
                                                "Address must be at least 2 characters."
                                            );
                                            hasError = true;
                                        } else {
                                            setAddAddressError("");
                                        }
                                    } else {
                                        setAddAddressError("");
                                    }

                                    // Stop here if validation failed
                                    if (hasError) {
                                        return;
                                    }

                                    try {
                                        setAddingTenant(true);

                                        const result = await addTenant(
                                            tenantToAddBedId!,
                                            {
                                                full_name: addFullName.trim(),
                                                phone: addPhone.trim(),
                                                gender: addGender as "MALE" | "FEMALE" | "OTHER",
                                                permanent_address: addAddress.trim() || undefined,
                                                emergency_contact_phone:
                                                    addEmergencyPhone.trim() || undefined,
                                                aadhaar_number: addAadhaar.trim() || undefined,
                                                check_in_date: addCheckInDate,
                                                rent: Number(addRent),
                                                security_deposit: addSecurityDeposit.trim()
                                                    ? Number(addSecurityDeposit)
                                                    : 0,
                                            }
                                        );

                                        console.log("Add tenant response:", result);

                                        // Close Add Tenant form
                                        setAddTenantVisible(false);

                                        // Reset form
                                        resetAddTenantForm();

                                        // Clear selected bed
                                        setSelectedBedId(null);

                                        // Refresh beds
                                        await fetchBeds();

                                        // Show success message
                                        setSuccessMessage(
                                            result.message || "Tenant added successfully."
                                        );

                                        // Hide success message after 4 seconds
                                        setTimeout(() => {
                                            setSuccessMessage("");
                                        }, 4000);

                                    } catch (error) {

                                        console.log("Failed to add tenant:", error);

                                        setAddTenantError(
                                            error instanceof Error
                                                ? error.message
                                                : "Failed to add tenant."
                                        );

                                    } finally {

                                        setAddingTenant(false);

                                    }
                                }}
                                >

                                {addingTenant ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.addTenantSaveButtonText}>
                                        Add Tenant
                                    </Text>
                                )}

                            </Pressable>

                        </ScrollView>

                    </KeyboardAvoidingView>

                </View>
            </Modal>

        </View>
    );
    }


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        padding: 20,
    },

    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#071426",
    },

    subtitle: {
        marginTop: 6,
        marginBottom: 20,
        fontSize: 15,
        color: "#64748B",
    },

    bedCard: {
        position: "relative",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    bedNumber: {
        fontSize: 17,
        fontWeight: "700",
        color: "#071426",
    },

    rent: {
        marginTop: 6,
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
    },

    menuButton: {
        position: "absolute",
        top: 0,
        right: 8,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },

    menuDots: {
        fontSize: 20,
        color: "#64748B",
    },

    status: {
        marginTop: 8,
        fontSize: 14,
        color: "#64748B",
    },

    maintenanceIndicator: {
        position: "absolute",
        right: 16,
        bottom: 12,
    },

    maintenanceText: {
        fontSize: 14,
    },

    modalContainer: {
        flex: 1,
    },

    modalOverlay: {
        flex: 1,
    },

    actionMenu: {
        position: "absolute",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
            // Android
        elevation: 8,

        // iOS
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },

    actionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#142251",
    },

    actionItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        marginVertical: 3,
    },

    tenantDetailsCard: {
        marginTop: 10,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
    },

    detailsTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },

    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },

    detailLabel: {
        fontSize: 14,
        fontWeight: "500",
    },

    detailValue: {
        fontSize: 14,
        flex: 1,
        textAlign: "right",
    },

    availableTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },

    addTenantButton: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },

    addTenantButtonText: {
        fontSize: 15,
        fontWeight: "600",
    },

    successMessage: {
        position: "absolute",
        bottom: 30,
        alignSelf: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        zIndex: 100,
        elevation: 6,
    },

    successMessageText: {
        color: "#166534",
        fontSize: 13,
        fontWeight: "600",
    },

    removeModalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },

    removeModalBox: {
        width: "85%",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",

        elevation: 10,

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },

    removeModalTitle: {
        fontSize: 19,
        fontWeight: "700",
        color: "#071426",
        marginBottom: 8,
    },

    removeModalMessage: {
        fontSize: 14,
        color: "#64748B",
        lineHeight: 20,
        marginBottom: 20,
    },

    removeModalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },

    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    cancelButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
    },

    removeButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
        backgroundColor: "#DC2626",
        justifyContent: "center",
        alignItems: "center",
        minWidth: 80,
    },

    removeButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    addTenantModalContainer: {
        flex: 1,
        justifyContent: "flex-end",
    },

    addTenantOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
    },

    addTenantSheet: {
        height: "78%",
        backgroundColor: "#F8FAFC",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 10,
    },

    addTenantHandle: {
        width: 42,
        height: 4,
        borderRadius: 10,
        backgroundColor: "#CBD5E1",
        alignSelf: "center",
        marginBottom: 16,
    },

    addTenantBedNumber: {
        fontSize: 18,
        fontWeight: "700",
        color: "#071426",
        textAlign: "center",
        marginBottom: 10,
    },

    addTenantLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
        marginTop: 12,
    },

    addTenantInput: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#FFFFFF",
        fontSize: 15,
        color: "#0F172A",
        minHeight: 44,
    },

    addTenantInputText: {
        fontSize: 15,
        color: "#0F172A",
    },

    addTenantRow: {
        flexDirection: "row",
        gap: 12,
    },

    addTenantHalfField: {
        flex: 1,
    },

    addTenantSaveButton: {
        marginTop: 20,
        marginBottom: 20,
        backgroundColor: "#0F172A",
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: "center",
    },

    addTenantSaveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },

    addTenantInputWrapper: {
        position: "relative",
    },

    addTenantInputWithError: {
        paddingBottom: 24,
    },

    addTenantErrorInside: {
        position: "absolute",
        left: 12,
        bottom: 7,
        fontSize: 10,
        color: "#DC2626",
    },

    addTenantApiError: {
        marginTop: 12,
        fontSize: 12,
        color: "#DC2626",
        textAlign: "center",
    },

    deleteBedError: {
        position: "absolute",
        bottom: 30,
        alignSelf: "center",

        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ff4d4f",
        borderRadius: 8,

        paddingVertical: 8,
        paddingHorizontal: 14,

        zIndex: 999,
        elevation: 5,
    },

    deleteBedErrorText: {
        color: "#ff4d4f",
        fontSize: 14,
        marginLeft: 7,
    },

});