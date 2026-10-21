import { API_BASE_URL } from "../config/api";
import { authenticatedFetch } from "./auth";



export const getBedsByRoomId = async (roomId: number) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/beds/room/${roomId}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to fetch beds.");
    }

    return await response.json();
};


export const deleteBed = async (bedId: number) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/beds/${bedId}`,
        {
            method: "DELETE",
        }
    );

    const data = await response.json();
    console.log("Delete bed API response:", data);

    if (!response.ok || data.exists === false) {
        throw new Error(data.message || "Failed to delete bed.");
    }

    return data;
};


export const addBed = async (roomId: number) => {
   const response = await authenticatedFetch(
        `${API_BASE_URL}/beds/rooms/${roomId}`,
        {
            method: "POST",
        }
    );

    const data = await response.json();

    console.log("Add bed API response:", data);

    if (!response.ok || data.exists === false) {
        throw new Error(data.message || "Failed to add bed.");
    }

    return data;
};


/**
 * Fetch empty beds grouped by room for a specific building.
 * The backend filters out occupied beds, inactive beds,
 * inactive floors, and inactive or deleted rooms.
 */
export const getEmptyBedsByBuildingId = async (buildingId: number) => {
    const response = await authenticatedFetch(
        `${API_BASE_URL}/beds/building/${buildingId}/empty`
    );

    // Read the error response if the request fails.
    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            error.detail || "Failed to fetch available beds."
        );
    }

    return await response.json();
};
