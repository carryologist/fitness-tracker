'use client'

import { useState, useEffect } from 'react'
import { WorkoutForm } from './WorkoutForm'
import { WorkoutTable } from './WorkoutTable'
import { MonthlySummary } from './MonthlySummary'
import { ProgressChart } from './ProgressChart'
import { GoalTracker } from './GoalTracker'
import { importedWorkoutData } from '@/data/imported-workouts'

export interface WorkoutSession {
  id: string
  date: Date
  source: string
  activity: string
  minutes: number
  miles?: number
  weightLifted?: number
  notes?: string
}

export interface Goal {
  id: string
  type: 'QUARTERLY' | 'ANNUAL'
  year: number
  quarter?: number
  targetMinutes?: number
  targetSessions?: number
  targetSessionsPerWeek?: number
  targetWeeksPerQuarter?: number
  targetAnnualGoal?: number
}

export function WorkoutDashboard() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Convert imported data to WorkoutSession format
      const convertedSessions: WorkoutSession[] = importedWorkoutData.map(session => ({
        ...session,
        date: new Date(session.date),
        miles: session.miles ?? undefined,
        weightLifted: session.weightLifted ?? undefined,
        notes: session.notes ?? undefined
      }))
      
      setSessions(convertedSessions)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const addSession = (session: Omit<WorkoutSession, 'id'>) => {
    const newSession = {
      ...session,
      id: Date.now().toString()
    }
    setSessions(prev => [newSession, ...prev])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Chart - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Progress Over Time</h2>
            <p className="text-gray-600 mt-1">Your fitness journey visualized</p>
          </div>
          <div className="p-6">
            <ProgressChart sessions={sessions} />
          </div>
        </div>

        {/* Monthly Summary - 1 column */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Monthly Summary</h2>
            <p className="text-gray-600 mt-1">Recent performance</p>
          </div>
          <div className="p-6">
            <MonthlySummary sessions={sessions} />
          </div>
        </div>
      </div>

      {/* Goal Tracker - Full width, prominent */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg">
        <div className="p-6 border-b border-blue-100">
          <h2 className="text-2xl font-bold text-gray-900">Goal Progress</h2>
          <p className="text-gray-600 mt-1">Track your fitness targets</p>
        </div>
        <div className="p-6">
          <GoalTracker goals={goals} sessions={sessions} />
        </div>
      </div>

      {/* Add New Session Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add New Session</h2>
          <p className="text-gray-600 mt-1">Log your latest workout</p>
        </div>
        <div className="p-6">
          <WorkoutForm onSubmit={addSession} />
        </div>
      </div>

      {/* Session History Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Workout History</h2>
          <p className="text-gray-600 mt-1">All your recorded sessions</p>
        </div>
        <WorkoutTable sessions={sessions} />
      </div>
    </div>
  )
}