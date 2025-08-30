'use client'

import React, { useMemo } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { Activity, Dumbbell, TrendingUp, Calendar } from 'lucide-react'
import { formatNumber } from '../utils/numberFormat'

interface WorkoutSummaryProps {
  sessions: WorkoutSession[]
  goals?: {
    monthly: {
      sessions: number
      minutes: number
      miles: number
      weight: number
    }
    annual: {
      sessions: number
      minutes: number
      miles: number
      weight: number
    }
  }
}

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

function getQuarterMonths(quarter: number): [number, number, number] {
  const start = (quarter - 1) * 3
  return [start, start + 1, start + 2]
}

function getQuarterLabel(quarter: number): string {
  const labels = ['Q1', 'Q2', 'Q3', 'Q4']
  return labels[quarter - 1]
}

export function WorkoutSummary({ sessions, goals }: WorkoutSummaryProps) {
  const summaryStats = useMemo(() => {
    if (sessions.length === 0) return null

    const totalSessions = sessions.length
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
    const totalMiles = sessions.reduce((sum, s) => sum + (s.miles || 0), 0)
    const totalWeight = sessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)

    // Activity breakdown
    const activityBreakdown = sessions.reduce((acc, session) => {
      const activity = session.activity || 'Other'
      if (!acc[activity]) {
        acc[activity] = { count: 0, minutes: 0 }
      }
      acc[activity].count++
      acc[activity].minutes += session.minutes || 0
      return acc
    }, {} as Record<string, { count: number; minutes: number }>)

    // Get top 3 activities
    const topActivities = Object.entries(activityBreakdown)
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 3)

    return {
      totalSessions,
      totalMinutes,
      totalMiles,
      totalWeight,
      topActivities
    }
  }, [sessions])

  // Calculate quarterly progress for pacing
  const pacingMetrics = useMemo(() => {
    if (!goals) return null
    
    const now = new Date()
    const currentQuarter = getQuarter(now)
    const currentYear = now.getFullYear()
    const quarterMonths = getQuarterMonths(currentQuarter)
    
    // Exact quarterly goals
    const quarterlyGoalMinutes = 2925  // 45 min/day × 5 days/week × 13 weeks
    const quarterlyGoalSessions = 65   // 5 sessions/week × 13 weeks
    const quarterlyGoalWeight = 125000 // 500,000 lbs/year ÷ 4
    
    // Get current quarter's progress
    const quarterSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date)
      return quarterMonths.includes(sessionDate.getMonth()) && 
             sessionDate.getFullYear() === currentYear
    })
    
    const minutesCompleted = quarterSessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
    const sessionsCompleted = quarterSessions.length
    const weightCompleted = quarterSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
    
    const minutesRemaining = Math.max(0, quarterlyGoalMinutes - minutesCompleted)
    const sessionsNeeded = Math.ceil(minutesRemaining / 45)
    
    // Calculate days remaining in quarter
    const quarterEnd = new Date(currentYear, quarterMonths[2] + 1, 0)
    const daysRemaining = Math.max(0, Math.floor((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    
    // Calculate required pace
    const dailyPace = daysRemaining > 0 ? sessionsNeeded / daysRemaining : 0
    
    return {
      currentQuarter,
      minutesCompleted,
      minutesRemaining,
      quarterlyGoalMinutes,
      sessionsCompleted,
      quarterlyGoalSessions,
      weightCompleted,
      quarterlyGoalWeight,
      sessionsNeeded,
      daysRemaining,
      dailyPace
    }
  }, [sessions, goals])

  if (!summaryStats) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No workout data available
      </div>
    )
  }

  const getActivityIcon = (activity: string) => {
    if (activity.toLowerCase().includes('cycling')) {
      return <Activity className="w-4 h-4 text-blue-500" />
    } else if (activity.toLowerCase().includes('weight') || activity.toLowerCase().includes('tonal')) {
      return <Dumbbell className="w-4 h-4 text-orange-500" />
    } else {
      return <TrendingUp className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Workout Summary</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Your all-time statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(summaryStats.totalSessions)}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Minutes</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(summaryStats.totalMinutes)}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Miles</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(summaryStats.totalMiles)}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Weight Lifted</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(summaryStats.totalWeight)} lbs
          </p>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Activities</h3>
        {summaryStats.topActivities.map(([activity, stats]) => (
          <div key={activity} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {getActivityIcon(activity)}
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{activity}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.count} sessions
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatNumber(stats.minutes)} min
            </p>
          </div>
        ))}
      </div>

      {/* Pacing Metrics */}
      {pacingMetrics && goals && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
            {getQuarterLabel(pacingMetrics.currentQuarter)} Pacing Insights
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Minutes:</span>
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {formatNumber(pacingMetrics.minutesCompleted)} / {formatNumber(pacingMetrics.quarterlyGoalMinutes)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Sessions:</span>
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {pacingMetrics.sessionsCompleted} / {pacingMetrics.quarterlyGoalSessions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700 dark:text-blue-300">Weight lifted:</span>
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {formatNumber(pacingMetrics.weightCompleted)} / {formatNumber(pacingMetrics.quarterlyGoalWeight)} lbs
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-700">
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Sessions needed (45 min):</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {pacingMetrics.sessionsNeeded} sessions
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Days remaining:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {pacingMetrics.daysRemaining} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300 font-medium">Required pace:</span>
                <span className="font-bold text-blue-900 dark:text-blue-100">
                  {pacingMetrics.dailyPace === 0 ? 'On track!' :
                   pacingMetrics.dailyPace < 0.5 ? 'Every other day' :
                   pacingMetrics.dailyPace < 1 ? `Every ${Math.round(1/pacingMetrics.dailyPace)} days` :
                   `${pacingMetrics.dailyPace.toFixed(1)} sessions/day`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}