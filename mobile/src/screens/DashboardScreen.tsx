import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { WorkoutSession, Goal } from '../../shared/types';
import { StatCard } from '../components/StatCard';

export function DashboardScreen() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [workoutsData, goalsData] = await Promise.all([
        api.getWorkouts(),
        api.getGoals(),
      ]);
      setWorkouts(workoutsData);
      setGoals(goalsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Calculate stats
  const totalMinutes = workouts.reduce((sum, w) => sum + w.minutes, 0);
  const totalSessions = workouts.length;
  const totalWeight = workouts.reduce((sum, w) => sum + (w.weightLifted || 0), 0);
  const totalMiles = workouts.reduce((sum, w) => sum + (w.miles || 0), 0);

  const currentGoal = goals[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Fitness Dashboard</Text>
        
        <View style={styles.statsGrid}>
          <StatCard title="Total Sessions" value={totalSessions} />
          <StatCard title="Total Minutes" value={totalMinutes.toLocaleString()} />
          <StatCard title="Total Miles" value={totalMiles.toFixed(1)} />
          <StatCard title="Weight Lifted" value={`${(totalWeight / 1000).toFixed(0)}k lbs`} />
        </View>

        {currentGoal && (
          <View style={styles.goalSection}>
            <Text style={styles.sectionTitle}>Current Goal: {currentGoal.name}</Text>
            <View style={styles.goalProgress}>
              <Text style={styles.goalText}>
                Annual Weight Target: {(currentGoal.annualWeightTarget / 1000000).toFixed(1)}M lbs
              </Text>
              <Text style={styles.goalText}>
                Weekly Sessions: {currentGoal.weeklySessionsTarget}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {workouts.slice(0, 5).map((workout) => (
            <View key={workout.id} style={styles.workoutCard}>
              <Text style={styles.workoutActivity}>{workout.activity}</Text>
              <Text style={styles.workoutDetails}>
                {workout.source} • {workout.minutes} min
                {workout.miles ? ` • ${workout.miles.toFixed(1)} mi` : ''}
              </Text>
              <Text style={styles.workoutDate}>
                {new Date(workout.date).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    padding: 16,
    color: '#1a1a1a',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  goalSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  goalProgress: {
    gap: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#666',
  },
  recentSection: {
    margin: 16,
  },
  workoutCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutActivity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  workoutDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  workoutDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
