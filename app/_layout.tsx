import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "react-native";
import Colors from "@/constants/colors";
import { ConnectionProvider } from "@/providers/ConnectionProvider";
import { GlobalStateProvider } from "@/providers/GlobalStateProvider";
import { OperationalModeProvider } from "@/providers/OperationalModeProvider";
import { AdaptiveGlassProvider } from "@/providers/AdaptiveGlassProvider";
import { CommandFocusProvider } from "@/providers/CommandFocusProvider";
import { EngineMonitorProvider } from "@/providers/EngineMonitorProvider";
import CommandFocusOverlay from "@/components/CommandFocusOverlay";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    SystemUI.setBackgroundColorAsync(Colors.background);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider>
        <GlobalStateProvider>
          <OperationalModeProvider>
            <AdaptiveGlassProvider>
              <CommandFocusProvider>
                <EngineMonitorProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
                    <RootLayoutNav />
                    <CommandFocusOverlay />
                  </GestureHandlerRootView>
                </EngineMonitorProvider>
              </CommandFocusProvider>
            </AdaptiveGlassProvider>
          </OperationalModeProvider>
        </GlobalStateProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
