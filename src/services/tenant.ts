import { API_BASE_URL } from "../config/api";
import { authenticatedFetch } from "./auth";


// get tenant informations   
export const getTenantByBedId = async (bedId: number) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/tenants/${bedId}/tenant`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            error.detail || "Failed to fetch tenant information."
        );
    }

    return await response.json();
};

// edit tenant 
export const updateTenant = async (
    tenantId: number,
    data: {
        full_name?: string;
        phone?: string;
        gender?: "MALE" | "FEMALE" | "OTHER";
        permanent_address?: string;
        emergency_contact_phone?: string;
        aadhaar_number?: string;
        check_in_date?: string;
        rent?: number;
        security_deposit?: number;
    }
) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/tenants/${tenantId}/edit`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to update tenant."
        );
    }

    // Backend can return success: false for business validation errors,
    // such as when the phone number is already used by another tenant.
    if (result.success === false) {
        throw new Error(
            result.message || "Tenant could not be updated."
        );
    }

    return result;
};


// remove tenant
export const removeTenant = async (tenantId: number) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/tenants/${tenantId}`,
        {
            method: "DELETE",
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to remove tenant."
        );
    }

    if (!result.exists) {
        throw new Error(
            result.message || "Tenant could not be removed."
        );
    }

    return result;
};


// add tenant
export const addTenant = async (
    bedId: number,
    data: {
        full_name: string;
        phone: string;
        gender?: "MALE" | "FEMALE" | "OTHER";
        permanent_address?: string;
        emergency_contact_phone?: string;
        aadhaar_number?: string;
        check_in_date: string;
        rent: number;
        security_deposit?: number;
    }
) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/tenants/beds/${bedId}/tenant`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to add tenant."
        );
    }

    if (!result.exists) {
        throw new Error(
            result.message || "Tenant could not be added."
        );
    }

    return result;
};


// Move tenant to another bed
export const moveTenant = async (
    tenantId: number,
    newBedId: number
) => {
    // Send the new bed ID to the backend.
    const response = await authenticatedFetch(
        `${API_BASE_URL}/tenants/${tenantId}/bed`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                bed_id: newBedId,
            }),
        }
    );

    const result = await response.json();

    // Handle HTTP errors returned by the backend.
    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to move tenant."
        );
    }

    // Handle business validation errors returned with success: false.
    if (result.success === false) {
        throw new Error(
            result.message || "Tenant could not be moved."
        );
    }

    return result;
};



/**
 * Mark a tenant as vacating or cancel the Vacating status.
 *
 * @param tenantId - ID of the tenant being updated.
 * @param isVacating - True to mark as vacating, false to cancel.
 * @param expectedCheckoutDate - Expected checkout date in YYYY-MM-DD format.
 */
export const setTenantVacating = async (
    tenantId: number,
    isVacating: boolean,
    expectedCheckoutDate: string | null = null
) => {
    // Require an expected checkout date when marking a tenant as vacating.
    if (isVacating && !expectedCheckoutDate) {
        throw new Error("Please select an expected vacating date.");
    }

    // Send the status and expected checkout date to the backend.
    const response = await authenticatedFetch(
        `${API_BASE_URL}/tenants/${tenantId}/vacating`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                is_vacating: isVacating,
                expected_checkout_date: isVacating
                    ? expectedCheckoutDate
                    : null,
            }),
        }
    );

    // Read the response from the backend.
    const result = await response.json();

    // Handle HTTP errors.
    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to update vacating status."
        );
    }

    // Handle business errors returned by the backend.
    if (!result.exists) {
        throw new Error(
            result.message || "Could not update vacating status."
        );
    }

    // Return the updated vacating status.
    return result;
};



// Information returned for each vacating tenant.
export type VacatingTenant = {
    tenant_id: number;
    full_name: string;
    phone: string;
    bed_id: number;
    room_number: string;
    building_id: number;
    building_name: string;
    expected_checkout_date: string | null;
};

// Response returned by the vacating tenants API.
export type VacatingTenantsResponse = {
    success: boolean;
    building_id: number;
    count: number;
    tenants: VacatingTenant[];
};


// Fetch vacating tenants for one selected building.
export const getVacatingTenantsByBuilding = async (
    buildingId: number
): Promise<VacatingTenantsResponse> => {

    // Request vacating tenants using the existing authenticated API client.
    const response = await authenticatedFetch(
        `${API_BASE_URL}/tenants/vacating/building/${buildingId}`
    );

    // Parse the backend response.
    const result = await response.json();

    // Handle HTTP errors.
    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to fetch vacating tenants."
        );
    }

    // Handle application-level errors.
    if (!result.success) {
        throw new Error(
            result.message || "Could not fetch vacating tenants."
        );
    }

    return result as VacatingTenantsResponse;
};
