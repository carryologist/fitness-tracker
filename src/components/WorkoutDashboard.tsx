'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { WorkoutTable } from './WorkoutTable'
import { WorkoutForm } from './WorkoutForm'
import { MonthlySummary } from './MonthlySummary'
import { ClientProgressChart } from './ClientProgressChart'
import { GoalTracker } from './GoalTracker'
import { GoalModal } from './GoalModal'
import { WorkoutSummary } from './WorkoutSummary'
import { DashboardHeader } from './DashboardHeader'
import { SettingsModal } from './SettingsModal'
import { Plus, X, Target, Check } from 'lucide-react'
import { applyDefaultMileage, applyWorkoutMultipliers } from '../utils/workoutMultipliers'
import { useSettings } from '../context/SettingsContext'
import { parseTonalOCR } from '../utils/tonalOCR'
import { fetchGoalsFromAPI, saveGoalToAPI, saveGoalsToStorage } from '../utils/goalsApi'
import type { WorkoutSession, WorkoutApiSession, Goal } from '@/types/workout'

// Re-export types for backward compatibility with existing imports
export type { WorkoutSession, Goal, GoalProgress } from '@/types/workout'

export function WorkoutDashboard() {
  const { settings, updateSettings } = useSettings()
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
  const [showSettings, setShowSettings] = useState(false)
  const [syncing, setSyncing] = useState<'peloton' | 'tonal' | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<string | null>(null)
  const tonalFileRef = React.useRef<HTMLInputElement>(null)

  // Filter sessions by current year
  const currentYearSessions = sessions.filter(session => {
    return session.date.getFullYear() === currentYear
  })

  // Apply default mileage for cycling workouts without recorded miles, then outdoor multipliers
  const enhancedSessions = useMemo(() => {
    const withMileage = applyDefaultMileage(currentYearSessions, settings.defaultCyclingSpeed)
    return applyWorkoutMultipliers(withMileage, settings.outdoorMultiplier)
  }, [currentYearSessions, settings.defaultCyclingSpeed, settings.outdoorMultiplier])

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

  const handleSync = async (service: 'peloton' | 'tonal') => {
    setSyncing(service)
    setSyncError(null)
    try {
      // Ensure connected (auth first)
      const statusRes = await fetch(`/api/${service}/sync`)
      const statusData = await statusRes.json()
      if (!statusData.connected) {
        const authRes = await fetch(`/api/${service}/auth`, { method: 'POST' })
        if (!authRes.ok) {
          const err = await authRes.json().catch(() => ({ error: 'Auth failed' }))
          const msg = `${service} auth failed: ${err.error || authRes.status}`
          console.error(msg)
          setSyncError(msg)
          return
        }
      }
      // Sync
      const res = await fetch(`/api/${service}/sync`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        console.log(`${service} sync: ${data.synced} new, ${data.updated || 0} updated, ${data.skipped} skipped`)
        if (data.synced > 0 || data.updated > 0) await loadData()
        // Show success banner with sync summary
        const parts: string[] = []
        if (data.synced > 0) parts.push(`${data.synced} new`)
        if (data.updated > 0) parts.push(`${data.updated} updated`)
        if (data.skipped > 0) parts.push(`${data.skipped} already synced`)
        const summary = parts.length > 0 ? parts.join(', ') : 'up to date'
        setSyncSuccess(`${service.charAt(0).toUpperCase() + service.slice(1)} sync: ${summary}`)
        setTimeout(() => setSyncSuccess(null), 6000)
      } else {
        const msg = `${service} sync failed: ${data.error || res.status}`
        console.error(msg)
        setSyncError(msg)
      }
    } catch (error) {
      const msg = `${service} sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(msg)
      setSyncError(msg)
    } finally {
      setSyncing(null)
    }
  }

  const handleTonalImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    const total = fileList.length
    setImporting(true)
    setSyncError(null)
    setSyncSuccess(null)
    setImportProgress(`0/${total}`)

    const successes: string[] = []
    const failures: string[] = []

    try {
      const Tesseract = (await import('tesseract.js')).default

      // Preprocess image: grayscale + high contrast for better OCR on dark Tonal screenshots
      const preprocessImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            // Draw original
            ctx.drawImage(img, 0, 0)
            // Convert to grayscale and boost contrast
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data
            for (let i = 0; i < data.length; i += 4) {
              // Grayscale using luminance formula
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
              // High contrast threshold: binarize at 128
              const val = gray > 100 ? 255 : 0
              data[i] = val
              data[i + 1] = val
              data[i + 2] = val
            }
            ctx.putImageData(imageData, 0, 0)
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = reject
          img.src = URL.createObjectURL(file)
        })
      }

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        setImportProgress(`${i + 1}/${total}`)
        try {
          // Try preprocessed image first, fall back to raw image
          let rawText = ''
          try {
            const preprocessed = await preprocessImage(file)
            const result = await Tesseract.recognize(preprocessed, 'eng')
            rawText = result.data.text
          } catch {
            const result = await Tesseract.recognize(file, 'eng')
            rawText = result.data.text
          }
          console.log(`OCR [${i + 1}/${total}] raw text:`, rawText)

          const parsed = parseTonalOCR(rawText)

          if (!parsed.minutes && !parsed.weightLifted) {
            failures.push(`${file.name}: Could not parse — ${rawText.substring(0, 100)}`)
            continue
          }

          // If date is missing but we have workout data, prompt the user
          if (!parsed.date) {
            const userDate = prompt(
              `${file.name}: OCR couldn't read the date.\n` +
              `Parsed: ${parsed.weightLifted ? parsed.weightLifted + ' lbs' : 'no volume'}` +
              `${parsed.minutes ? ', ' + parsed.minutes + ' min' : ''}\n\n` +
              `Enter the workout date (MM/DD/YYYY or MM/DD/YY):`,
              new Date().toLocaleDateString('en-US')
            )
            if (!userDate) {
              failures.push(`${file.name}: Skipped — no date provided`)
              continue
            }
            const parts = userDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
            if (parts) {
              const month = parseInt(parts[1], 10)
              const day = parseInt(parts[2], 10)
              let year = parseInt(parts[3], 10)
              if (year < 100) year += 2000
              parsed.date = new Date(year, month - 1, day, 12, 0, 0)
            } else {
              failures.push(`${file.name}: Invalid date format — ${userDate}`)
              continue
            }
          }

          // If minutes still missing, prompt for that too
          if (!parsed.minutes) {
            const userMin = prompt(
              `${file.name}: OCR couldn't read the duration.\n` +
              `Parsed: ${parsed.weightLifted ? parsed.weightLifted + ' lbs' : 'no volume'}` +
              `, date: ${parsed.date.toLocaleDateString()}\n\n` +
              `Enter workout duration in minutes:`
            )
            if (userMin) {
              const m = parseInt(userMin, 10)
              if (!isNaN(m) && m > 0) parsed.minutes = m
            }
            if (!parsed.minutes) {
              failures.push(`${file.name}: Skipped — no duration provided`)
              continue
            }
          }

          console.log(`Parsed [${i + 1}/${total}]:`, parsed)

          const res = await fetch('/api/tonal/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              weightLifted: parsed.weightLifted,
              minutes: parsed.minutes,
              date: parsed.date.toISOString(),
              notes: parsed.notes,
            }),
          })
          const data = await res.json()
          if (res.ok && data.success) {
            const w = data.workout
            successes.push(w ? `${w.date?.substring(0, 10) || ''} — ${w.weightLifted ? w.weightLifted + ' lbs, ' : ''}${w.minutes} min` : file.name)
          } else {
            failures.push(`${file.name}: ${data.error || 'Import failed'}`)
          }
        } catch (err) {
          failures.push(`${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      // Reload data once after all imports
      if (successes.length > 0) await loadData()

      // Build summary banners
      if (successes.length > 0) {
        const msg = total === 1
          ? successes[0]
          : `${successes.length}/${total} imported: ${successes.join(' | ')}`
        setSyncSuccess(msg)
        setTimeout(() => setSyncSuccess(null), 8000)
      }
      if (failures.length > 0) {
        setSyncError(failures.join(' · '))
      }
    } catch (error) {
      setSyncError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setImporting(false)
      setImportProgress(null)
      if (tonalFileRef.current) tonalFileRef.current.value = ''
    }
  }

  // Get current goal for the year
  const getCurrentGoal = (): Goal | null => {
    return goals.find(g => g.year === currentYear) || null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <input
        ref={tonalFileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleTonalImport}
      />
      {/* Header */}
      <DashboardHeader
        currentYear={currentYear}
        setCurrentYear={setCurrentYear}
        syncing={syncing}
        importing={importing}
        importProgress={importProgress}
        onSync={handleSync}
        onImportClick={() => tonalFileRef.current?.click()}
        onSettingsClick={() => setShowSettings(true)}
        onAddWorkoutClick={() => setShowAddWorkout(true)}
      />

      {/* Sync success banner */}
      {syncSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              {syncSuccess}
            </span>
            <button onClick={() => setSyncSuccess(null)} className="text-green-500 hover:text-green-700 ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {syncError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-red-700 dark:text-red-300">{syncError}</span>
            <button onClick={() => setSyncError(null)} className="text-red-500 hover:text-red-700 ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ClientProgressChart
            sessions={enhancedSessions}
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
            sessions={enhancedSessions}
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
                  sessions={enhancedSessions}
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
            sessions={enhancedSessions}
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

        {/* Workout History */}
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Workout History</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage your past workouts</p>
          </div>
          <div className="p-6">
            <WorkoutTable
              sessions={enhancedSessions}
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

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </main>
    </div>
  )
}
