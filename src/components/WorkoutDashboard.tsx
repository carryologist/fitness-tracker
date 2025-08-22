'use client'

import { useState, useEffect } from 'react'
import { WorkoutTable } from './WorkoutTable'
import { MonthlySummary } from './MonthlySummary'
import { ProgressChart } from './ProgressChart'
import { GoalTracker } from './GoalTracker'
import { WorkoutSummary } from './WorkoutSummary'
import { WorkoutModal } from './WorkoutModal'
import { GoalModal } from './GoalModal'
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

// Type for API payload returned by /api/workouts
interface WorkoutApiSession {
  id: string
  date: string
  source: string
  activity: string
  minutes: number
  miles?: number | null
  weightLifted?: number | null
  notes?: string | null
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
  
  // Time remaining
  daysRemainingInQuarter: number
}

// API helpers for goals with localStorage fallback
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

// API functions for cross-device persistence
const fetchGoalsFromAPI = async (): Promise<Goal[]> => {
  try {
    const response = await fetch('/api/goals')
    if (!response.ok) throw new Error('Failed to fetch goals')
    const data = await response.json()
    return data.goals.map((goal: Goal & { createdAt: string; updatedAt: string }) => ({
      ...goal,
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt)
    }))
  } catch (error) {
    console.error('Error fetching goals from API:', error)
    // Fallback to localStorage
    return loadGoalsFromStorage()
  }
}

const saveGoalToAPI = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string): Promise<Goal | null> => {
  try {
    const url = '/api/goals'
    const method = existingId ? 'PUT' : 'POST'
    const body = existingId ? { ...goalData, id: existingId } : goalData
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) throw new Error('Failed to save goal')
    const data = await response.json()
    return {
      ...data.goal,
      createdAt: new Date(data.goal.createdAt),
      updatedAt: new Date(data.goal.updatedAt)
    }
  } catch (error) {
    console.error('Error saving goal to API:', error)
    return null
  }
}

