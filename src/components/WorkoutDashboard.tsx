'use client'

import { useState, useEffect } from 'react'
import { WorkoutTable } from './WorkoutTable'
import { MonthlySummary } from './MonthlySummary'
import { ProgressChart } from './ProgressChart'
import { GoalTracker } from './GoalTracker'
import { WorkoutModal } from './WorkoutModal'
import { GoalModal } from './GoalModal'
import { importedWorkoutData } from '@/data/imported-workouts'
import { Plus } from 'lucide-react'

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
  name: string
  year: number
  
  // Annual targets
  annualWeightTarget: number // Total lbs for the year
  minutesPerSession: number // Minutes per individual session
  weeklySessionsTarget: number // Sessions per week
  
  // Calculated fields (derived from above)
  weeklyMinutesTarget: number // minutesPerSession * weeklySessionsTarget
  annualMinutesTarget: number // weeklyMinutesTarget * 52
  quarterlyWeightTarget: number // annualWeightTarget / 4
  quarterlyMinutesTarget: number // annualMinutesTarget / 4
  quarterlySessionsTarget: number // weeklySessionsTarget * 13
  
  createdAt: Date
  updatedAt: Date
}

export interface GoalProgress {
  // Current period progress
  currentQuarter: number
  currentYear: number
  
  // Actual progress
  actualWeightLifted: {
    quarterToDate: number
    yearToDate: number
  }
  actualMinutes: {
    quarterToDate: number
    yearToDate: number
  }
  actualSessions: {
    quarterToDate: number
    yearToDate: number
  }
  
  // Expected progress (linear)
  expectedWeightLifted: {
    quarterToDate: number
    yearToDate: number
  }
  expectedMinutes: {
    quarterToDate: number
    yearToDate: number
  }
  expectedSessions: {
    quarterToDate: number
    yearToDate: number
  }
  
  // Sessions needed
  sessionsNeededForQuarter: number
  sessionsNeededForYear: number
}

// localStorage helpers for goals
const GOALS_STORAGE_KEY = 'fitness-tracker-goals'

const saveGoalsToStorage = (goals: Goal[]) => {
  try {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
  } catch (error) {
    console.error('Error saving goals to localStorage:', error)
  }
}

const loadGoalsFromStorage = (): Goal[] => {
  try {
    const stored = localStorage.getItem(GOALS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert date strings back to Date objects
      return parsed.map((goal: Omit<Goal, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
        updatedAt: new Date(goal.updatedAt)
      }))
    }
  } catch (error) {
    console.error('Error loading goals from localStorage:', error)
  }
  return []
}

export function WorkoutDashboard() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined)
  const [chartViewMode, setChartViewMode] = useState<'annual' | 'monthly'>('annual')
  const [selectedChartMonth, setSelectedChartMonth] = useState(new Date())

  // Handle month selection from Monthly Summary
  const handleMonthSelect = (month: Date) => {
    setSelectedChartMonth(month)
    setChartViewMode('monthly')
  }

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
      
      // Load goals from localStorage
      const savedGoals = loadGoalsFromStorage()
      setGoals(savedGoals)
      
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

  const handleAddGoal = () => {
    setEditingGoal(undefined)
    setIsGoalModalOpen(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setIsGoalModalOpen(true)
  }

  const handleGoalSubmit = (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    
    if (editingGoal) {
      // Update existing goal
      const updatedGoal: Goal = {
        ...goalData,
        id: editingGoal.id,
        createdAt: editingGoal.createdAt,
        updatedAt: now
      }
      const newGoals = goals.map(g => g.id === editingGoal.id ? updatedGoal : g)
      setGoals(newGoals)
      saveGoalsToStorage(newGoals) // Save to localStorage
    } else {
      // Create new goal
      const newGoal: Goal = {
        ...goalData,
        id: Date.now().toString(),
        createdAt: now,
        updatedAt: now
      }
      const newGoals = [newGoal, ...goals]
      setGoals(newGoals)
      saveGoalsToStorage(newGoals) // Save to localStorage
    }
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
      {/* Floating Action Button */}
      <div className="fixed top-6 right-6 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 group"
        >
          <Plus className="w-6 h-6" />
          <span className="font-medium transition-all duration-200 group-hover:pr-2">
            <span className="group-hover:hidden">Add</span>
            <span className="hidden group-hover:inline whitespace-nowrap">Add Workout</span>
          </span>
        </button>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Chart - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg flex flex-col">
          <div className="p-6 border-b flex-shrink-0">
            <h2 className="text-2xl font-bold text-gray-900">Progress Over Time</h2>
            <p className="text-gray-600 mt-1">Your fitness journey visualized</p>
          </div>
          <div className="p-6 flex-1 min-h-[500px]">
            <ProgressChart 
              sessions={sessions} 
              initialViewMode={chartViewMode}
              initialSelectedMonth={selectedChartMonth}
              onMonthChange={setSelectedChartMonth}
            />
          </div>
        </div>

        {/* Monthly Summary - 1 column */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Monthly Summary</h2>
            <p className="text-gray-600 mt-1">Recent performance</p>
          </div>
          <div className="p-6">
            <MonthlySummary 
              sessions={sessions} 
              onMonthSelect={handleMonthSelect}
              selectedMonth={chartViewMode === 'monthly' ? selectedChartMonth : undefined}
            />
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
          <GoalTracker 
            goals={goals} 
            sessions={sessions} 
            onAddGoal={handleAddGoal}
            onEditGoal={handleEditGoal}
          />
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

      {/* Modal */}
      <WorkoutModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={addSession}
      />
      
      {/* Goal Modal */}
      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSubmit={handleGoalSubmit}
        existingGoal={editingGoal}
      />
    </div>
  )
}