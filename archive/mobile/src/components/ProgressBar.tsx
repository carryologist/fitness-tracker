import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  progress: number;
  color: string;
  gradientColors?: readonly [string, string, ...string[]];
}

export function ProgressBar({ progress, color, gradientColors }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const defaultGradient = [color, color] as const;
  
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Progress</Text>
        <Text style={styles.percentage}>{Math.round(clampedProgress)}%</Text>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={gradientColors || defaultGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${clampedProgress}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  track: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
