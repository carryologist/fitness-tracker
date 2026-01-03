'use client'

import React, { useState, useEffect } from 'react'
import { WorkoutTable } from './WorkoutTable'
import { WorkoutForm } from './WorkoutForm'
import { MonthlySummary } from './MonthlySummary'
import { ClientProgressChart } from './ClientProgressChart'
import { GoalTracker } from './GoalTracker'
import { GoalModal } from './GoalModal'
import { WorkoutSummary } from './WorkoutSummary'
import { ThemeToggle } from './ThemeToggle'
import { Plus, X, Target, Calendar, ArrowLeftRight } from 'lucide-react'

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
    if (typeof window === 'undefined') return
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
  } catch (error) {
    console.error('Error saving goals to localStorage:', error)
  }
}

const loadGoalsFromStorage = (): Goal[] => {
  try {
    if (typeof window === 'undefined') return []
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
  const [chartView, setChartView] = useState<'annual' | 'monthly' | 'custom'>('annual')
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null)
  const [selectedMonths, setSelectedMonths] = useState<Date[]>([])
  const [currentYear, setCurrentYear] = useState(2026) // Default year
  const [currentDate, setCurrentDate] = useState<Date | null>(null) // Initialize as null
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined)

  // Filter sessions by current year
  const currentYearSessions = sessions.filter(session => {
    return session.date.getFullYear() === currentYear
  })

  // Set current date/year on client side only
  useEffect(() => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentDate(now)
    setSelectedMonth(now)
  }, [])

  // Handle view change from chart
  const handleViewChange = (view: 'annual' | 'monthly' | 'custom') => {
    setChartView(view)
    if (view === 'annual') {
      setSelectedMonth(null)
      setSelectedMonths([])
    } else if (view === 'monthly') {
      // If no months are selected, select the current month
      if (selectedMonths.length === 0) {
        const monthToSelect = currentDate || new Date(currentYear, new Date().getMonth(), 1)
        setSelectedMonth(monthToSelect)
        setSelectedMonths([monthToSelect])
      } else if (selectedMonths.length > 1) {
        // If multiple months selected, keep only the first one
        setSelectedMonth(selectedMonths[0])
        setSelectedMonths([selectedMonths[0]])
      }
    } else if (view === 'custom') {
      // For custom view, ensure we have at least 2 months selected
      if (selectedMonths.length < 2) {
        const currentMonthIndex = currentDate ? currentDate.getMonth() : new Date().getMonth()
        const nextMonthIndex = (currentMonthIndex + 1) % 12
        const month1 = new Date(currentYear, currentMonthIndex, 1)
        const month2 = new Date(currentYear, nextMonthIndex, 1)
        setSelectedMonths([month1, month2])
        setSelectedMonth(null)
      }
    }
  }

  // Load sessions from localStorage on mount
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
      console.error('Failed to load data:', error)
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
      const response = await fetch(`/api/workouts?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete workout')
      }
      
      setSessions(sessions.filter(s => s.id !== id))
    } catch (error) {
      console.error('Failed to delete workout:', error)
      alert('Failed to delete workout. Please try again.')
    }
  }

  const handleAddWorkout = async (workout: Omit<WorkoutSession, 'id'>) => {
    await addSession(workout)
  }

  const handleDeleteWorkout = async (id: string) => {
    try {
      const response = await fetch(`/api/workouts?id=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete workout')
      }
      
      setSessions(sessions.filter(s => s.id !== id))
    } catch (error) {
      console.error('Failed to delete workout:', error)
      alert('Failed to delete workout. Please try again.')
    }
  }

  // Goal management functions
  const handleCreateGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGoal = await saveGoalToAPI(goalData)
    if (newGoal) {
      const updatedGoals = [...goals, newGoal]
      setGoals(updatedGoals)
      saveGoalsToStorage(updatedGoals)
    }
  }

  const handleEditGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingGoal) return
    
    const updatedGoal = await saveGoalToAPI(goalData, editingGoal.id)
    if (updatedGoal) {
      const updatedGoals = goals.map(g => g.id === editingGoal.id ? updatedGoal : g)
      setGoals(updatedGoals)
      saveGoalsToStorage(updatedGoals)
      setEditingGoal(undefined)
    }
  }

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setShowGoalModal(true)
  }

  const closeGoalModal = () => {
    setShowGoalModal(false)
    setEditingGoal(undefined)
  }

  // Get current goal for the year
  const getCurrentGoal = (): Goal | null => {
    return goals.find(g => g.year === currentYear) || null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/fitness-logo.svg" 
                alt="Fitness Tracker" 
                className="w-10 h-10 rounded-lg shadow-sm"
              />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  Fitness Tracker
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">Track your progress</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mr-2">
                <button
                  onClick={() => setCurrentYear(2025)}
                  className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                    currentYear === 2025
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>2025</span>
                </button>
                <button
                  onClick={() => setCurrentYear(2026)}
                  className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                    currentYear === 2026
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>2026</span>
                </button>
              </div>
              <ThemeToggle />
              <button
                onClick={() => setShowAddWorkout(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Workout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ClientProgressChart
            sessions={currentYearSessions}
            viewMode={chartView}
            selectedMonth={selectedMonth || currentDate || new Date(currentYear, 0, 1)}
            selectedMonths={selectedMonths}
            onMonthChange={(months) => {
              if (months.length === 1) {
                setSelectedMonth(months[0])
                setSelectedMonths(months)
              } else {
                setSelectedMonths(months)
              }
            }}
            onViewModeChange={handleViewChange}
          />
          <MonthlySummary
            sessions={currentYearSessions}
            selectedMonths={selectedMonths.map(d => d.getMonth())}
            onMonthToggle={(month) => {
              const monthDate = new Date(currentYear, month)
              const existingIndex = selectedMonths.findIndex(d => d.getMonth() === month)
              
              if (existingIndex >= 0) {
                // Remove month
                const newMonths = selectedMonths.filter((_, i) => i !== existingIndex)
                setSelectedMonths(newMonths)
                if (newMonths.length === 0) {
                  setSelectedMonth(null)
                  setChartView('annual')
                } else if (newMonths.length === 1) {
                  setSelectedMonth(newMonths[0])
                  setChartView('monthly')
                }
              } else {
                // Add month
                const newMonths = [...selectedMonths, monthDate].sort((a, b) => a.getTime() - b.getTime())
                setSelectedMonths(newMonths)
                if (newMonths.length === 1) {
                  setSelectedMonth(monthDate)
                  setChartView('monthly')
                } else {
                  setChartView('custom')
                }
              }
            }}
          />
        </div>

        {/* Goals and Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
          {(() => {
            const currentGoal = getCurrentGoal()
            
            if (!currentGoal) {
              // No goal exists for current year - show create goal UI
              return (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="text-center">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No Goal Set for {currentYear}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Create an annual fitness goal to track your progress with quarterly milestones.
                    </p>
                    <button
                      onClick={() => setShowGoalModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Create {currentYear} Goal
                    </button>
                  </div>
                </div>
              )
            }
            
            // Goal exists - show GoalTracker with actual data
            return (
              <div className="relative">
                <GoalTracker
                  sessions={currentYearSessions}
                  goals={{
                    quarterly: {
                      sessions: currentGoal.quarterlySessionsTarget,
                      minutes: currentGoal.quarterlyMinutesTarget,
                      weight: currentGoal.quarterlyWeightTarget
                    },
                    annual: {
                      sessions: currentGoal.weeklySessionsTarget * 52,
                      minutes: currentGoal.annualMinutesTarget,
                      weight: currentGoal.annualWeightTarget
                    }
                  }}
                />
                {/* Edit Goal Button */}
                <button
                  onClick={() => openEditGoal(currentGoal)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Edit Goal"
                >
                  <Target className="w-5 h-5" />
                </button>
              </div>
            )
          })()}
          <WorkoutSummary
            sessions={currentYearSessions}
            goals={(() => {
              const goal = getCurrentGoal()
              return goal ? {
                quarterly: {
                  sessions: goal.quarterlySessionsTarget,
                  minutes: goal.quarterlyMinutesTarget,
                  weight: goal.quarterlyWeightTarget
                },
                annual: {
                  sessions: goal.weeklySessionsTarget * 52,
                  minutes: goal.annualMinutesTarget,
                  weight: goal.annualWeightTarget
                }
              } : {
                quarterly: { sessions: 0, minutes: 0, weight: 0 },
                annual: { sessions: 0, minutes: 0, weight: 0 }
              }
            })()}
          />
        </div>

        {/* Add Workout Form */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Workout</h2>
          <WorkoutForm onSubmit={(data) => {
            // Make sure newly added workouts use the currently selected year
            const adjustedDate = new Date(data.date);
            adjustedDate.setFullYear(currentYear);

            handleAddWorkout({
              ...data,
              date: adjustedDate
            })
          }} />
        </div>

        {/* Workout History */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Workout History</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage your past workouts</p>
          </div>
          <div className="p-6">
            <WorkoutTable
              sessions={currentYearSessions}
              onDelete={handleDeleteWorkout}
            />
          </div>
        </div>

        {/* Modals */}
        {showAddWorkout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Workout</h2>
                <button
                  onClick={() => setShowAddWorkout(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <WorkoutForm onSubmit={(data) => {
                // Make sure newly added workouts use the currently selected year
                const adjustedDate = new Date(data.date);
                adjustedDate.setFullYear(currentYear);

                handleAddWorkout({
                  ...data,
                  date: adjustedDate
                })
                setShowAddWorkout(false)
              }} />
            </div>
          </div>
        )}
        
        {/* Goal Modal */}
        <GoalModal
          isOpen={showGoalModal}
          onClose={closeGoalModal}
          onSubmit={editingGoal ? handleEditGoal : handleCreateGoal}
          existingGoal={editingGoal}
        />
      </main>
    </div>
  )
}