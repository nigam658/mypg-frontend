import { API_BASE_URL } from "../config/api";
import { authenticatedFetch } from "./auth";

// One payment transaction in the building's collection history.
export interface PaymentTransaction {
    payment_id: number;
    tenant_id: number;
    tenant_name: string;
    amount: number;
    payment_date: string;
}

// Response returned by the building payment history API.
export interface BuildingPaymentHistory {
    building_id: number;
    month: string;
    total_collected: number;
    transactions: PaymentTransaction[];
}


export const getBuildingPaymentHistory = async (
    buildingId: number
): Promise<BuildingPaymentHistory> => {
    try {
        const response = await authenticatedFetch(
            `${API_BASE_URL}/monthly-rents/building/${buildingId}/payment-history`
        );

        // Safely parse the API response.
        let result: any = null;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                "Unable to load payment history. Please try again."
            );
        }

        // Handle unsuccessful HTTP responses without exposing server details.
        if (!response.ok) {
            throw new Error(
                "Unable to load payment history. Please try again."
            );
        }

        return result as BuildingPaymentHistory;
    } catch (error) {
        // Keep technical details in the development console only.
        console.error("Payment history request failed:", error);

        // Pass a friendly message to the Payment History page.
        throw new Error(
            "Unable to load payment history. Please check your internet connection and try again."
        );
    }
};
