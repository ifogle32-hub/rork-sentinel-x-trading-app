import { Tabs } from "expo-router";
import { Activity, Zap, Shield, Wallet, MoreHorizontal, Ghost, Brain } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SentinelLoadingOverlay from "@/components/SentinelLoadingOverlay";
import { BlurView } from "expo-blur";
import Colors from "@/constants/colors";
import SystemAura from "@/components/SystemAura";

function TabBarBackground() {
  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.webTabBar]} />
    );
  }
  
  return (
    <BlurView
      intensity={40}
      tint="dark"
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [isTabTransitionLoading, setIsTabTransitionLoading] = useState<boolean>(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const showTransitionLoader = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsTabTransitionLoading(true);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTabTransitionLoading(false);
    }, 550);
  }, []);

  const tabBarStyle = useMemo(() => {
    const bottomPad = Math.max(insets.bottom, 10) + 6;
    const topPad = 8;
    const height = 58 + topPad + bottomPad;

    return {
      position: "absolute" as const,
      backgroundColor: "transparent" as const,
      borderTopWidth: 0,
      elevation: 0,
      height,
      paddingBottom: bottomPad,
      paddingTop: topPad,
    };
  }, [insets.bottom]);

  return (
    <View style={styles.rootContainer}>
      <SystemAura />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          headerShown: false,
          tabBarBackground: () => <TabBarBackground />,
          tabBarStyle,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700" as const,
            letterSpacing: 0.4,
            paddingBottom: 2,
            marginBottom: 0,
          },
        }}
        screenListeners={{
          tabPress: () => {
            showTransitionLoader();
          },
        }}
      >
      <Tabs.Screen
        name="overview"
        options={{
          title: "MONITOR",
          tabBarIcon: ({ color }) => <Activity color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="strategies"
        options={{
          title: "STRATEGIES",
          tabBarIcon: ({ color }) => <Zap color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="risk"
        options={{
          title: "RISKS",
          tabBarIcon: ({ color }) => <Shield color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="funding"
        options={{
          title: "FUNDING",
          tabBarIcon: ({ color }) => <Wallet color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="shadow"
        options={{
          title: "SHADOW TRAINING",
          tabBarIcon: ({ color }) => <Ghost color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="approvals" options={{ href: null }} />
      <Tabs.Screen name="timeline" options={{ href: null }} />
      <Tabs.Screen
        name="governance"
        options={{
          title: "BRAIN",
          tabBarIcon: ({ color }) => <Brain color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "MORE",
          tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="metrics" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="positions" options={{ href: null }} />
      <Tabs.Screen name="control" options={{ href: null }} />
    </Tabs>

      <SentinelLoadingOverlay visible={isTabTransitionLoading} testIDPrefix="tab" />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webTabBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(20px)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
