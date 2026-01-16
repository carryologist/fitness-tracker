import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { WorkoutSession } from '../../shared/types';
import { AddWorkoutModal } from '../components/AddWorkoutModal';

export function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutSession | null>(null);

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
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleEditWorkout(item)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.activity}>{item.activity}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.editIcon}>✏️</Text>
          <Text style={styles.source}>{item.source}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>{item.minutes} min</Text>
        {item.miles && <Text style={styles.stat}>{item.miles.toFixed(1)} mi</Text>}
        {item.weightLifted && <Text style={styles.stat}>{item.weightLifted.toLocaleString()} lbs</Text>}
      </View>
      <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
    </TouchableOpacity>
  );

  const handleWorkoutAdded = () => {
    loadWorkouts();
    setEditingWorkout(null);
  };

  const handleEditWorkout = (workout: WorkoutSession) => {
    setEditingWorkout(workout);
    setShowAddModal(true);
  };

  const handleAddNew = () => {
    setEditingWorkout(null);
    setShowAddModal(true);
  };

  const AddWorkoutButton = () => (
    <TouchableOpacity 
      style={styles.addButton} 
      onPress={handleAddNew}
      activeOpacity={0.8}
    >
      <Text style={styles.addButtonIcon}>+</Text>
      <Text style={styles.addButtonText}>Add Workout</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Workouts</Text>
      <FlatList
        data={workouts}
        renderItem={renderWorkout}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<AddWorkoutButton />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <AddWorkoutModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingWorkout(null);
        }}
        onSuccess={handleWorkoutAdded}
        editingWorkout={editingWorkout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    padding: 16,
    color: '#fff',
    letterSpacing: -0.5,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  addButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonIcon: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '500',
    marginRight: 10,
  },
  addButtonText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#242438',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editIcon: {
    fontSize: 14,
  },
  activity: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  source: {
    fontSize: 13,
    color: '#a1a1aa',
    backgroundColor: '#2d2d44',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  stat: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 10,
  },
  notes: {
    fontSize: 14,
    color: '#a1a1aa',
    marginTop: 10,
    fontStyle: 'italic',
  },
});
