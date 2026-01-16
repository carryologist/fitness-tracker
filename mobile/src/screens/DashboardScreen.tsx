import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../api/client';
import { WorkoutSession, Goal } from '../../shared/types';
import { StatCard } from '../components/StatCard';
import { ProgressBar } from '../components/ProgressBar';
import { useSettings } from '../context/SettingsContext';
import { darkTheme, lightTheme } from '../theme/themes';

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
  const { isDark } = useSettings();
  const theme = isDark ? darkTheme : lightTheme;
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

  const styles = createStyles(isDark, theme);

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
          <StatCard title="Sessions" value={totalSessions} icon="📅" gradient={['#6366f1', '#8b5cf6']} />
          <StatCard title="Minutes" value={formatNumber(totalMinutes)} icon="⏱️" gradient={['#06b6d4', '#22d3ee']} />
          <StatCard title="Miles" value={totalMiles.toFixed(1)} icon="🚴" gradient={['#10b981', '#34d399']} />
          <StatCard title="Weight Lifted" value={formatNumber(totalWeight)} icon="🏋️" gradient={['#f97316', '#fb923c']} />
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
              <ProgressBar progress={goalProgress.progress.weight} color="#f97316" gradientColors={['#f97316', '#fb923c']} />
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
              <ProgressBar progress={goalProgress.progress.minutes} color="#3b82f6" gradientColors={['#06b6d4', '#22d3ee']} />
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
              <ProgressBar progress={goalProgress.progress.sessions} color="#10b981" gradientColors={['#10b981', '#34d399']} />
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

const createStyles = (isDark: boolean, theme: typeof darkTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    padding: 16,
    paddingBottom: 8,
    color: theme.textPrimary,
    letterSpacing: -0.5,
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
    fontWeight: '700',
    color: theme.textPrimary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: theme.primary,
  },
  toggleText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  progressCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  progressIcon: {
    fontSize: 22,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  progressStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  progressStats: {
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  progressLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  progressValueLight: {
    fontSize: 14,
    color: theme.textMuted,
  },
  recentSection: {
    margin: 16,
    marginTop: 8,
  },
  workoutCard: {
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutActivity: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  workoutSource: {
    fontSize: 12,
    color: theme.textSecondary,
    backgroundColor: theme.cardLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  workoutDetails: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
  },
  workoutDate: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
  },
  insightsSection: {
    margin: 16,
    marginTop: 8,
  },
  highlightCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  highlightCardPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  highlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  highlightIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  highlightSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  highlightValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#34d399',
  },
  highlightValuePurple: {
    color: '#a78bfa',
  },
  activityCard: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  activityCount: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  activityMinutes: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  pacingCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
  },
  pacingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#818cf8',
    marginBottom: 16,
  },
  pacingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pacingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pacingIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  pacingLabel: {
    fontSize: 15,
    color: '#a5b4fc',
  },
  pacingValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#c7d2fe',
  },
});
