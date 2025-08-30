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

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

function getQuarterMonths(quarter: number): [number, number, number] {
  const start = (quarter - 1) * 3
  return [start, start + 1, start + 2]
}

function calculateQuarterlyProgress(sessions: WorkoutSession[], quarter: number, year: number) {
  const quarterMonths = getQuarterMonths(quarter)
  const relevantSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date)
    return quarterMonths.includes(sessionDate.getMonth()) && sessionDate.getFullYear() === year
  })
  
  return {
    sessions: relevantSessions.length,
    minutes: relevantSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
    miles: relevantSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
    weight: relevantSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
  }
}

function calculateAnnualProgress(sessions: WorkoutSession[], year: number) {
  const relevantSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date)
    return sessionDate.getFullYear() === year
  })
  
  return {
    sessions: relevantSessions.length,
    minutes: relevantSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
    miles: relevantSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
    weight: relevantSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
  }
}

function calculateExpectedProgress(goals: { sessions: number, minutes: number, miles: number, weight: number }, viewMode: 'quarterly' | 'annual') {
  const now = new Date()
  const currentYear = now.getFullYear()
  
  if (viewMode === 'quarterly') {
    const currentQuarter = getQuarter(now)
    const quarterMonths = getQuarterMonths(currentQuarter)
    const quarterStart = new Date(currentYear, quarterMonths[0], 1)
    const quarterEnd = new Date(currentYear, quarterMonths[2] + 1, 0)
    const totalDaysInQuarter = Math.floor((quarterEnd.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const daysPassed = Math.floor((now.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const quarterProgress = daysPassed / totalDaysInQuarter
    
    return {
      sessions: goals.sessions * quarterProgress,
      minutes: goals.minutes * quarterProgress,
      miles: goals.miles * quarterProgress,
      weight: goals.weight * quarterProgress
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
  const [viewMode, setViewMode] = useState<'quarterly' | 'annual'>('quarterly')
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const currentQuarter = getQuarter(currentDate)

  // Define current goals based on view mode
  // Quarterly goals: 2925 minutes, 125000 lbs, 65 sessions
  const currentGoals = viewMode === 'quarterly' 
    ? {
        sessions: 65,      // 5 sessions/week × 13 weeks
        minutes: 2925,     // 45 min/day × 5 days/week × 13 weeks
        miles: goals.monthly.miles * 3,  // Keep miles as monthly * 3
        weight: 125000     // 500,000 lbs/year ÷ 4 quarters
      }
    : goals.annual

  // Calculate progress for current period
  const progress = viewMode === 'quarterly'
    ? calculateQuarterlyProgress(sessions, currentQuarter, currentYear)
    : calculateAnnualProgress(sessions, currentYear)
    
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
  
  const getQuarterLabel = (quarter: number) => {
    const labels = ['Q1', 'Q2', 'Q3', 'Q4']
    return labels[quarter - 1]
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header with responsive layout */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">2025 Fitness Challenge</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress towards your quarterly goals</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('quarterly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'quarterly'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {getQuarterLabel(currentQuarter)}
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'annual'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
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