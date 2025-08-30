'use client'

import React, { useMemo, useState } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { Target, TrendingUp, Calendar, Activity, Dumbbell, CheckCircle } from 'lucide-react'
import { formatNumber } from '../utils/numberFormat'

interface GoalTrackerProps {
  sessions: WorkoutSession[]
  goals: {
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

function calculateProgress(sessions: WorkoutSession[], goals: { sessions: number, minutes: number, miles: number, weight: number }) {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  const relevantSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date)
    return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear
  })
  
  return {
    sessions: relevantSessions.length,
    minutes: relevantSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
    miles: relevantSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
    weight: relevantSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
  }
}

function calculateExpectedProgress(goals: { sessions: number, minutes: number, miles: number, weight: number }, viewMode: 'monthly' | 'annual') {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  if (viewMode === 'monthly') {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysPassed = now.getDate()
    const monthProgress = daysPassed / daysInMonth
    
    return {
      sessions: goals.sessions * monthProgress,
      minutes: goals.minutes * monthProgress,
      miles: goals.miles * monthProgress,
      weight: goals.weight * monthProgress
    }
  } else {
    const startOfYear = new Date(currentYear, 0, 1)
    const daysPassed = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const yearProgress = daysPassed / 365
    
    return {
      sessions: goals.sessions * yearProgress,
      minutes: goals.minutes * yearProgress,
      miles: goals.miles * yearProgress,
      weight: goals.weight * yearProgress
    }
  }
}

export function GoalTracker({ sessions, goals }: GoalTrackerProps) {
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly')
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const currentQuarter = Math.floor(currentMonth / 3) + 1

  // Define current goals based on view mode
  const currentGoals = viewMode === 'monthly' ? goals.monthly : goals.annual

  // Calculate progress for current period
  const progress = calculateProgress(sessions, currentGoals)
  const expectedProgress = calculateExpectedProgress(currentGoals, viewMode)
  
  // Extract values for cleaner code
  const actualWeight = progress.weight
  const expectedWeight = expectedProgress.weight
  const targetWeight = currentGoals.weight
  const weightProgress = (actualWeight / targetWeight) * 100
  
  const actualMinutes = progress.minutes
  const expectedMinutes = expectedProgress.minutes
  const targetMinutes = currentGoals.minutes
  const minutesProgress = (actualMinutes / targetMinutes) * 100
  
  const actualSessions = progress.sessions
  const expectedSessions = expectedProgress.sessions
  const targetSessions = currentGoals.sessions
  const sessionsProgress = (actualSessions / targetSessions) * 100
  
  const getStatus = (actual: number, expected: number) => {
    return actual >= expected ? 'On Track' : 'Behind'
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
            2025 Fitness Challenge
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your progress towards your {viewMode} goals
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'monthly'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('annual')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'annual'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Annual
          </button>
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
        
        {/* Pacing Metrics */}
        {viewMode === 'monthly' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Pacing Insights</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Sessions needed to catch up:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {Math.max(0, Math.ceil((expectedMinutes - actualMinutes) / 45))} sessions
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Days remaining in month:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {new Date(currentYear, currentMonth + 1, 0).getDate() - currentDate.getDate()} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Required pace:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {(() => {
                    const daysLeft = new Date(currentYear, currentMonth + 1, 0).getDate() - currentDate.getDate()
                    const sessionsNeeded = Math.max(0, Math.ceil((expectedMinutes - actualMinutes) / 45))
                    if (daysLeft === 0) return 'Last day!'
                    const pace = sessionsNeeded / daysLeft
                    if (pace <= 0) return 'On track!'
                    if (pace < 1) return 'Every other day'
                    return `${pace.toFixed(1)} sessions/day`
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}