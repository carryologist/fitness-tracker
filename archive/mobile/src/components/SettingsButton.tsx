import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSettings } from '../context/SettingsContext';

interface SettingsButtonProps {
  onPress: () => void;
}

export function SettingsButton({ onPress }: SettingsButtonProps) {
  const { isDark } = useSettings();

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: isDark ? '#242438' : '#fff' }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>⚙️</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    fontSize: 20,
  },
});
