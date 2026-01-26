import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import SentinelLoadingOverlay from "@/components/SentinelLoadingOverlay";
import Colors from "@/constants/colors";

export default function Index() {
  const router = useRouter();
  const [readyToRoute, setReadyToRoute] = useState<boolean>(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setReadyToRoute(true);
    }, 1100);

    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (readyToRoute) {
      router.replace("/overview");
    }
  }, [readyToRoute, router]);

  return (
    <View style={styles.container} testID="bootLoadingScreen">
      <SentinelLoadingOverlay visible fullScreen testIDPrefix="boot" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
