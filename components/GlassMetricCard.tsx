import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAdaptiveGlass } from '@/providers/AdaptiveGlassProvider';

interface GlassMetricCardProps {
  label: string;
  value?: string | number | null;
  subValue?: string;
  icon: React.ReactNode;
  iconColor?: string;
  valueColor?: string;
  isLoading?: boolean;
}

export default function GlassMetricCard({
  label,
  value,
  subValue,
  icon,
  iconColor = Colors.primary,
  valueColor = Colors.text,
  isLoading = false,
}: GlassMetricCardProps) {
  const { glassTheme, getGradientColors, isDarker } = useAdaptiveGlass();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fogAnim = useRef(new Animated.Value(1)).current;
  
  const hasValue = value !== undefined && value !== null && value !== '—';
  const blurIntensity = isDarker ? 50 : 30;

  useEffect(() => {
    if (hasValue && !isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(fogAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fogAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasValue, isLoading, fadeAnim, fogAnim]);

  const fogBgColor = isDarker ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';
  const fogBgColorSmall = isDarker ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)';
  const adaptiveValueColor = isDarker && valueColor === Colors.text ? glassTheme.textPrimary : valueColor;

  const renderContent = () => (
    <>
      <LinearGradient
        colors={getGradientColors('primary')}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.innerGlow, { borderColor: isDarker ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)' }]} />
      
      <View style={[styles.border, { borderColor: glassTheme.border }]} />
      
      <View style={styles.metricHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}${isDarker ? '10' : '15'}` }]}>
          {icon}
        </View>
        <Text style={[styles.metricLabel, { color: glassTheme.textMuted }]}>{label}</Text>
      </View>
      
      <View style={styles.valueContainer}>
        <Animated.View style={[styles.fogPlaceholder, { opacity: fogAnim }]}>
          <View style={[styles.fogBar, { backgroundColor: fogBgColor }]} />
          {subValue !== undefined && <View style={[styles.fogBarSmall, { backgroundColor: fogBgColorSmall }]} />}
        </Animated.View>
        
        <Animated.View style={[styles.valueWrapper, { opacity: fadeAnim }]}>
          <Text style={[styles.metricValue, { color: adaptiveValueColor }]}>
            {hasValue ? value : ''}
          </Text>
          {subValue && hasValue && (
            <Text style={[styles.metricSubvalue, { color: glassTheme.textSecondary }]}>{subValue}</Text>
          )}
        </Animated.View>
      </View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.webContainer, { backgroundColor: glassTheme.background }]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={blurIntensity} tint="dark" style={styles.blur}>
        {renderContent()}
      </BlurView>
    </View>
  );
}

interface GlassStatsCardProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

export function GlassStatsCard({ children, isLoading = false }: GlassStatsCardProps) {
  const { glassTheme, getGradientColors, isDarker } = useAdaptiveGlass();
  const blurIntensity = isDarker ? 50 : 30;

  const renderContent = () => (
    <>
      <LinearGradient
        colors={getGradientColors('subtle')}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.innerGlow, { borderColor: isDarker ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)' }]} />
      <View style={[styles.border, { borderColor: glassTheme.border }]} />
      <View style={styles.statsContent}>{children}</View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.statsContainer, styles.webContainer, { backgroundColor: glassTheme.background }]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={styles.statsContainer}>
      <BlurView intensity={blurIntensity} tint="dark" style={styles.blur}>
        {renderContent()}
      </BlurView>
    </View>
  );
}

interface GlassStatRowProps {
  label: string;
  value?: string | number | null;
  valueColor?: string;
  isLast?: boolean;
  isLoading?: boolean;
}

export function GlassStatRow({ 
  label, 
  value, 
  valueColor = Colors.text, 
  isLast = false,
  isLoading = false,
}: GlassStatRowProps) {
  const { glassTheme, isDarker } = useAdaptiveGlass();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fogAnim = useRef(new Animated.Value(1)).current;
  
  const hasValue = value !== undefined && value !== null && value !== '—';
  const adaptiveValueColor = isDarker && valueColor === Colors.text ? glassTheme.textPrimary : valueColor;
  const fogBgColor = isDarker ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';

  useEffect(() => {
    if (hasValue && !isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(fogAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fogAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasValue, isLoading, fadeAnim, fogAnim]);

  return (
    <View style={[styles.statRow, isLast && styles.lastStatRow, { borderBottomColor: isDarker ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)' }]}>
      <Text style={[styles.statLabel, { color: glassTheme.textSecondary }]}>{label}</Text>
      <View style={styles.statValueContainer}>
        <Animated.View style={[styles.statFogPlaceholder, { opacity: fogAnim }]}>
          <View style={[styles.statFogBar, { backgroundColor: fogBgColor }]} />
        </Animated.View>
        <Animated.Text style={[styles.statValue, { color: adaptiveValueColor, opacity: fadeAnim }]}>
          {hasValue ? value : ''}
        </Animated.Text>
      </View>
    </View>
  );
}

interface GlassChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function GlassChartCard({ title, children }: GlassChartCardProps) {
  const { glassTheme, getGradientColors, isDarker } = useAdaptiveGlass();
  const blurIntensity = isDarker ? 45 : 25;

  const renderContent = () => (
    <>
      <LinearGradient
        colors={getGradientColors('subtle')}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.innerGlow, { borderColor: isDarker ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)' }]} />
      <View style={[styles.border, { borderColor: glassTheme.border }]} />
      <View style={styles.chartContent}>{children}</View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.chartContainer, styles.webContainer, { backgroundColor: glassTheme.background }]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <BlurView intensity={blurIntensity} tint="dark" style={styles.blur}>
        {renderContent()}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    minHeight: 110,
  },
  webContainer: {
    backdropFilter: 'blur(20px)',
  },
  blur: {
    flex: 1,
    padding: 16,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    pointerEvents: 'none',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  valueContainer: {
    position: 'relative',
    minHeight: 36,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fogPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
  },
  fogBar: {
    height: 26,
    width: '70%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  fogBarSmall: {
    height: 14,
    width: '45%',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 6,
  },
  valueWrapper: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metricSubvalue: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  statsContent: {
    padding: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  lastStatRow: {
    borderBottomWidth: 0,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statValueContainer: {
    position: 'relative',
    minWidth: 80,
    alignItems: 'flex-end',
  },
  statFogPlaceholder: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  statFogBar: {
    height: 18,
    width: 60,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  chartContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  chartContent: {
    padding: 16,
  },
});
