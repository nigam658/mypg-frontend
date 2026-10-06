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
