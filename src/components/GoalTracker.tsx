'use client'

import { useMemo } from 'react'
import { WorkoutSession, Goal } from './WorkoutDashboard'
import { calculateGoalProgress } from '../utils/goalCalculations'
import { Plus, Edit2, Target, Calendar, Weight } from 'lucide-react'

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
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight Lifted</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">This Quarter</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {progressPercentage.weight.toFixed(0)}% of expected progress
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Actual Progress</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {formatNumber(actualProgress.weight)} lbs
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Expected Progress</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatNumber(expectedProgress.weight)} lbs
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Target</span>
                  <span className="text-gray-900 dark:text-gray-100">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}