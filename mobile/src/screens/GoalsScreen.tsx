import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Goal } from '../../shared/types';
import { GoalModal } from '../components/GoalModal';

export function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      // Sort by year descending (newest first)
      const sorted = data.sort((a, b) => b.year - a.year);
      setGoals(sorted);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const handleAddGoal = () => {
    setEditingGoal(null);
    setShowModal(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    loadGoals();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Goals</Text>

        {/* Add Goal Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddGoal} activeOpacity={0.8}>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Goal</Text>
        </TouchableOpacity>
        
        {goals.map((goal, index) => (
          <TouchableOpacity 
            key={goal.id} 
            style={[styles.card, index === 0 && styles.currentYearCard]}
            onPress={() => handleEditGoal(goal)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.year}>{goal.year}</Text>
              </View>
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>Tap to edit</Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Annual Targets</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Weight Target</Text>
                <Text style={styles.value}>{(goal.annualWeightTarget / 1000000).toFixed(2)}M lbs</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Minutes Target</Text>
                <Text style={styles.value}>{goal.annualMinutesTarget.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Targets</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Sessions</Text>
                <Text style={styles.value}>{goal.weeklySessionsTarget}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Minutes</Text>
                <Text style={styles.value}>{goal.weeklyMinutesTarget}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Per Session</Text>
                <Text style={styles.value}>{goal.minutesPerSession} min</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quarterly Targets</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Weight</Text>
                <Text style={styles.value}>{(goal.quarterlyWeightTarget / 1000).toFixed(0)}k lbs</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Sessions</Text>
                <Text style={styles.value}>{goal.quarterlySessionsTarget}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <GoalModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        editingGoal={editingGoal}
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
  addButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonIcon: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '500',
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentYearCard: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editBadgeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  goalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  year: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
