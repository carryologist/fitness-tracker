'use client'

import { useMemo, useState } from 'react'
import { WorkoutSession, Goal } from './WorkoutDashboard'
import { calculateGoalProgress } from '../utils/goalCalculations'
import { Plus, Edit3, Target, TrendingUp, Calendar, Clock } from 'lucide-react'

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

  if (!activeGoal) {
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

  if (!progress) return null

  const ProgressCard = ({ 
    title, 
    icon, 
    actual, 
    expected, 
    target, 
    unit, 
    period 
  }: {
    title: string
    icon: React.ReactNode
    actual: number
    expected: number
    target: number
    unit: string
    period: string
  }) => {
    const percentage = expected > 0 ? (actual / expected) * 100 : 0
    const isAhead = actual >= expected
    const isOnTrack = percentage >= 90
    
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{period}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isAhead ? 'bg-green-100 text-green-800' : 
            isOnTrack ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {isAhead ? 'Ahead' : isOnTrack ? 'On Track' : 'Behind'}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Actual Progress</span>
            <span className="font-medium">{actual.toLocaleString()} {unit}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Expected Progress</span>
            <span>{Math.round(expected).toLocaleString()} {unit}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total Target</span>
            <span>{target.toLocaleString()} {unit}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isAhead ? 'bg-green-500' : isOnTrack ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          
          <div className="text-xs text-gray-500">
            {Math.round(percentage)}% of expected progress
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{activeGoal.name}</h2>
          <p className="text-gray-600">Q{progress.currentQuarter} {progress.currentYear} Progress</p>
        </div>
        <button
          onClick={() => onEditGoal(activeGoal)}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Edit Goal
        </button>
      </div>

      {/* Quarterly Progress */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Quarterly Progress (Q{progress.currentQuarter})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProgressCard
            title="Weight Lifted"
            icon={<Target className="w-4 h-4" />}
            actual={progress.actualWeightLifted.quarterToDate}
            expected={progress.expectedWeightLifted.quarterToDate}
            target={activeGoal.quarterlyWeightTarget}
            unit="lbs"
            period="This Quarter"
          />
          <ProgressCard
            title="Minutes Completed"
            icon={<Clock className="w-4 h-4" />}
            actual={progress.actualMinutes.quarterToDate}
            expected={progress.expectedMinutes.quarterToDate}
            target={activeGoal.quarterlyMinutesTarget}
            unit="min"
            period="This Quarter"
          />
          <ProgressCard
            title="Sessions Completed"
            icon={<TrendingUp className="w-4 h-4" />}
            actual={progress.actualSessions.quarterToDate}
            expected={progress.expectedSessions.quarterToDate}
            target={activeGoal.quarterlySessionsTarget}
            unit="sessions"
            period="This Quarter"
          />
        </div>
      </div>

      {/* Annual Progress */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Annual Progress ({progress.currentYear})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProgressCard
            title="Weight Lifted"
            icon={<Target className="w-4 h-4" />}
            actual={progress.actualWeightLifted.yearToDate}
            expected={progress.expectedWeightLifted.yearToDate}
            target={activeGoal.annualWeightTarget}
            unit="lbs"
            period="This Year"
          />
          <ProgressCard
            title="Minutes Completed"
            icon={<Clock className="w-4 h-4" />}
            actual={progress.actualMinutes.yearToDate}
            expected={progress.expectedMinutes.yearToDate}
            target={activeGoal.annualMinutesTarget}
            unit="min"
            period="This Year"
          />
          <ProgressCard
            title="Sessions Completed"
            icon={<TrendingUp className="w-4 h-4" />}
            actual={progress.actualSessions.yearToDate}
            expected={progress.expectedSessions.yearToDate}
            target={activeGoal.weeklySessionsTarget * 52}
            unit="sessions"
            period="This Year"
          />
        </div>
      </div>

      {/* Sessions Needed */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Sessions Needed</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{progress.sessionsNeededForQuarter}</div>
            <div className="text-sm text-gray-600">more sessions needed for quarterly goal</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{progress.sessionsNeededForYear}</div>
            <div className="text-sm text-gray-600">more sessions needed for annual goal</div>
          </div>
        </div>
      </div>
    </div>
  )
}