'use client'

import { useMemo } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { Activity, Clock, MapPin, Weight, TrendingUp, Calendar } from 'lucide-react'
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
            value={formatNumber(summaryStats.avgMinutesPerSession)}
            color="green"
          />
          {summaryStats.avgMilesPerSession > 0 && (
            <StatCard
              icon={<MapPin className="w-4 h-4" />}
              title="Avg Miles"
              subtitle="per cardio session"
              value={formatNumber(summaryStats.avgMilesPerSession)}
              color="purple"
            />
          )}
          {summaryStats.avgWeightPerSession > 0 && (
            <StatCard
              icon={<Weight className="w-4 h-4" />}
              title="Avg Weight"
              subtitle="per lifting session"
              value={`${formatNumber(summaryStats.avgWeightPerSession)} lbs`}
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
              // Determine activity type and appropriate emoji
              const activityLower = activity.activity.toLowerCase()
              let emoji = '🏃' // default
              let isCardio = false
              let isLifting = false
              
              if (activityLower.includes('cycling') || activityLower.includes('bike')) {
                emoji = '🚴'
                isCardio = true
              } else if (activityLower.includes('running') || activityLower.includes('run')) {
                emoji = '🏃'
                isCardio = true
              } else if (activityLower.includes('lifting') || activityLower.includes('weight') || activityLower.includes('strength')) {
                emoji = '🏋️'
                isLifting = true
              } else if (activityLower.includes('swimming') || activityLower.includes('swim')) {
                emoji = '🏊'
                isCardio = true
              } else if (activityLower.includes('walking') || activityLower.includes('walk')) {
                emoji = '🚶'
                isCardio = true
              } else if (activityLower.includes('yoga')) {
                emoji = '🧘'
              } else if (activityLower.includes('hiking') || activityLower.includes('hike')) {
                emoji = '🥾'
                isCardio = true
              }
              
              return (
                <div key={activity.activity} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emoji}</span>
                      <h5 className="text-sm font-medium text-gray-700">{activity.activity}</h5>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {activity.count} session{activity.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatNumber(activity.avgMinutes)} min avg</span>
                    </div>
                    {isCardio && activity.avgMiles > 0 && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{formatNumber(activity.avgMiles)} mi avg</span>
                      </div>
                    )}
                    {isLifting && activity.avgWeight > 0 && (
                      <div className="flex items-center gap-1">
                        <Weight className="w-3 h-3" />
                        <span>{formatNumber(activity.avgWeight)} lbs avg</span>
                      </div>
                    )}
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