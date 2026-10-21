import { API_BASE_URL } from "../config/api";
import { authenticatedFetch } from "./auth";


export interface DueRent {
    monthly_rent_id: number;

    tenant_id: number;
    tenant_name: string;
    phone: string;

    bed_id: number;
    bed_number: string;
    room_number: string;

    due_date: string;

    rent_amount: string;
    paid_amount: string;
    remaining_amount: string;

    status: "DUE" | "PARTIAL";
}


// Get all unpaid and partially paid rents
// for a specific building.
export const getDueMonthlyRentsByBuilding = async (
    buildingId: number
): Promise<DueRent[]> => {

    const response = await authenticatedFetch(
        `${API_BASE_URL}/monthly-rents/building/${buildingId}/due`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch due rents");
    }

    return await response.json();
};


// Collect rent for a specific monthly rent
export const collectRent = async (
    monthlyRentId: number,
    amount: number
) => {

    console.log("COLLECT RENT URL:", `${API_BASE_URL}/monthly-rents/collect`);

    const response = await authenticatedFetch(
        `${API_BASE_URL}/monthly-rents/collect`,
        {
            method: "POST",
            body: JSON.stringify({
                monthly_rent_id: monthlyRentId,
                amount: amount,
            }),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to collect rent");
    }

    return await response.json();
};


export const getCurrentMonthCollection = async (
    buildingId: number
) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/monthly-rents/building/${buildingId}/current-month-collection`
    );

    if (!response.ok) {
        throw new Error("FAILED_TO_FETCH_CURRENT_MONTH_COLLECTION");
    }

    return await response.json();
};



/**
 * One eligible missing rent month returned by the backend.
 */
export interface MissingRentMonth {
    billing_month: string;
    due_date: string;
    rent_amount: number;
}

/**
 * Response returned by the missing-rent months API.
 */
export interface MissingRentMonthsResponse {
    tenant_id: number;
    missing_count: number;
    missing_months: MissingRentMonth[];
}

/**
 * Fetch eligible missing rent months for a vacating tenant.
 */
export const getMissingRentMonths = async (
    tenantId: number
): Promise<MissingRentMonthsResponse> => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/monthly-rents/tenant/${tenantId}/missing-months`
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to fetch missing rent months."
        );
    }

    return result as MissingRentMonthsResponse;
};

/**
 * Generate rent for one selected missing billing month.
 */
export const generateSelectedMissingRent = async (
    tenantId: number,
    billingMonth: string
) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/monthly-rents/tenant/${tenantId}/generate-missing-rent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                billing_month: billingMonth,
            }),
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.detail || "Failed to generate rent."
        );
    }

    return result;
};
