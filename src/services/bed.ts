import { authenticatedFetch } from "./auth";

const API_URL = "https://retainer-preamble-lifting.ngrok-free.dev";

export const getBedsByRoomId = async (roomId: number) => {
    const response = await authenticatedFetch(
        `${API_URL}/beds/room/${roomId}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to fetch beds.");
    }

    return await response.json();
};


export const deleteBed = async (bedId: number) => {
    const response = await authenticatedFetch(
        `${API_URL}/beds/${bedId}`,
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