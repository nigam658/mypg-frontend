import { cancelMoveTenant } from "@/services/moveTenantState";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
    const pathname = usePathname();
    const previousPathname = useRef(pathname);

    useEffect(() => {
        const previousPath = previousPathname.current;

        // Check whether the previous and current screens are part
        // of the Building/Room navigation flow.
        const wasInMoveFlow =
            previousPath.includes("/building/") ||
            previousPath.includes("/room/");

        const isInMoveFlow =
            pathname.includes("/building/") ||
            pathname.includes("/room/");

        // Cancel only when the owner leaves the Building/Room flow.
        if (wasInMoveFlow && !isInMoveFlow) {
            cancelMoveTenant();
        }

        previousPathname.current = pathname;
    }, [pathname]);

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />

            <Stack
                screenOptions={{
                    headerShown: false,
                }}
            />
        </SafeAreaProvider>
    );
}