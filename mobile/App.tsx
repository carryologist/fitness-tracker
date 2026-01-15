import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { WorkoutsScreen } from './src/screens/WorkoutsScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#3b82f6',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopColor: '#e5e7eb',
            },
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text>,
            }}
          />
          <Tab.Screen
            name="Workouts"
            component={WorkoutsScreen}
            options={{
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💪</Text>,
            }}
          />
          <Tab.Screen
            name="Goals"
            component={GoalsScreen}
            options={{
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🎯</Text>,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
