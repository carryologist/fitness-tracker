'use client'

import { useMemo } from 'react'
import { WorkoutSession, Goal } from './WorkoutDashboard'
import { getQuarter, getYear, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval } from 'date-fns'

interface GoalTrackerProps {
  goals: Goal[]
  sessions: WorkoutSession[]
}

export function GoalTracker({ goals, sessions }: GoalTrackerProps) {
  const currentYear = getYear(new Date())
  const currentQuarter = getQuarter(new Date())
  
  const progress = useMemo(() => {
    const now = new Date()
    
    // Calculate current quarter progress
    const quarterStart = startOfQuarter(now)
    const quarterEnd = endOfQuarter(now)
    const quarterSessions = sessions.filter(session => 
      isWithinInterval(session.date, { start: quarterStart, end: quarterEnd })
    )
    
    const quarterMinutes = quarterSessions.reduce((sum, s) => sum + s.minutes, 0)
    const quarterSessionCount = quarterSessions.length
    
    // Calculate annual progress
    const yearStart = startOfYear(now)
    const yearEnd = endOfYear(now)
    const yearSessions = sessions.filter(session => 
      isWithinInterval(session.date, { start: yearStart, end: yearEnd })
    )
    
    const yearMinutes = yearSessions.reduce((sum, s) => sum + s.minutes, 0)
    const yearSessionCount = yearSessions.length
    
    return {
      quarter: {
        minutes: quarterMinutes,
        sessions: quarterSessionCount
      },
      year: {
        minutes: yearMinutes,
        sessions: yearSessionCount
      }
    }
  }, [sessions])

  // Mock goals for demonstration
  const mockGoals = [
    {
      type: 'quarterly' as const,
      label: 'Q1 2025 Minutes',
      target: 2925,
      current: progress.quarter.minutes,
      unit: 'minutes'
    },
    {
      type: 'quarterly' as const,
      label: 'Sessions/Week',
      target: 5,
      current: Math.round(progress.quarter.sessions / 4), // Rough weekly average
      unit: 'sessions'
    },
    {
      type: 'annual' as const,
      label: 'Annual Goal',
      target: 500000,
      current: progress.year.minutes,
      unit: 'minutes'
    }
  ]

  const ProgressBar = ({ current, target, label, unit }: { current: number, target: number, label: string, unit: string }) => {
    const percentage = Math.min((current / target) * 100, 100)
    const isOnTrack = percentage >= 75 // Arbitrary threshold
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-gray-600">
            {current.toLocaleString()} / {target.toLocaleString()} {unit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isOnTrack ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{percentage.toFixed(1)}% complete</span>
          <span className={isOnTrack ? 'text-green-600' : 'text-yellow-600'}>
            {isOnTrack ? 'On track' : 'Behind pace'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {mockGoals.map((goal, index) => (
        <ProgressBar
          key={index}
          current={goal.current}
          target={goal.target}
          label={goal.label}
          unit={goal.unit}
        />
      ))}
      
      {/* Quick Stats */}
      <div className="pt-4 border-t space-y-3">
        <div className="text-sm">
          <div className="text-gray-500">This Quarter</div>
          <div className="font-semibold">
            {progress.quarter.sessions} sessions, {progress.quarter.minutes.toLocaleString()} minutes
          </div>
        </div>
        <div className="text-sm">
          <div className="text-gray-500">This Year</div>
          <div className="font-semibold">
            {progress.year.sessions} sessions, {progress.year.minutes.toLocaleString()} minutes
          </div>
        </div>
      </div>
    </div>
  )
}