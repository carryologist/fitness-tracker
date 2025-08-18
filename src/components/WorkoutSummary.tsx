'use client'

import { useMemo } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { Activity, Clock, MapPin, Weight, TrendingUp, Calendar } from 'lucide-react'

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
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
        No workout data available for summary
      </div>
    )
  }

  const StatCard = ({ 
    icon, 
    title, 
    value, 
    subtitle, 
    color = 'blue' 
  }: {
    icon: React.ReactNode
    title: string
    value: string | number
    subtitle?: string
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      red: 'bg-red-50 text-red-600 border-red-200'
    }

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700">{title}</h4>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Workout Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Calendar className="w-4 h-4" />}
            title="Total Sessions"
            value={summaryStats.totalSessions}
            color="blue"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            title="Avg Minutes"
            subtitle="per session"
            value={summaryStats.avgMinutesPerSession}
            color="green"
          />
          {summaryStats.avgMilesPerSession > 0 && (
            <StatCard
              icon={<MapPin className="w-4 h-4" />}
              title="Avg Miles"
              subtitle="per cardio session"
              value={summaryStats.avgMilesPerSession.toFixed(1)}
              color="purple"
            />
          )}
          {summaryStats.avgWeightPerSession > 0 && (
            <StatCard
              icon={<Weight className="w-4 h-4" />}
              title="Avg Weight"
              subtitle="per lifting session"
              value={`${summaryStats.avgWeightPerSession.toLocaleString()} lbs`}
              color="orange"
            />
          )}
        </div>
      </div>

      {/* Activity Breakdown */}
      {summaryStats.activityAverages.length > 1 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            By Activity Type
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {summaryStats.activityAverages.map((activity) => {
              return (
                <div key={activity.activity} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-700">{activity.activity}</h5>
                    <span className="text-xs text-gray-500">{activity.count} sessions</span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>Avg: {activity.avgMinutes} min</div>
                    {activity.avgMiles > 0 && <div>Avg: {activity.avgMiles.toFixed(1)} mi</div>}
                    {activity.avgWeight > 0 && <div>Avg: {activity.avgWeight.toLocaleString()} lbs</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}