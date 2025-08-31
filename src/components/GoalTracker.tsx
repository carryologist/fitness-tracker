'use client'

import React, { useState, useEffect } from 'react'
import { Dumbbell, Activity, CheckCircle, Calendar, BarChart3 } from 'lucide-react'
import { WorkoutSession } from './WorkoutDashboard'
import { formatNumber } from '../utils/numberFormat'

interface GoalTrackerProps {
  sessions: WorkoutSession[]
  goals: {
    quarterly: {
      sessions: number
      minutes: number
      weight: number
    }
    annual: {
      sessions: number
      minutes: number
      weight: number
    }
  }
}

type ViewMode = 'quarterly' | 'annual'

export function GoalTracker({ sessions, goals }: GoalTrackerProps) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('quarterly')
  
  useEffect(() => {
    setCurrentDate(new Date())
  }, [])
  
  if (!currentDate) {
    return null // Don't render on server
  }
  
  const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1
  const currentYear = currentDate.getFullYear()
  
  // Calculate date ranges based on view mode
  const getDateRange = () => {
    if (viewMode === 'quarterly') {
      const quarterStart = new Date(currentYear, (currentQuarter - 1) * 3, 1)
      const quarterEnd = new Date(currentYear, currentQuarter * 3, 0)
      return { start: quarterStart, end: quarterEnd }
    } else {
      const yearStart = new Date(currentYear, 0, 1)
      const yearEnd = new Date(currentYear, 11, 31)
      return { start: yearStart, end: yearEnd }
    }
  }
  
  const { start: periodStart, end: periodEnd } = getDateRange()
  
  // Filter sessions for the selected period
  const periodSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date)
    return sessionDate >= periodStart && sessionDate <= periodEnd
  })
  
  // Calculate actual values
  const actualSessions = periodSessions.length
  const actualMinutes = periodSessions.reduce((sum, session) => sum + (session.minutes || 0), 0)
  const actualWeight = periodSessions.reduce((sum, session) => sum + (session.weightLifted || 0), 0)
  
  // Get targets based on view mode
  const targets = viewMode === 'quarterly' ? goals.quarterly : goals.annual
  const targetSessions = targets.sessions
  const targetMinutes = targets.minutes
  const targetWeight = targets.weight
  
  // Calculate expected progress based on time elapsed
  const totalDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const daysElapsed = Math.floor((currentDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const timeProgress = Math.min(daysElapsed / totalDays, 1)
  
  const expectedSessions = targetSessions * timeProgress
  const expectedMinutes = targetMinutes * timeProgress
  const expectedWeight = targetWeight * timeProgress
  
  // Calculate progress percentages
  const sessionsProgress = (actualSessions / targetSessions) * 100
  const minutesProgress = (actualMinutes / targetMinutes) * 100
  const weightProgress = (actualWeight / targetWeight) * 100
  
  // Helper functions
  const getStatus = (actual: number, expected: number) => {
    if (actual >= expected) return 'On Track'
    if (actual >= expected * 0.8) return 'Slightly Behind'
    return 'Behind'
  }
  
  const getLabel = () => {
    if (viewMode === 'quarterly') {
      return `Q${currentQuarter} Goal Progress`
    } else {
      return `${currentYear} Annual Progress`
    }
  }
  
  const getDescription = () => {
    if (viewMode === 'quarterly') {
      return 'Track your quarterly fitness goals'
    } else {
      return 'Track your annual fitness goals'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header with toggle buttons */}
      <div className="mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {getLabel()}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getDescription()}
            </p>
          </div>
          
          {/* Toggle Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('quarterly')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${viewMode === 'quarterly' 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <Calendar className="w-4 h-4" />
              Q{currentQuarter}
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${viewMode === 'annual' 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <BarChart3 className="w-4 h-4" />
              Annual
            </button>
          </div>
        </div>
      </div>

      {/* Progress Cards - Vertical Layout */}
      <div className="space-y-4">
        {/* Weight Lifted */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Weight Lifted</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{getStatus(actualWeight, expectedWeight)}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Actual</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(actualWeight)} lbs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expected</span>
              <span className="text-gray-700 dark:text-gray-300">{Math.round(expectedWeight)} lbs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target</span>
              <span className="text-gray-700 dark:text-gray-300">{formatNumber(targetWeight)} lbs</span>
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(weightProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(weightProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Minutes Completed */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Minutes Completed</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{getStatus(actualMinutes, expectedMinutes)}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Actual</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(actualMinutes)} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expected</span>
              <span className="text-gray-700 dark:text-gray-300">{Math.round(expectedMinutes)} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target</span>
              <span className="text-gray-700 dark:text-gray-300">{formatNumber(targetMinutes)} min</span>
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(minutesProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(minutesProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Completed */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sessions Completed</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{getStatus(actualSessions, expectedSessions)}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Actual</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{actualSessions} sessions</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expected</span>
              <span className="text-gray-700 dark:text-gray-300">{Math.round(expectedSessions)} sessions</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target</span>
              <span className="text-gray-700 dark:text-gray-300">{targetSessions} sessions</span>
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(sessionsProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(sessionsProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}