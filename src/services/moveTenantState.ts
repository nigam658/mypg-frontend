
import { useSyncExternalStore } from "react";

// Stores the current Move Tenant session temporarily in memory.
export type MoveTenantSession = {
    tenantId: number;
    tenantName: string;
    originalBedId: number;
    buildingId: number;
    destinationBedId: number | null;
    destinationRoomNumber: string | null;
    destinationBedNumber: string | null;
};

// null means Move Tenant mode is not active.
let currentSession: MoveTenantSession | null = null;

// Screens subscribe to changes so they can update automatically.
const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

// Read the current session.
export function getMoveTenantSession() {
    return currentSession;
}

// Start moving a tenant.
export function startMoveTenant(session: MoveTenantSession) {
    currentSession = { ...session };
    notifyListeners();
}

// Select or deselect a destination bed.
export function selectMoveDestination(
    bedId: number | null,
    roomNumber: string | null,
    bedNumber: string | null
) {
    if (!currentSession) return;

    currentSession = {
        ...currentSession,
        destinationBedId: bedId,
        destinationRoomNumber: roomNumber,
        destinationBedNumber: bedNumber,
    };

    notifyListeners();
}

// End the move process without saving.
export function cancelMoveTenant() {
    currentSession = null;
    notifyListeners();
}

// Clear the session after a successful move.
export function completeMoveTenant() {
    currentSession = null;
    notifyListeners();
}

// React hook for screens that need to display the move session.
export function useMoveTenantSession() {
    return useSyncExternalStore(
        (callback) => {
            listeners.add(callback);
            return () => listeners.delete(callback);
        },
        getMoveTenantSession,
        getMoveTenantSession
    );
}
