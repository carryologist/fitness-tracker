'use client'

import { useMemo } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { Activity, Clock, MapPin, Weight, TrendingUp, Calendar, Bike } from 'lucide-react'
import { formatNumber } from '../utils/numberFormat'

interface WorkoutSummaryProps {
  sessions: WorkoutSession[]
}

export function WorkoutSummary({ sessions }: WorkoutSummaryProps) {
  const summaryStats = useMemo(() => {
    if (sessions.length === 0) return null

    // Group sessions by activity type
    const activityGroups = sessions.reduce((groups, session) => {
      const activity = session.activity.toLowerCase()
      if (!groups[activity]) {
        groups[activity] = []
      }
      groups[activity].push(session)
      return groups
    }, {} as Record<string, WorkoutSession[]>)

    // Calculate averages by activity type
    const activityAverages = Object.entries(activityGroups).map(([activity, sessions]) => {
      const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
      const totalMiles = sessions.reduce((sum, s) => sum + (s.miles || 0), 0)
      const totalWeight = sessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
      const sessionsWithMiles = sessions.filter(s => s.miles && s.miles > 0).length
      const sessionsWithWeight = sessions.filter(s => s.weightLifted && s.weightLifted > 0).length

      return {
        activity: activity.charAt(0).toUpperCase() + activity.slice(1),
        count: sessions.length,
        avgMinutes: Math.round(totalMinutes / sessions.length),
        avgMiles: sessionsWithMiles > 0 ? (totalMiles / sessionsWithMiles) : 0,
        avgWeight: sessionsWithWeight > 0 ? Math.round(totalWeight / sessionsWithWeight) : 0,
        totalMinutes,
        totalMiles,
        totalWeight
      }
    }).sort((a, b) => b.count - a.count) // Sort by frequency

    // Overall averages
    const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
    const totalMiles = sessions.reduce((sum, s) => sum + (s.miles || 0), 0)
    const totalWeight = sessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
    const sessionsWithMiles = sessions.filter(s => s.miles && s.miles > 0).length
    const sessionsWithWeight = sessions.filter(s => s.weightLifted && s.weightLifted > 0).length

    return {
      totalSessions: sessions.length,
      avgMinutesPerSession: Math.round(totalMinutes / sessions.length),
      avgMilesPerSession: sessionsWithMiles > 0 ? (totalMiles / sessionsWithMiles) : 0,
      avgWeightPerSession: sessionsWithWeight > 0 ? Math.round(totalWeight / sessionsWithWeight) : 0,
      totalMinutes,
      totalMiles,
      totalWeight,
      activityAverages: activityAverages.slice(0, 4) // Show top 4 activities
    }
  }, [sessions])

  if (!summaryStats) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No workout data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-4">Workout Summary</h2>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Sessions</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {summaryStats.totalSessions}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Minutes</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">per session</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {summaryStats.avgMinutesPerSession.toFixed(1)}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Miles</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">per cardio session</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {summaryStats.avgMilesPerSession.toFixed(1)}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Weight className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Weight</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">per lifting session</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {formatNumber(summaryStats.avgWeightPerSession)} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">lbs</span>
            </div>
          </div>
        </div>

        {/* By Activity Type */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            By Activity Type
          </h3>
          <div className="space-y-3">
            {summaryStats.activityAverages.map((activity) => (
              <div key={activity.activity} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {activity.activity === 'Cycling' && <Bike className="w-4 h-4 text-blue-500" />}
                    {activity.activity === 'Weight lifting' && <Weight className="w-4 h-4 text-orange-500" />}
                    {!['Cycling', 'Weight lifting'].includes(activity.activity) && <Activity className="w-4 h-4 text-gray-500" />}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{activity.activity}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.count} {activity.count === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{activity.avgMinutes.toFixed(0)} min avg</span>
                  </div>
                  {activity.avgMiles > 0 && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{activity.avgMiles.toFixed(1)} mi avg</span>
                    </div>
                  )}
                  {activity.avgWeight > 0 && (
                    <div className="flex items-center gap-1">
                      <Weight className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{formatNumber(activity.avgWeight)} lbs avg</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}