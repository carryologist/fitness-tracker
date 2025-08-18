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
      {/* Add New Session Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Session</h2>
        <WorkoutForm onSubmit={addSession} />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Session Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Workout Sessions</h2>
            </div>
            <WorkoutTable sessions={sessions} />
          </div>
        </div>

        {/* Right Column - Analytics */}
        <div className="space-y-6">
          {/* Monthly Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Summary</h3>
            <MonthlySummary sessions={sessions} />
          </div>

          {/* Goal Tracker */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Goals</h3>
            <GoalTracker goals={goals} sessions={sessions} />
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Progress Over Time</h2>
        <ProgressChart sessions={sessions} />
      </div>
    </div>
  )
}