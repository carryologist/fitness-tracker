import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { WorkoutSession } from '../../shared/types';

export function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = async () => {
    try {
      const data = await api.getWorkouts();
      // Filter to 2026 data only
      const filtered = data.filter((w) => {
        const year = new Date(w.date).getFullYear();
        return year === 2026;
      });
      setWorkouts(filtered);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkouts();
  };

  const renderWorkout = ({ item }: { item: WorkoutSession }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.activity}>{item.activity}</Text>
        <Text style={styles.source}>{item.source}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>{item.minutes} min</Text>
        {item.miles && <Text style={styles.stat}>{item.miles.toFixed(1)} mi</Text>}
        {item.weightLifted && <Text style={styles.stat}>{item.weightLifted.toLocaleString()} lbs</Text>}
      </View>
      <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Workouts</Text>
      <FlatList
        data={workouts}
        renderItem={renderWorkout}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  list: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  source: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  stat: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
