import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Goal } from '../../shared/types';
import { GoalModal } from '../components/GoalModal';
import { useSettings } from '../context/SettingsContext';
import { darkTheme, lightTheme } from '../theme/themes';

export function GoalsScreen() {
  const { isDark } = useSettings();
  const theme = isDark ? darkTheme : lightTheme;
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

  const styles = createStyles(isDark, theme);

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

const createStyles = (isDark: boolean, theme: typeof darkTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    padding: 16,
    color: theme.textPrimary,
    letterSpacing: -0.5,
  },
  addButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
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
    backgroundColor: theme.card,
    margin: 16,
    marginTop: 0,
    padding: 22,
    borderRadius: 20,
  },
  currentYearCard: {
    borderWidth: 2,
    borderColor: theme.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editBadge: {
    backgroundColor: theme.cardLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBadgeText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  goalName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  year: {
    fontSize: 16,
    color: theme.primary,
    marginTop: 4,
    fontWeight: '700',
  },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  label: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
  },
});
