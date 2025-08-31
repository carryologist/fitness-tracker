'use client'

import React, { useMemo } from 'react'
import { Activity, TrendingUp, Calendar, Weight } from 'lucide-react'
import { WorkoutSession } from './WorkoutDashboard'
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

export function WorkoutSummary({ sessions }: WorkoutSummaryProps) {
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
      return <Weight className="w-4 h-4 text-orange-500" />
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
            <Weight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
    </div>
  )
}