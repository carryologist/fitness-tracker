import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore - no types available
import { LineChart } from 'react-native-gifted-charts';
import { api } from '../api/client';
import { WorkoutSession } from '../../shared/types';
import { useSettings } from '../context/SettingsContext';
import { darkTheme, lightTheme } from '../theme/themes';
import { applyCreditMultiplierToAll, CreditedWorkout } from '../utils/workoutCredits';

type ViewMode = 'annual' | 'monthly';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

export function ChartsScreen() {
  const { isDark, settings } = useSettings();
  const theme = isDark ? darkTheme : lightTheme;
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('annual');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const data = await api.getWorkouts();
      const filtered = data.filter((w) => {
        const year = new Date(w.date).getFullYear();
        return year === 2026;
      });
      setWorkouts(filtered);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    }
  };

  // Apply credit multiplier
  const creditedWorkouts = useMemo(
    () => applyCreditMultiplierToAll(workouts, settings.outdoorMultiplier),
    [workouts, settings.outdoorMultiplier]
  );

  // Calculate chart data
  const chartData = useMemo(() => {
    if (viewMode === 'annual') {
      // Group by month
      const monthlyData = MONTHS.map((month, index) => {
        const monthWorkouts = creditedWorkouts.filter((w) => {
          const d = new Date(w.date);
          return d.getMonth() === index;
        });
        return {
          label: month,
          minutes: monthWorkouts.reduce((sum, w) => sum + w.creditedMinutes, 0),
          miles: monthWorkouts.reduce((sum, w) => sum + (w.creditedMiles || 0), 0),
          weight: monthWorkouts.reduce((sum, w) => sum + (w.weightLifted || 0), 0),
        };
      });
      return monthlyData;
    } else {
      // Group by day for selected month
      const daysInMonth = new Date(2026, selectedMonth + 1, 0).getDate();
      const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dayWorkouts = creditedWorkouts.filter((w) => {
          const d = new Date(w.date);
          return d.getMonth() === selectedMonth && d.getDate() === day;
        });
        return {
          label: day.toString(),
          minutes: dayWorkouts.reduce((sum, w) => sum + w.creditedMinutes, 0),
          miles: dayWorkouts.reduce((sum, w) => sum + (w.creditedMiles || 0), 0),
          weight: dayWorkouts.reduce((sum, w) => sum + (w.weightLifted || 0), 0),
        };
      });
      return dailyData;
    }
  }, [creditedWorkouts, viewMode, selectedMonth]);

  // Prepare line chart data
  const milesData = chartData.map((d, i) => ({
    value: d.miles,
    label: viewMode === 'annual' ? d.label : (i % 5 === 0 ? d.label : ''),
    dataPointText: d.miles > 0 ? formatNumber(d.miles) : '',
  }));

  const minutesData = chartData.map((d, i) => ({
    value: d.minutes,
    label: viewMode === 'annual' ? d.label : (i % 5 === 0 ? d.label : ''),
    dataPointText: d.minutes > 0 ? formatNumber(d.minutes) : '',
  }));

  const weightData = chartData.map((d, i) => ({
    value: d.weight / 1000, // Scale down for display
    label: viewMode === 'annual' ? d.label : (i % 5 === 0 ? d.label : ''),
    dataPointText: d.weight > 0 ? formatNumber(d.weight) : '',
  }));

  // Calculate max values for scaling
  const maxMinutesMiles = Math.max(
    ...chartData.map((d) => Math.max(d.minutes, d.miles)),
    1
  );
  const maxWeight = Math.max(...chartData.map((d) => d.weight / 1000), 1);

  const styles = createStyles(isDark, theme);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Charts</Text>

        {/* View Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'annual' && styles.toggleActive]}
            onPress={() => setViewMode('annual')}
          >
            <Text style={[styles.toggleText, viewMode === 'annual' && styles.toggleTextActive]}>
              Annual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'monthly' && styles.toggleActive]}
            onPress={() => setViewMode('monthly')}
          >
            <Text style={[styles.toggleText, viewMode === 'monthly' && styles.toggleTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Month Selector (for monthly view) */}
        {viewMode === 'monthly' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthSelector}
            contentContainerStyle={styles.monthSelectorContent}
          >
            {MONTHS.map((month, index) => (
              <TouchableOpacity
                key={month}
                style={[styles.monthButton, selectedMonth === index && styles.monthButtonActive]}
                onPress={() => setSelectedMonth(index)}
              >
                <Text style={[styles.monthText, selectedMonth === index && styles.monthTextActive]}>
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Chart Title */}
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {viewMode === 'annual' ? '2026 Progress by Month' : `${MONTHS[selectedMonth]} 2026 Daily Progress`}
          </Text>
          <Text style={styles.chartSubtitle}>
            {viewMode === 'annual' ? 'Your fitness journey over the year' : 'Your daily activity'}
          </Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Miles</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Minutes</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.legendText}>Weight (k lbs)</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <LineChart
            data={minutesData}
            data2={milesData}
            data3={weightData}
            height={250}
            width={screenWidth - 64}
            spacing={viewMode === 'annual' ? (screenWidth - 100) / 12 : (screenWidth - 100) / 31}
            initialSpacing={10}
            color1="#3b82f6"
            color2="#10b981"
            color3="#f97316"
            textColor1={theme.textSecondary}
            dataPointsColor1="#3b82f6"
            dataPointsColor2="#10b981"
            dataPointsColor3="#f97316"
            dataPointsRadius={4}
            curved
            thickness={2}
            hideRules
            yAxisColor={theme.textMuted}
            xAxisColor={theme.textMuted}
            yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
            noOfSections={5}
            maxValue={Math.max(maxMinutesMiles, maxWeight) * 1.2}
            backgroundColor="transparent"
            rulesColor={isDark ? '#2d2d44' : '#e5e7eb'}
            rulesType="solid"
            showVerticalLines
            verticalLinesColor={isDark ? '#2d2d44' : '#e5e7eb'}
          />
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>
            {viewMode === 'annual' ? 'Year to Date' : `${MONTHS[selectedMonth]} Totals`}
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {formatNumber(chartData.reduce((sum, d) => sum + d.minutes, 0))}
              </Text>
              <Text style={styles.summaryLabel}>Minutes</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {formatNumber(Math.round(chartData.reduce((sum, d) => sum + d.miles, 0) * 10) / 10)}
              </Text>
              <Text style={styles.summaryLabel}>Miles</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {formatNumber(chartData.reduce((sum, d) => sum + d.weight, 0))}
              </Text>
              <Text style={styles.summaryLabel}>Lbs Lifted</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean, theme: typeof darkTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      color: theme.textPrimary,
      letterSpacing: -0.5,
    },
    toggleContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: isDark ? '#1a1a2e' : '#f1f5f9',
      borderRadius: 12,
      padding: 4,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
    },
    toggleActive: {
      backgroundColor: '#6366f1',
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    toggleTextActive: {
      color: '#fff',
    },
    monthSelector: {
      marginBottom: 16,
    },
    monthSelectorContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    monthButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#1a1a2e' : '#f1f5f9',
      marginRight: 8,
    },
    monthButtonActive: {
      backgroundColor: '#6366f1',
    },
    monthText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    monthTextActive: {
      color: '#fff',
    },
    chartHeader: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    chartSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginBottom: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    chartContainer: {
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    summaryContainer: {
      paddingHorizontal: 16,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 12,
    },
    summaryGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    summaryLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
  });
