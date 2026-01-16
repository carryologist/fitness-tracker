import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { WorkoutsScreen } from './src/screens/WorkoutsScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { FloatingAddButton } from './src/components/FloatingAddButton';
import { AddWorkoutModal } from './src/components/AddWorkoutModal';

type Tab = 'dashboard' | 'workouts' | 'goals';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
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

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.content}>
          {renderScreen()}
        </View>
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
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
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
    color: '#71717a',
    marginTop: 4,
    fontWeight: '600',
  },
  activeLabel: {
    color: '#818cf8',
  },
});
