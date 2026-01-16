import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { WorkoutsScreen } from './src/screens/WorkoutsScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { FloatingAddButton } from './src/components/FloatingAddButton';
import { AddWorkoutModal } from './src/components/AddWorkoutModal';
import { SettingsButton } from './src/components/SettingsButton';
import { SettingsModal } from './src/components/SettingsModal';

type Tab = 'dashboard' | 'workouts' | 'goals';

function AppContent() {
  const { isDark } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleWorkoutAdded = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen key={refreshKey} />;
      case 'workouts':
        return <WorkoutsScreen key={refreshKey} />;
      case 'goals':
        return <GoalsScreen />;
    }
  };

  const styles = createStyles(isDark);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          {renderScreen()}
        </View>
        <SettingsButton onPress={() => setShowSettings(true)} />
        <FloatingAddButton onPress={() => setShowAddModal(true)} />
        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text style={styles.tabIcon}>📊</Text>
            <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.activeLabel]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('workouts')}
          >
            <Text style={styles.tabIcon}>💪</Text>
            <Text style={[styles.tabLabel, activeTab === 'workouts' && styles.activeLabel]}>
              Workouts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('goals')}
          >
            <Text style={styles.tabIcon}>🎯</Text>
            <Text style={[styles.tabLabel, activeTab === 'goals' && styles.activeLabel]}>
              Goals
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
      <AddWorkoutModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleWorkoutAdded}
      />
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0f0f1a' : '#f8fafc',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1a1a2e' : '#fff',
    borderTopWidth: 1,
    borderTopColor: isDark ? '#2d2d44' : '#e2e8f0',
    paddingTop: 10,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 11,
    color: isDark ? '#a1a1aa' : '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  activeLabel: {
    color: '#6366f1',
  },
});
