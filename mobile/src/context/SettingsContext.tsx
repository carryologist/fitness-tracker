import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Units = 'imperial' | 'metric';

interface Settings {
  themeMode: ThemeMode;
  defaultSource: string;
  defaultActivity: string;
  units: Units;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  isDark: boolean;
}

const defaultSettings: Settings = {
  themeMode: 'dark',
  defaultSource: 'Peloton',
  defaultActivity: 'Cycling',
  units: 'imperial',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // Load settings from storage
  useEffect(() => {
    AsyncStorage.getItem('settings').then((stored) => {
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
      setLoaded(true);
    });
  }, []);

  // Save settings to storage
  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    AsyncStorage.setItem('settings', JSON.stringify(newSettings));
  };

  // Determine if dark mode is active
  const isDark = 
    settings.themeMode === 'dark' || 
    (settings.themeMode === 'system' && systemColorScheme === 'dark');

  if (!loaded) return null;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isDark }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
