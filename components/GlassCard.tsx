import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, ViewStyle, Platform, Animated, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { triggerHaptic } from '@/hooks/useHaptics';
import { useAdaptiveGlass } from '@/providers/AdaptiveGlassProvider';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'low' | 'medium' | 'high';
  variant?: 'primary' | 'elevated' | 'subtle';
  noPadding?: boolean;
  interactive?: boolean;
  onPress?: () => void;
}

const intensityMap = {
  low: 20,
  medium: 40,
  high: 60,
};

export default function GlassCard({ 
  children, 
  style, 
  intensity = 'medium',
  variant = 'primary',
  noPadding = false,
  interactive = false,
  onPress,
}: GlassCardProps) {
  const { glassTheme, getGradientColors: getAdaptiveGradient, isDarker } = useAdaptiveGlass();
  const baseBlurIntensity = intensityMap[intensity];
  const blurIntensity = isDarker ? baseBlurIntensity + 20 : baseBlurIntensity;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  
  const getGradientColors = (): readonly [string, string, string] => {
    return getAdaptiveGradient(variant);
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'elevated':
        return glassTheme.borderLight;
      case 'subtle':
        return isDarker ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)';
      default:
        return glassTheme.border;
    }
  };

  const handlePressIn = useCallback(() => {
    if (!interactive) return;
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tiltAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    triggerHaptic('selection');
  }, [interactive, scaleAnim, tiltAnim]);

  const handlePressOut = useCallback(() => {
    if (!interactive) return;
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(tiltAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [interactive, scaleAnim, tiltAnim]);

  const rotateX = tiltAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1.5deg'],
  });

  const animatedStyle = interactive ? {
    transform: [
      { scale: scaleAnim },
      { perspective: 1000 as number },
      { rotateX },
    ],
  } : {};

  const cardContent = Platform.OS === 'web' ? (
    <View 
      style={[
        styles.container, 
        styles.webContainer,
        !noPadding && styles.padding,
        { 
          borderColor: getBorderColor(),
          backgroundColor: glassTheme.background,
        },
        style
      ]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  ) : (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={blurIntensity}
        tint="dark"
        style={[styles.blur, !noPadding && styles.padding]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.gradient]}
        />
        <View style={[styles.border, { borderColor: getBorderColor() }]} />
        {children}
      </BlurView>
    </View>
  );

  if (interactive || onPress) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <Animated.View style={animatedStyle}>
          {cardContent}
        </Animated.View>
      </Pressable>
    );
  }

  return cardContent;
}

interface GlassBadgeProps {
  children: React.ReactNode;
  style?: ViewStyle;
  color?: string;
}

export function GlassBadge({ children, style, color }: GlassBadgeProps) {
  const backgroundColor = color ? `${color}15` : 'rgba(255,255,255,0.08)';
  const borderColor = color ? `${color}30` : 'rgba(255,255,255,0.12)';

  return (
    <View style={[styles.badge, { backgroundColor, borderColor }, style]}>
      {children}
    </View>
  );
}

interface GlassDividerProps {
  style?: ViewStyle;
}

export function GlassDivider({ style }: GlassDividerProps) {
  return (
    <LinearGradient
      colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.divider, style]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  webContainer: {
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
  },
  blur: {
    flex: 1,
  },
  padding: {
    padding: 20,
  },
  gradient: {
    borderRadius: 20,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    pointerEvents: 'none',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
});
