import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { WorkoutSession, Goal } from '../../shared/types';
import { StatCard } from '../components/StatCard';
import { ProgressBar } from '../components/ProgressBar';

type ViewMode = 'quarterly' | 'annual';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toLocaleString();
}

export function DashboardScreen() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('quarterly');

  const loadData = async () => {
    try {
      const [workoutsData, goalsData] = await Promise.all([
        api.getWorkouts(),
        api.getGoals(),
      ]);
      // Filter to 2026 data only
      const filtered = workoutsData.filter((w) => {
        const year = new Date(w.date).getFullYear();
        return year === 2026;
      });
      setWorkouts(filtered);
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

  // Calculate stats for 2026
  const totalMinutes = workouts.reduce((sum, w) => sum + w.minutes, 0);
  const totalSessions = workouts.length;
  const totalWeight = workouts.reduce((sum, w) => sum + (w.weightLifted || 0), 0);
  const totalMiles = workouts.reduce((sum, w) => sum + (w.miles || 0), 0);

  const currentGoal = goals.find(g => g.year === 2026) || goals[0];

  // Calculate goal progress
  const goalProgress = useMemo(() => {
    if (!currentGoal) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    // Get period start/end based on view mode
    let periodStart: Date;
    let periodEnd: Date;
    let targetSessions: number;
    let targetMinutes: number;
    let targetWeight: number;

    if (viewMode === 'quarterly') {
      periodStart = new Date(currentYear, (currentQuarter - 1) * 3, 1);
      periodEnd = new Date(currentYear, currentQuarter * 3, 0);
      targetSessions = currentGoal.quarterlySessionsTarget;
      targetMinutes = currentGoal.quarterlyMinutesTarget;
      targetWeight = currentGoal.quarterlyWeightTarget;
    } else {
      periodStart = new Date(currentYear, 0, 1);
      periodEnd = new Date(currentYear, 11, 31);
      targetSessions = currentGoal.weeklySessionsTarget * 52;
      targetMinutes = currentGoal.annualMinutesTarget;
      targetWeight = currentGoal.annualWeightTarget;
    }

    // Filter workouts for the period
    const periodWorkouts = workouts.filter((w) => {
      const d = new Date(w.date);
      return d >= periodStart && d <= periodEnd;
    });

    const actualSessions = periodWorkouts.length;
    const actualMinutes = periodWorkouts.reduce((sum, w) => sum + w.minutes, 0);
    const actualWeight = periodWorkouts.reduce((sum, w) => sum + (w.weightLifted || 0), 0);

    // Calculate expected progress
    const totalDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const timeProgress = Math.min(daysElapsed / totalDays, 1);

    const expectedSessions = targetSessions * timeProgress;
    const expectedMinutes = targetMinutes * timeProgress;
    const expectedWeight = targetWeight * timeProgress;

    return {
      currentQuarter,
      actual: { sessions: actualSessions, minutes: actualMinutes, weight: actualWeight },
      expected: { sessions: expectedSessions, minutes: expectedMinutes, weight: expectedWeight },
      target: { sessions: targetSessions, minutes: targetMinutes, weight: targetWeight },
      progress: {
        sessions: (actualSessions / targetSessions) * 100,
        minutes: (actualMinutes / targetMinutes) * 100,
        weight: (actualWeight / targetWeight) * 100,
      },
    };
  }, [workouts, currentGoal, viewMode]);

  const getStatus = (actual: number, expected: number) => {
    if (actual >= expected) return { text: 'On Track', color: '#10b981' };
    if (actual >= expected * 0.8) return { text: 'Slightly Behind', color: '#f59e0b' };
    return { text: 'Behind', color: '#ef4444' };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Fitness Dashboard</Text>
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Sessions" value={totalSessions} icon="📅" />
          <StatCard title="Minutes" value={formatNumber(totalMinutes)} icon="⏱️" />
          <StatCard title="Miles" value={totalMiles.toFixed(1)} icon="🚴" />
          <StatCard title="Weight Lifted" value={formatNumber(totalWeight)} icon="🏋️" />
        </View>

        {/* Goal Progress Section */}
        {goalProgress && currentGoal && (
          <View style={styles.goalSection}>
            <View style={styles.goalHeader}>
              <Text style={styles.sectionTitle}>
                {viewMode === 'quarterly' ? `Q${goalProgress.currentQuarter}` : '2026'} Goal Progress
              </Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, viewMode === 'quarterly' && styles.toggleActive]}
                  onPress={() => setViewMode('quarterly')}
                >
                  <Text style={[styles.toggleText, viewMode === 'quarterly' && styles.toggleTextActive]}>
                    Q{goalProgress.currentQuarter}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, viewMode === 'annual' && styles.toggleActive]}
                  onPress={() => setViewMode('annual')}
                >
                  <Text style={[styles.toggleText, viewMode === 'annual' && styles.toggleTextActive]}>
                    Annual
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Weight Lifted Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={styles.progressIconContainer}>
                  <Text style={styles.progressIcon}>🏋️</Text>
                </View>
                <View>
                  <Text style={styles.progressTitle}>Weight Lifted</Text>
                  <Text style={[styles.progressStatus, { color: getStatus(goalProgress.actual.weight, goalProgress.expected.weight).color }]}>
                    {getStatus(goalProgress.actual.weight, goalProgress.expected.weight).text}
                  </Text>
                </View>
              </View>
              <View style={styles.progressStats}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Actual</Text>
                  <Text style={styles.progressValue}>{formatNumber(goalProgress.actual.weight)} lbs</Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Expected</Text>
                  <Text style={styles.progressValueLight}>{formatNumber(Math.round(goalProgress.expected.weight))} lbs</Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Target</Text>
                  <Text style={styles.progressValueLight}>{formatNumber(goalProgress.target.weight)} lbs</Text>
                </View>
              </View>
              <ProgressBar progress={goalProgress.progress.weight} color="#f97316" />
            </View>

            {/* Minutes Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={[styles.progressIconContainer, { backgroundColor: '#dbeafe' }]}>
                  <Text style={styles.progressIcon}>⏱️</Text>
                </View>
                <View>
                  <Text style={styles.progressTitle}>Minutes Completed</Text>
                  <Text style={[styles.progressStatus, { color: getStatus(goalProgress.actual.minutes, goalProgress.expected.minutes).color }]}>
                    {getStatus(goalProgress.actual.minutes, goalProgress.expected.minutes).text}
                  </Text>
                </View>
              </View>
              <View style={styles.progressStats}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Actual</Text>
                  <Text style={styles.progressValue}>{formatNumber(goalProgress.actual.minutes)} min</Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Expected</Text>
                  <Text style={styles.progressValueLight}>{formatNumber(Math.round(goalProgress.expected.minutes))} min</Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Target</Text>
                  <Text style={styles.progressValueLight}>{formatNumber(goalProgress.target.minutes)} min</Text>
                </View>
              </View>
              <ProgressBar progress={goalProgress.progress.minutes} color="#3b82f6" />
            </View>

            {/* Sessions Progress */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={[styles.progressIconContainer, { backgroundColor: '#dcfce7' }]}>
                  <Text style={styles.progressIcon}>✅</Text>
                </View>
                <View>
                  <Text style={styles.progressTitle}>Sessions Completed</Text>
                  <Text style={[styles.progressStatus, { color: getStatus(goalProgress.actual.sessions, goalProgress.expected.sessions).color }]}>
                    {getStatus(goalProgress.actual.sessions, goalProgress.expected.sessions).text}
                  </Text>
                </View>
              </View>
              <View style={styles.progressStats}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Actual</Text>
                  <Text style={styles.progressValue}>{goalProgress.actual.sessions} sessions</Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Expected</Text>
                  <Text style={styles.progressValueLight}>{Math.round(goalProgress.expected.sessions)} sessions</Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Target</Text>
                  <Text style={styles.progressValueLight}>{goalProgress.target.sessions} sessions</Text>
                </View>
              </View>
              <ProgressBar progress={goalProgress.progress.sessions} color="#10b981" />
            </View>
          </View>
        )}

        {/* Top Sessions & Pacing Insights */}
        {workouts.length > 0 && goalProgress && (
          <View style={styles.insightsSection}>
            {/* Top Activities - Single Session */}
            <Text style={styles.sectionTitle}>Top Activities - Single Session</Text>
            
            {/* Longest Distance */}
            {(() => {
              const maxMiles = workouts.reduce((max, w) => 
                (w.miles || 0) > (max.miles || 0) ? w : max, workouts[0]);
              if (maxMiles.miles && maxMiles.miles > 0) {
                return (
                  <View style={styles.highlightCard}>
                    <View style={styles.highlightLeft}>
                      <Text style={styles.highlightIcon}>📈</Text>
                      <View>
                        <Text style={styles.highlightTitle}>Longest Distance</Text>
                        <Text style={styles.highlightSubtitle}>{maxMiles.activity} • {maxMiles.source}</Text>
                      </View>
                    </View>
                    <Text style={styles.highlightValue}>{maxMiles.miles.toFixed(1)} mi</Text>
                  </View>
                );
              }
              return null;
            })()}

            {/* Most Weight Lifted */}
            {(() => {
              const maxWeight = workouts.reduce((max, w) => 
                (w.weightLifted || 0) > (max.weightLifted || 0) ? w : max, workouts[0]);
              if (maxWeight.weightLifted && maxWeight.weightLifted > 0) {
                return (
                  <View style={[styles.highlightCard, styles.highlightCardPurple]}>
                    <View style={styles.highlightLeft}>
                      <Text style={styles.highlightIcon}>🏋️</Text>
                      <View>
                        <Text style={styles.highlightTitle}>Most Weight Lifted</Text>
                        <Text style={styles.highlightSubtitle}>{maxWeight.activity} • {maxWeight.source}</Text>
                      </View>
                    </View>
                    <Text style={[styles.highlightValue, styles.highlightValuePurple]}>
                      {formatNumber(maxWeight.weightLifted)} lbs
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

            {/* Top Activities - All Time */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Top Activities - All Time</Text>
            {(() => {
              const activityMap = new Map<string, { count: number; minutes: number }>();
              workouts.forEach(w => {
                const existing = activityMap.get(w.activity) || { count: 0, minutes: 0 };
                activityMap.set(w.activity, {
                  count: existing.count + 1,
                  minutes: existing.minutes + w.minutes,
                });
              });
              const topActivities = Array.from(activityMap.entries())
                .sort((a, b) => b[1].minutes - a[1].minutes)
                .slice(0, 3);
              
              return topActivities.map(([activity, stats]) => (
                <View key={activity} style={styles.activityCard}>
                  <View style={styles.activityLeft}>
                    <Text style={styles.activityIcon}>
                      {activity.toLowerCase().includes('cycling') ? '🚴' : 
                       activity.toLowerCase().includes('weight') ? '🏋️' : '🏃'}
                    </Text>
                    <View>
                      <Text style={styles.activityName}>{activity}</Text>
                      <Text style={styles.activityCount}>{stats.count} sessions</Text>
                    </View>
                  </View>
                  <Text style={styles.activityMinutes}>{formatNumber(stats.minutes)} min</Text>
                </View>
              ));
            })()}

            {/* Q Pacing Insights */}
            {(() => {
              const now = new Date();
              const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
              const currentYear = now.getFullYear();
              
              // Calculate days remaining in quarter
              const quarterEnd = new Date(currentYear, currentQuarter * 3, 0);
              const daysRemaining = Math.max(0, Math.floor((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + 1);
              
              // Sessions needed
              const sessionsNeeded = Math.max(0, goalProgress.target.sessions - goalProgress.actual.sessions);
              
              // Required pace
              const dailyPace = daysRemaining > 0 ? sessionsNeeded / daysRemaining : 0;
              let paceText = 'On track!';
              if (dailyPace > 0) {
                if (dailyPace < 0.5) paceText = 'Every other day';
                else if (dailyPace < 1) paceText = `Every ${Math.round(1/dailyPace)} days`;
                else paceText = `${dailyPace.toFixed(1)} sessions/day`;
              }

              return (
                <View style={styles.pacingCard}>
                  <Text style={styles.pacingTitle}>Q{currentQuarter} Pacing Insights</Text>
                  
                  <View style={styles.pacingRow}>
                    <View style={styles.pacingLeft}>
                      <Text style={styles.pacingIcon}>🎯</Text>
                      <Text style={styles.pacingLabel}>Sessions needed</Text>
                    </View>
                    <Text style={styles.pacingValue}>{sessionsNeeded} sessions</Text>
                  </View>
                  
                  <View style={styles.pacingRow}>
                    <View style={styles.pacingLeft}>
                      <Text style={styles.pacingIcon}>📅</Text>
                      <Text style={styles.pacingLabel}>Days remaining</Text>
                    </View>
                    <Text style={styles.pacingValue}>{daysRemaining} days</Text>
                  </View>
                  
                  <View style={styles.pacingRow}>
                    <View style={styles.pacingLeft}>
                      <Text style={styles.pacingIcon}>⏱️</Text>
                      <Text style={styles.pacingLabel}>Required pace</Text>
                    </View>
                    <Text style={styles.pacingValue}>{paceText}</Text>
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* Recent Workouts */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {workouts.slice(0, 5).map((workout) => (
            <View key={workout.id} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutActivity}>{workout.activity}</Text>
                <Text style={styles.workoutSource}>{workout.source}</Text>
              </View>
              <Text style={styles.workoutDetails}>
                {workout.minutes} min
                {workout.miles ? ` • ${workout.miles.toFixed(1)} mi` : ''}
                {workout.weightLifted ? ` • ${formatNumber(workout.weightLifted)} lbs` : ''}
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
    paddingBottom: 8,
    color: '#1a1a1a',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  goalSection: {
    margin: 16,
    marginTop: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#3b82f6',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  progressIcon: {
    fontSize: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressStatus: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  progressStats: {
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressValueLight: {
    fontSize: 14,
    color: '#6b7280',
  },
  recentSection: {
    margin: 16,
    marginTop: 8,
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
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutActivity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  workoutSource: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  workoutDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  workoutDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  insightsSection: {
    margin: 16,
    marginTop: 8,
  },
  highlightCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  highlightCardPurple: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  highlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  highlightIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  highlightSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  highlightValuePurple: {
    color: '#7c3aed',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  activityCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  activityMinutes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  pacingCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  pacingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 16,
  },
  pacingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pacingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pacingIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  pacingLabel: {
    fontSize: 15,
    color: '#1e40af',
  },
  pacingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a8a',
  },
});