export function WorkoutDashboard() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined)
  const [editingSession, setEditingSession] = useState<WorkoutSession | undefined>(undefined)
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
      console.log('🔄 Loading workout data from API...')
      
      // Fetch workouts from API
      const response = await fetch('/api/workouts')
      if (!response.ok) {
        throw new Error(`Failed to fetch workouts: ${response.status}`)
      }
      
      const data = (await response.json()) as { workouts: WorkoutApiSession[] }
      console.log(`✅ Loaded ${data.workouts.length} workouts from API`)
      
      // Convert API data to WorkoutSession format
      const convertedSessions: WorkoutSession[] = data.workouts.map((session) => ({
        id: session.id,
        date: new Date(session.date),
        source: session.source,
        activity: session.activity,
        minutes: session.minutes,
        miles: session.miles ?? undefined,
        weightLifted: session.weightLifted ?? undefined,
        notes: session.notes ?? undefined
      }))
      
      setSessions(convertedSessions)
      
      // Load goals from API (with localStorage fallback)
      const savedGoals = await fetchGoalsFromAPI()
      setGoals(savedGoals)
      
      // Also save to localStorage for offline access
      saveGoalsToStorage(savedGoals)
      
      setLoading(false)
    } catch (error) {
      console.error('💥 Error loading data from API:', error)
      
      // Fallback to empty data instead of imported data
      console.log('⚠️ Using empty data as fallback')
      setSessions([])
      setGoals([])
      setLoading(false)
    }
  }

  const addSession = async (session: Omit<WorkoutSession, 'id'>) => {
    try {
      console.log('💪 Creating new workout via API:', session)
      
      // Create workout via API
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: session.date.toISOString(),
          source: session.source,
          activity: session.activity,
          minutes: session.minutes,
          miles: session.miles,
          weightLifted: session.weightLifted,
          notes: session.notes
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create workout: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('✅ Workout created successfully:', data.workout.id)
      
      // Add to local state with proper ID from database
      const newSession: WorkoutSession = {
        id: data.workout.id,
        date: new Date(data.workout.date),
        source: data.workout.source,
        activity: data.workout.activity,
        minutes: data.workout.minutes,
        miles: data.workout.miles ?? undefined,
        weightLifted: data.workout.weightLifted ?? undefined,
        notes: data.workout.notes ?? undefined
      }
      
      setSessions(prev => [newSession, ...prev])
    } catch (error) {
      console.error('💥 Error creating workout:', error)
      
      // Fallback to local-only creation
      console.log('⚠️ Falling back to local-only workout creation')
      const newSession = {
        ...session,
        id: `local_${Date.now()}`
      }
      setSessions(prev => [newSession, ...prev])
    }
  }

  const updateSession = async (id: string, data: Omit<WorkoutSession, 'id'>) => {
    try {
      const payload = {
        id,
        date: data.date.toISOString(),
        source: data.source,
        activity: data.activity,
        minutes: data.minutes,
        miles: data.miles,
        weightLifted: data.weightLifted,
        notes: data.notes,
      }
      const response = await fetch('/api/workouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error(`Failed to update workout: ${response.status}`)
      const result = await response.json()
      const updated = result.workout as { id: string; date: string; source: string; activity: string; minutes: number; miles?: number | null; weightLifted?: number | null; notes?: string | null }
      setSessions(prev => prev.map(s => s.id === id ? {
        id: updated.id,
        date: new Date(updated.date),
        source: updated.source,
        activity: updated.activity,
        minutes: updated.minutes,
        miles: updated.miles ?? undefined,
        weightLifted: updated.weightLifted ?? undefined,
        notes: updated.notes ?? undefined
      } : s))
    } catch (e) {
      console.error('Error updating workout:', e)
    }
  }

  const deleteSession = async (id: string) => {
    try {
      const response = await fetch(`/api/workouts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`Failed to delete workout: ${response.status}`)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      console.error('Error deleting workout:', e)
    }
  }

  const handleAddGoal = () => {
    setEditingGoal(undefined)
    setIsGoalModalOpen(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setIsGoalModalOpen(true)
  }

  const handleGoalSubmit = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    
    if (editingGoal) {
      // Update existing goal via API
      const updatedGoal = await saveGoalToAPI(goalData, editingGoal.id)
      
      if (updatedGoal) {
        const newGoals = goals.map(g => g.id === editingGoal.id ? updatedGoal : g)
        setGoals(newGoals)
        saveGoalsToStorage(newGoals) // Backup to localStorage
      } else {
        // Fallback to localStorage if API fails
        const fallbackGoal: Goal = {
          ...goalData,
          id: editingGoal.id,
          createdAt: editingGoal.createdAt,
          updatedAt: now
        }
        const newGoals = goals.map(g => g.id === editingGoal.id ? fallbackGoal : g)
        setGoals(newGoals)
        saveGoalsToStorage(newGoals)
      }
    } else {
      // Create new goal via API
      const newGoal = await saveGoalToAPI(goalData)
      
      if (newGoal) {
        const newGoals = [newGoal, ...goals]
        setGoals(newGoals)
        saveGoalsToStorage(newGoals) // Backup to localStorage
      } else {
        // Fallback to localStorage if API fails
        const fallbackGoal: Goal = {
          ...goalData,
          id: Date.now().toString(),
          createdAt: now,
          updatedAt: now
        }
        const newGoals = [fallbackGoal, ...goals]
        setGoals(newGoals)
        saveGoalsToStorage(newGoals)
      }
    }
    
    setEditingGoal(undefined)
    setIsGoalModalOpen(false)
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
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 safe-area-inset-top">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 sm:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 group min-w-[60px] sm:min-w-auto"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="font-medium transition-all duration-200 group-hover:pr-2 hidden sm:inline">
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

      {/* Workout Summary */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Workout Statistics</h2>
          <p className="text-gray-600 mt-1">Summary of your training patterns</p>
        </div>
        <div className="p-6">
          <WorkoutSummary sessions={sessions} />
        </div>
      </div>

      {/* Workout History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Workout History</h2>
          <p className="text-gray-600 mt-1">All your recorded sessions</p>
        </div>
        <WorkoutTable
          sessions={sessions}
          onEdit={(s) => { setEditingSession(s); setIsModalOpen(true) }}
          onDelete={(id) => deleteSession(id)}
        />
      </div>

      {/* Modal */}
      <WorkoutModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSession(undefined) }}
        onSubmit={(data) => editingSession ? updateSession(editingSession.id, data) : addSession(data)}
        initial={editingSession}
        submitLabel={editingSession ? 'Save Changes' : 'Add Workout Session'}
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