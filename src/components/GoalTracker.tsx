'use client'

import { periodMetrics, selectedQuarter, progressPercent } from '@/utils/goalPeriods'
import { workoutDay } from '@/lib/calendar'

import React, { useState, useEffect } from 'react'
import { Dumbbell, Activity, CheckCircle, Calendar, BarChart3 } from 'lucide-react'
import { WorkoutSession } from '@/types/workout'
import { formatNumber } from '../utils/numberFormat'

interface GoalTrackerProps {
  year?: number
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

export function GoalTracker({ sessions, goals, year }: GoalTrackerProps) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('quarterly')
  
  useEffect(() => {
    setCurrentDate(new Date())
  }, [])
  
  if (!currentDate) {
    return null // Don't render on server
  }
  
  const currentYear = year ?? Number(workoutDay(currentDate).slice(0, 4))
  const currentQuarter = selectedQuarter(currentYear, currentDate)
  const metrics = periodMetrics(sessions, currentYear, viewMode === 'quarterly' ? currentQuarter : undefined, currentDate)
  const actualSessions = metrics.sessions
  const actualMinutes = metrics.minutes
  const actualWeight = metrics.weight
  const targets = viewMode === 'quarterly' ? goals.quarterly : goals.annual
  const targetSessions = targets.sessions
  const targetMinutes = targets.minutes
  const targetWeight = targets.weight
  const timeProgress = metrics.fraction

  const expectedSessions = targetSessions * timeProgress
  const expectedMinutes = targetMinutes * timeProgress
  const expectedWeight = targetWeight * timeProgress
  
  // Calculate progress percentages
  const sessionsProgress = progressPercent(actualSessions, targetSessions)
  const minutesProgress = progressPercent(actualMinutes, targetMinutes)
  const weightProgress = progressPercent(actualWeight, targetWeight)
  
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
      return `${currentYear} Goal Progress`
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
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
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
      <div className="space-y-6">
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
              <span className="text-gray-700 dark:text-gray-300">{formatNumber(Math.round(expectedWeight))} lbs</span>
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
              <span className="text-gray-700 dark:text-gray-300">{formatNumber(Math.round(expectedMinutes))} min</span>
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