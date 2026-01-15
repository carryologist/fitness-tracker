import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Goal } from '../../shared/types';

export function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      setGoals(data);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Goals</Text>
        
        {goals.map((goal) => (
          <View key={goal.id} style={styles.card}>
            <Text style={styles.goalName}>{goal.name}</Text>
            <Text style={styles.year}>{goal.year}</Text>
            
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
          </View>
        ))}
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
