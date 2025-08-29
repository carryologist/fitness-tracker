'use client'

import { useMemo } from 'react'
import { WorkoutSession, Goal } from './WorkoutDashboard'
import { calculateGoalProgress } from '../utils/goalCalculations'
import { Plus, Edit2, Target, Calendar, Weight, Clock, TrendingUp } from 'lucide-react'

interface GoalTrackerProps {
  goals: Goal[]
  sessions: WorkoutSession[]
  onAddGoal: () => void
  onEditGoal: (goal: Goal) => void
}

export function GoalTracker({ goals, sessions, onAddGoal, onEditGoal }: GoalTrackerProps) {
  const activeGoal = goals.find(g => g.year === new Date().getFullYear())
  
  const progress = useMemo(() => {
    if (!activeGoal) return null
    return calculateGoalProgress(activeGoal, sessions)
  }, [activeGoal, sessions])

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-US')
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Goals</h3>
        <p className="text-gray-600 mb-6">Set up your fitness challenge goals to track your progress</p>
        <button
          onClick={onAddGoal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Goal
        </button>
      </div>
    )
  }

  if (!activeGoal || !progress) {
    return (
      <div className="text-center py-12">
        <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Goal for {new Date().getFullYear()}</h3>
        <p className="text-gray-600 mb-6">Create a goal for this year to track your progress</p>
        <button
          onClick={onAddGoal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create {new Date().getFullYear()} Goal
        </button>
      </div>
    )
  }

  // Calculate progress percentages
  const actualProgress = {
    weight: progress.actualWeightLifted.quarterToDate,
    minutes: progress.actualMinutes.quarterToDate,
    sessions: progress.actualSessions.quarterToDate
  }

  const expectedProgress = {
    weight: progress.expectedWeightLifted.quarterToDate,
    minutes: progress.expectedMinutes.quarterToDate,
    sessions: progress.expectedSessions.quarterToDate
  }

  const progressPercentage = {
    weight: expectedProgress.weight > 0 ? (actualProgress.weight / expectedProgress.weight) * 100 : 0,
    minutes: expectedProgress.minutes > 0 ? (actualProgress.minutes / expectedProgress.minutes) * 100 : 0,
    sessions: expectedProgress.sessions > 0 ? (actualProgress.sessions / expectedProgress.sessions) * 100 : 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{activeGoal.name}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Q3 {activeGoal.year} Progress</p>
        </div>
        <button
          onClick={() => onEditGoal(activeGoal)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Quarterly Progress */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-50">Quarterly Progress (Q3)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Weight Lifted */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-baseline mb-2">
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight Lifted</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full ${
                  progressPercentage.weight >= 100 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  progressPercentage.weight >= 75 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }">
                  {progressPercentage.weight >= 100 ? 'On Track' : 'Behind'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Actual</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {formatNumber(actualProgress.weight)} lbs
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Expected</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatNumber(expectedProgress.weight)} lbs
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Target</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatNumber(activeGoal.quarterlyWeightTarget)} lbs
                  </span>
                </div>
                <div className="relative pt-2">
                  <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      style={{ width: `${Math.min(progressPercentage.weight, 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                        progressPercentage.weight >= 100 ? 'bg-success-500' : 
                        progressPercentage.weight >= 75 ? 'bg-primary-500' : 
                        progressPercentage.weight >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {progressPercentage.weight.toFixed(0)}% of expected
                  </div>
                </div>
              </div>
            </div>

            {/* Minutes Completed */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-baseline mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Minutes</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full ${
                  progressPercentage.minutes >= 100 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  progressPercentage.minutes >= 75 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }">
                  {progressPercentage.minutes >= 100 ? 'On Track' : 'Behind'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Actual</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {formatNumber(actualProgress.minutes)} min
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Expected</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatNumber(expectedProgress.minutes)} min
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Target</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatNumber(activeGoal.quarterlyMinutesTarget)} min
                  </span>
                </div>
                <div className="relative pt-2">
                  <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      style={{ width: `${Math.min(progressPercentage.minutes, 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                        progressPercentage.minutes >= 100 ? 'bg-success-500' : 
                        progressPercentage.minutes >= 75 ? 'bg-blue-500' : 
                        progressPercentage.minutes >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {progressPercentage.minutes.toFixed(0)}% of expected
                  </div>
                </div>
              </div>
            </div>

            {/* Sessions Completed */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-baseline mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sessions</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full ${
                  progressPercentage.sessions >= 100 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  progressPercentage.sessions >= 75 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }">
                  {progressPercentage.sessions >= 100 ? 'On Track' : 'Behind'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Actual</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {actualProgress.sessions} sessions
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
                    {activeGoal.quarterlySessionsTarget} sessions
                  </span>
                </div>
                <div className="relative pt-2">
                  <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      style={{ width: `${Math.min(progressPercentage.sessions, 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                        progressPercentage.sessions >= 100 ? 'bg-success-500' : 
                        progressPercentage.sessions >= 75 ? 'bg-green-500' : 
                        progressPercentage.sessions >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {progressPercentage.sessions.toFixed(0)}% of expected
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Annual Progress */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-50">Annual Progress (2025)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Similar structure for annual metrics */}
          </div>
        </div>
      </div>
    </div>
  )
}