import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Colors from "@/constants/colors";

type Props = {
  visible: boolean;
  fullScreen?: boolean;
  testIDPrefix?: string;
};

const SEGMENTS = 9;

export default function SentinelLoadingOverlay({ visible, fullScreen, testIDPrefix }: Props) {
  const breath = useRef(new Animated.Value(0)).current;
  const outroOpacity = useRef(new Animated.Value(1)).current;
  const outroScale = useRef(new Animated.Value(1)).current;
  const [isMounted, setIsMounted] = useState<boolean>(visible);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      outroOpacity.stopAnimation();
      outroScale.stopAnimation();
      outroOpacity.setValue(1);
      outroScale.setValue(1);

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breath, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(breath, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );

      console.log("[SentinelLoadingOverlay] start");
      loop.start();

      return () => {
        console.log("[SentinelLoadingOverlay] stop (cleanup)");
        loop.stop();
      };
    }

    breath.stopAnimation();

    Animated.parallel([
      Animated.timing(outroOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(outroScale, {
        toValue: 0.985,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [breath, outroOpacity, outroScale, visible]);

  const containerStyle = useMemo(() => {
    if (!fullScreen) return styles.overlay;
    return [styles.overlay, styles.fullScreen];
  }, [fullScreen]);

  const ringScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.18] });
  const ringOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] });

  const ringScale2 = breath.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.55] });
  const ringOpacity2 = breath.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.14] });

  const xScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.015] });
  const xOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  const bottomOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.50, 0.82] });

  if (!isMounted) return null;

  return (
    <Animated.View
      style={[containerStyle, { opacity: outroOpacity, transform: [{ scale: outroScale }] }]}
      pointerEvents="none"
      testID={`${testIDPrefix ?? "sentinel"}-loadingOverlay`}
    >
      <View style={styles.backdrop} />

      <View style={styles.centerWrap} testID={`${testIDPrefix ?? "sentinel"}-loadingCenter`}>
        <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
        <Animated.View style={[styles.ring2, { transform: [{ scale: ringScale2 }], opacity: ringOpacity2 }]} />

        <Animated.View
          style={[styles.xWrap, { transform: [{ scale: xScale }], opacity: xOpacity }]}
          testID={`${testIDPrefix ?? "sentinel"}-loadingX`}
        >
          <View style={[styles.xBar, styles.xBarA]} />
          <View style={[styles.xBar, styles.xBarB]} />
        </Animated.View>
      </View>

      <View style={styles.bottomWrap} testID={`${testIDPrefix ?? "sentinel"}-loadingFooter`}>
        <Animated.View style={[styles.segmentRow, { opacity: bottomOpacity }]}>
          {new Array(SEGMENTS).fill(null).map((_, i) => {
            const phase = ((i % SEGMENTS) / (SEGMENTS - 1)) * 0.85;

            const height = breath.interpolate({
              inputRange: [0, phase, 1],
              outputRange: [2, 10, 2],
            });

            const alpha = breath.interpolate({
              inputRange: [0, phase, 1],
              outputRange: [0.22, i === Math.floor(SEGMENTS / 2) ? 0.9 : 0.65, 0.22],
            });

            return (
              <Animated.View
                key={`seg-${i}`}
                style={[styles.segment, { height, opacity: alpha }]}
              />
            );
          })}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },
  fullScreen: {
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  ring2: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: Colors.gray[300],
  },
  xWrap: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  xBar: {
    position: "absolute",
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: "rgba(242, 242, 246, 0.92)",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  xBarA: {
    transform: [{ rotate: "45deg" }],
  },
  xBarB: {
    transform: [{ rotate: "-45deg" }],
  },
  bottomWrap: {
    paddingBottom: 38,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  segment: {
    width: 14,
    borderRadius: 999,
    backgroundColor: Colors.gray[300],
  },
});
