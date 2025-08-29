'use client'

import React, { useMemo, useState } from 'react'
import { WorkoutSession } from './WorkoutDashboard'
import { Target, TrendingUp, Calendar, Activity, Dumbbell, CheckCircle } from 'lucide-react'
import { formatNumber } from '../utils/numberFormat'

interface GoalTrackerProps {
  sessions: WorkoutSession[]
  goals: {
    annual: {
      sessions: number
      minutes: number
      miles: number
      weight: number
    }
    monthly: {
      sessions: number
      minutes: number
      miles: number
      weight: number
    }
  }
}

export function GoalTracker({ sessions, goals }: GoalTrackerProps) {
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly')
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const currentQuarter = Math.floor(currentMonth / 3) + 1

  // Calculate progress for current period
  const progress = useMemo(() => {
    if (viewMode === 'monthly') {
      // Monthly progress
      const monthSessions = sessions.filter(s => {
        const sessionDate = new Date(s.date)
        return sessionDate.getMonth() === currentMonth && 
               sessionDate.getFullYear() === currentYear
      })

      return {
        sessions: monthSessions.length,
        minutes: monthSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
        miles: monthSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
        weight: monthSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
      }
    } else {
      // Annual progress
      const yearSessions = sessions.filter(s => {
        const sessionDate = new Date(s.date)
        return sessionDate.getFullYear() === currentYear
      })

      return {
        sessions: yearSessions.length,
        minutes: yearSessions.reduce((sum, s) => sum + (s.minutes || 0), 0),
        miles: yearSessions.reduce((sum, s) => sum + (s.miles || 0), 0),
        weight: yearSessions.reduce((sum, s) => sum + (s.weightLifted || 0), 0)
      }
    }
  }, [sessions, currentMonth, currentYear, viewMode])

  // Calculate expected progress based on current date
  const expectedProgress = useMemo(() => {
    const now = new Date()
    
    if (viewMode === 'monthly') {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      const daysPassed = now.getDate()
      const monthProgress = daysPassed / daysInMonth

      return {
        sessions: goals.monthly.sessions * monthProgress,
        minutes: goals.monthly.minutes * monthProgress,
        miles: goals.monthly.miles * monthProgress,
        weight: goals.monthly.weight * monthProgress
      }
    } else {
      const startOfYear = new Date(currentYear, 0, 1)
      const daysPassed = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const yearProgress = daysPassed / 365

      return {
        sessions: goals.annual.sessions * yearProgress,
        minutes: goals.annual.minutes * yearProgress,
        miles: goals.annual.miles * yearProgress,
        weight: goals.annual.weight * yearProgress
      }
    }
  }, [currentMonth, currentYear, goals, viewMode])

  const currentGoals = viewMode === 'monthly' ? goals.monthly : goals.annual

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

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weight Lifted */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Dumbbell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Weight Lifted</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {progress.weight >= expectedProgress.weight ? 'On Track' : 'Behind'}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Actual</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatNumber(progress.weight)} lbs
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expected</span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatNumber(Math.round(expectedProgress.weight))} lbs
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target</span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatNumber(currentGoals.weight)} lbs
              </span>
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{Math.round((progress.weight / currentGoals.weight) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (progress.weight / currentGoals.weight) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Minutes */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Minutes Completed</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {progress.minutes >= expectedProgress.minutes ? 'On Track' : 'Behind'}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Actual</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatNumber(progress.minutes)} min
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expected</span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatNumber(Math.round(expectedProgress.minutes))} min
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target</span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatNumber(currentGoals.minutes)} min
              </span>
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{Math.round((progress.minutes / currentGoals.minutes) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (progress.minutes / currentGoals.minutes) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sessions Completed</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {progress.sessions >= expectedProgress.sessions ? 'On Track' : 'Behind'}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Actual</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {progress.sessions} sessions
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expected</span>
              <span className="text-gray-700 dark:text-gray-300">
                {Math.round(expectedProgress.sessions)} sessions
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target</span>
              <span className="text-gray-700 dark:text-gray-300">
                {currentGoals.sessions} sessions
              </span>
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{Math.round((progress.sessions / currentGoals.sessions) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (progress.sessions / currentGoals.sessions) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}