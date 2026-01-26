import React, { useRef, useCallback } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  ViewStyle,
  PressableProps,
} from 'react-native';
import { triggerHaptic } from '@/hooks/useHaptics';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle;
  scaleValue?: number;
  hapticType?: 'light' | 'medium' | 'selection' | 'none';
  enableTilt?: boolean;
}

export default function PressableScale({
  children,
  style,
  scaleValue = 0.97,
  hapticType = 'light',
  enableTilt = false,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(
    (event: any) => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: scaleValue,
          duration: 150,
          useNativeDriver: true,
        }),
        ...(enableTilt
          ? [
              Animated.timing(tiltAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]
          : []),
      ]).start();

      if (hapticType !== 'none') {
        triggerHaptic(hapticType);
      }

      onPressIn?.(event);
    },
    [scaleAnim, tiltAnim, scaleValue, enableTilt, hapticType, onPressIn]
  );

  const handlePressOut = useCallback(
    (event: any) => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        ...(enableTilt
          ? [
              Animated.timing(tiltAnim, {
                toValue: 0,
                duration: 280,
                useNativeDriver: true,
              }),
            ]
          : []),
      ]).start();

      onPressOut?.(event);
    },
    [scaleAnim, tiltAnim, enableTilt, onPressOut]
  );

  const rotateX = tiltAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '2deg'],
  });

  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      ...(enableTilt ? [{ rotateX }] : []),
    ],
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Animated.View style={[style, animatedStyle, disabled && styles.disabled]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface PressableButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle;
  hapticType?: 'light' | 'medium' | 'success' | 'warning' | 'error' | 'none';
}

export function PressableButton({
  children,
  style,
  hapticType = 'light',
  onPress,
  disabled,
  ...props
}: PressableButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(
    (event: any) => {
      if (hapticType !== 'none') {
        triggerHaptic(hapticType);
      }
      onPress?.(event);
    },
    [hapticType, onPress]
  );

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        style={[
          style,
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.disabled,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.6,
  },
});
