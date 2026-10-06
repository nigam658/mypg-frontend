import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/api";



// Gets a new access token using the stored refresh token
export const refreshAccessToken = async () => {

    // Get the refresh token saved during login
    const refreshToken =
        await SecureStore.getItemAsync("refresh_token");

    // No refresh token means the session cannot be refreshed
    if (!refreshToken) {
        throw new Error("REFRESH_TOKEN_EXPIRED");
    }

    let response: Response;

    try {

        // Ask the backend for a new access token
        response = await fetch(`${API_BASE_URL}/auth/refresh`, 
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    refresh_token: refreshToken,
                }),
            }
        );

    } catch (error) {

        // No response from server, usually a network/connection problem
        // Keep the user's tokens
        throw new Error("NETWORK_ERROR");
    }

    // Backend rejected the refresh token
    if (response.status === 401) {
        throw new Error("REFRESH_TOKEN_EXPIRED");
    }

    // Some other server error
    // Do not delete the user's tokens
    if (!response.ok) {
        throw new Error("REFRESH_FAILED");
    }

    // Read the backend response
    const data = await response.json();

    // Replace the old access token with the new one
    await SecureStore.setItemAsync(
        "access_token",
        data.access_token
    );

    // Return the new access token to authenticatedFetch()
    return data.access_token;
};



// Checks whether the current access token is still valid
export const checkAccessToken = async () => {

    // Get the current access token from SecureStore
    const accessToken =
        await SecureStore.getItemAsync("access_token");

    // No access token means the user is not authenticated
    if (!accessToken) {
        throw new Error("ACCESS_TOKEN_MISSING");
    }

    let response: Response;

    try {

        // Ask the backend to verify the current access token
       response = await fetch(`${API_BASE_URL}/auth/me`, 
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

    } catch (error) {

        // Server could not be reached
        throw new Error("NETWORK_ERROR");
    }

    // Access token is expired or invalid
    if (response.status === 401) {
        // Delete only the expired access token.
        // Keep the refresh token so we can get a new access token.
        await SecureStore.deleteItemAsync("access_token");
        throw new Error("ACCESS_TOKEN_EXPIRED");
    }

    // Some other server error
    if (!response.ok) {
        console.log("AUTH ME STATUS:", response.status);

        const errorText = await response.text();

        console.log("AUTH ME RESPONSE:", errorText);

        throw new Error("ACCESS_TOKEN_CHECK_FAILED");

    }

    // Access token is valid
    return true;
};



// Makes requests to APIs that require authentication
export const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
) => {

    // Get the current access token from SecureStore
    const accessToken =
        await SecureStore.getItemAsync("access_token");

    // Cannot make an authenticated request without an access token
    if (!accessToken) {
        console.log("NO ACCESS TOKEN - REQUEST BLOCKED");
        throw new Error("Access token not found");
    }

    // Add authentication information to the request headers
    const headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    };

    // Make the original API request
    let response = await fetch(url, {
        ...options,
        headers,
    });

    // 401 means the backend rejected the access token
    if (response.status === 401) {

        try {

            // Try to get a new access token using the refresh token
            const newAccessToken = await refreshAccessToken();

            // Create headers using the new access token
            const newHeaders = {
                ...options.headers,
                Authorization: `Bearer ${newAccessToken}`,
                "Content-Type": "application/json",
            };

            // Retry the original API request
            response = await fetch(url, {
                ...options,
                headers: newHeaders,
            });

        } catch (error) {

            // Only delete tokens when the refresh token is
            // actually expired or invalid
            if (
                error instanceof Error &&
                error.message === "REFRESH_TOKEN_EXPIRED"
            ) {
                await SecureStore.deleteItemAsync("access_token");
                await SecureStore.deleteItemAsync("refresh_token");

                // Tell the application that the session has ended
                throw new Error("SESSION_EXPIRED");
            }

            // Network error or another server error:
            // keep the tokens and pass the error to the caller
            throw error;
        }
    }

    // Return the final API response
    return response;
};