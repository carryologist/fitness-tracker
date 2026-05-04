'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { WorkoutTable } from './WorkoutTable'
import { WorkoutForm } from './WorkoutForm'
import { MonthlySummary } from './MonthlySummary'
import { ClientProgressChart } from './ClientProgressChart'
import { GoalTracker } from './GoalTracker'
import { GoalModal } from './GoalModal'
import { WorkoutSummary } from './WorkoutSummary'
import { ThemeToggle } from './ThemeToggle'
import { AuthHeader } from './AuthHeader'
import { Plus, X, Target, Calendar, ArrowLeftRight, Settings, RefreshCw, Upload, Check } from 'lucide-react'
import { applyDefaultMileage, applyWorkoutMultipliers } from '../utils/workoutMultipliers'
import { useSettings } from '../context/SettingsContext'

export interface WorkoutSession {
  id: string
  date: Date
  source: string
  activity: string
  minutes: number
  miles?: number
  adjustedMiles?: number // Miles with multiplier applied (for Cannondale)
  adjustedMinutes?: number // Minutes with multiplier applied (for Cannondale)
  estimatedMiles?: boolean // True when miles were calculated from default cycling speed
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

// Normalize common OCR character misreads (letter↔digit swaps)
function ocrNormalize(text: string): string {
  return text
    .replace(/[|]/g, '/')       // pipe → slash (date separators)
    .replace(/l(?=\d)/g, '1')   // lowercase L before digit → 1
    .replace(/(?<=\d)l/g, '1')  // lowercase L after digit → 1
    .replace(/O(?=\d)/g, '0')   // capital O before digit → 0
    .replace(/(?<=\d)O/g, '0')  // capital O after digit → 0
    .replace(/(?<=\d)\s*[)\]]/g, '') // stray brackets after digits
    .replace(/(\d,)\s+(\d)/g, '$1$2') // collapse spaces in comma-formatted numbers (e.g. "12, 379" → "12,379")
}

function parseTonalOCR(text: string) {
  // Work with both raw and OCR-normalized text
  const normalized = ocrNormalize(text)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // Volume: number followed by "lbs" — OCR may render comma as period, space, or drop it
  // OCR commonly misreads "lbs" as "1bs", "1s", "Ibs", "ls", etc.
  const volumeMatch = normalized.match(/(\d{1,3}[,.]\d{3,})\s*(?:lbs|1bs|1s|Ibs|ibs|ls)\b/i)
    || normalized.match(/(\d{4,})\s*(?:lbs|1bs|1s|Ibs|ibs|ls)\b/i)
  let weightLifted: number | null = null
  if (volumeMatch) {
    weightLifted = parseInt(volumeMatch[1].replace(/[^\d]/g, ''), 10)
    if (isNaN(weightLifted) || weightLifted === 0) weightLifted = null
  }
  // Fallback: look for a large number (4+ digits with comma) on the same line as a MM:SS pattern
  if (!weightLifted) {
    const fallbackMatch = normalized.match(/(\d{1,3},\d{3})\s*\S*\s*[-—]?\s*\d{1,3}:\d{2}/)
    if (fallbackMatch) {
      weightLifted = parseInt(fallbackMatch[1].replace(/[^\d]/g, ''), 10)
      if (isNaN(weightLifted) || weightLifted === 0) weightLifted = null
    }
  }

  // Duration: MM:SS pattern (strict)
  const durationMatch = normalized.match(/(\d{1,3}):(\d{2})/)
  let minutes: number | null = null
  if (durationMatch) {
    minutes = parseInt(durationMatch[1], 10) + (parseInt(durationMatch[2], 10) > 0 ? 1 : 0)
  }
  // Fallback: minutes-only pattern — digits followed by colon but garbled seconds
  if (!minutes) {
    const looseDuration = normalized.match(/(\d{1,3})\s*:\s*(?:\d{0,2}|\D)/)
    if (looseDuration) {
      minutes = parseInt(looseDuration[1], 10)
      if (isNaN(minutes) || minutes === 0) minutes = null
    }
  }
  // Fallback: 4-digit number near VOLUME/DURATION keywords where colon was dropped (e.g. "4205" = 42:05)
  if (!minutes) {
    const contextMatch = normalized.match(/\b(\d{3,4})\b(?=\s*(?:VOLUME|DURATION|WEIGHT|MIN))/i)
      || normalized.match(/(?:VOLUME|DURATION|WEIGHT|lbs)\s+\S*\s*(\d{3,4})\b/i)
    if (contextMatch) {
      const raw = contextMatch[1]
      if (raw.length === 4) {
        // MMSS: first 2 digits = minutes, last 2 = seconds
        minutes = parseInt(raw.substring(0, 2), 10) + (parseInt(raw.substring(2), 10) > 0 ? 1 : 0)
      } else if (raw.length === 3) {
        // MSS: first digit = minutes, last 2 = seconds
        minutes = parseInt(raw.substring(0, 1), 10) + (parseInt(raw.substring(1), 10) > 0 ? 1 : 0)
      }
      if (minutes !== null && (isNaN(minutes) || minutes === 0 || minutes > 300)) minutes = null
    }
  }

  // Date: M/D/YY pattern — try normalized text first (fixes pipe→slash, l→1, O→0)
  let date: Date | null = null
  const dateMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10)
    const day = parseInt(dateMatch[2], 10)
    let year = parseInt(dateMatch[3], 10)
    if (year < 100) year += 2000
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      date = new Date(year, month - 1, day, 12, 0, 0)
    }
  }
  // Fallback: try matching date-like patterns with OCR artifacts (e.g. "5/4/ 26", "5 /4/26")
  if (!date) {
    const looseDateMatch = normalized.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)
    if (looseDateMatch) {
      const month = parseInt(looseDateMatch[1], 10)
      const day = parseInt(looseDateMatch[2], 10)
      let year = parseInt(looseDateMatch[3], 10)
      if (year < 100) year += 2000
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        date = new Date(year, month - 1, day, 12, 0, 0)
      }
    }
  }
  // Fallback: look for "Weeks" or week-related text with nearby numbers (e.g. "el Weeks to" → date context)
  // Try dot-separated dates (e.g. "5.4.26")
  if (!date) {
    const dotDateMatch = normalized.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
    if (dotDateMatch) {
      const month = parseInt(dotDateMatch[1], 10)
      const day = parseInt(dotDateMatch[2], 10)
      let year = parseInt(dotDateMatch[3], 10)
      if (year < 100) year += 2000
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        date = new Date(year, month - 1, day, 12, 0, 0)
      }
    }
  }
  // Fallback: dash-separated dates (e.g. "5-4-26")
  if (!date) {
    const dashDateMatch = normalized.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/)
    if (dashDateMatch) {
      const month = parseInt(dashDateMatch[1], 10)
      const day = parseInt(dashDateMatch[2], 10)
      let year = parseInt(dashDateMatch[3], 10)
      if (year < 100) year += 2000
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        date = new Date(year, month - 1, day, 12, 0, 0)
      }
    }
  }

  // Workout name: first meaningful line
  const workoutName = lines.find(l =>
    l.length > 3 &&
    !/^TONAL$/i.test(l) &&
    !/^VOLUME$/i.test(l) &&
    !/^DURATION$/i.test(l) &&
    !/^\d/.test(l) &&
    !l.includes('|') &&
    !l.includes('lbs')
  ) || null

  // Coach/details line with bullet separators
  const detailsLine = lines.find(l => l.includes('•') || l.includes('·')) || null

  const notes = [workoutName, detailsLine].filter(Boolean).join(' — ')

  return { weightLifted, minutes, date, notes }
}

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
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout - Stack vertically */}
          <div className="sm:hidden py-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/fitness-logo.svg"
                  alt="Fitness Tracker"
                  className="w-8 h-8 rounded-lg shadow-sm"
                />
                <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Fitness Tracker
                </h1>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSync('peloton')}
                  disabled={syncing !== null}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing === 'peloton' ? 'animate-spin' : ''}`} />
                  <span>{syncing === 'peloton' ? 'Syncing…' : 'Peloton'}</span>
                </button>
                <button
                  onClick={() => handleSync('tonal')}
                  disabled={syncing !== null}
                  className="bg-gray-900 dark:bg-gray-200 hover:bg-black dark:hover:bg-white disabled:opacity-50 text-white dark:text-gray-900 px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing === 'tonal' ? 'animate-spin' : ''}`} />
                  <span>{syncing === 'tonal' ? 'Syncing…' : 'Tonal'}</span>
                </button>
                {/* OCR screenshot import — fallback when API sync doesn't capture a workout */}
                <button
                  onClick={() => tonalFileRef.current?.click()}
                  disabled={importing}
                  className="bg-gray-700 dark:bg-gray-500 hover:bg-gray-800 dark:hover:bg-gray-400 disabled:opacity-50 text-white dark:text-gray-900 p-1.5 rounded-lg transition-colors shadow-sm"
                  title="Import Tonal screenshot (fallback)"
                >
                  <Upload className={`w-3.5 h-3.5 ${importing ? 'animate-pulse' : ''}`} />
                  {importing && importProgress && <span className="text-[10px]">{importProgress}</span>}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                </button>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setCurrentYear(2025)}
                  className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                    currentYear === 2025
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>2025</span>
                </button>
                <button
                  onClick={() => setCurrentYear(2026)}
                  className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                    currentYear === 2026
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>2026</span>
                </button>
              </div>
              <button
                onClick={() => setShowAddWorkout(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Desktop Layout - Horizontal */}
          <div className="hidden sm:flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fitness-logo.svg"
                alt="Fitness Tracker"
                className="w-10 h-10 rounded-lg shadow-sm"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  Fitness Tracker
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Track your progress</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setCurrentYear(2025)}
                  className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
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
                  className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 transition-colors ${
                    currentYear === 2026
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>2026</span>
                </button>
              </div>
              <button
                onClick={() => handleSync('peloton')}
                disabled={syncing !== null}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${syncing === 'peloton' ? 'animate-spin' : ''}`} />
                <span>{syncing === 'peloton' ? 'Syncing…' : 'Sync Peloton'}</span>
              </button>
              <button
                onClick={() => handleSync('tonal')}
                disabled={syncing !== null}
                className="bg-gray-900 dark:bg-gray-200 hover:bg-black dark:hover:bg-white disabled:opacity-50 text-white dark:text-gray-900 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${syncing === 'tonal' ? 'animate-spin' : ''}`} />
                <span>{syncing === 'tonal' ? 'Syncing…' : 'Sync Tonal'}</span>
              </button>
              {/* OCR screenshot import — fallback when API sync doesn't capture a workout */}
              <button
                onClick={() => tonalFileRef.current?.click()}
                disabled={importing}
                className="bg-gray-700 dark:bg-gray-500 hover:bg-gray-800 dark:hover:bg-gray-400 disabled:opacity-50 text-white dark:text-gray-900 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
                title="Import Tonal screenshot (fallback)"
              >
                <Upload className={`w-4 h-4 ${importing ? 'animate-pulse' : ''}`} />
                <span>{importing ? `Importing ${importProgress || ''}…` : 'Import Tonal'}</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4 text-gray-500" />
              </button>
              <ThemeToggle />
              <AuthHeader />
              <button
                onClick={() => setShowAddWorkout(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Workout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sync error banner */}
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
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Default Cycling Speed */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Default Cycling Speed</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Used to estimate mileage when not recorded by the source.
                </p>
                <div className="flex gap-2">
                  {[17, 18, 19].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => updateSettings({ defaultCyclingSpeed: speed })}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        settings.defaultCyclingSpeed === speed
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {speed} mph
                    </button>
                  ))}
                </div>
              </div>

              {/* Outdoor Bonus */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Outdoor Bonus</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Cannondale outdoor rides get bonus credit for minutes and miles.
                </p>
                <div className="flex gap-2">
                  {[1, 1.25, 1.5, 1.75, 2].map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSettings({ outdoorMultiplier: m })}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        settings.outdoorMultiplier === m
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Units */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Units</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSettings({ units: 'imperial' })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-center transition-colors ${
                      settings.units === 'imperial'
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    🇺🇸 Imperial (mi, lbs)
                  </button>
                  <button
                    onClick={() => updateSettings({ units: 'metric' })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-center transition-colors ${
                      settings.units === 'metric'
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    🌍 Metric (km, kg)
                  </button>
                </div>
              </div>

              {/* Workout Defaults */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Default Source</h3>
                <div className="flex gap-2 flex-wrap">
                  {['Peloton', 'Tonal', 'Cannondale', 'Other'].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateSettings({ defaultSource: s })}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        settings.defaultSource === s
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Default Activity</h3>
                <div className="flex gap-2 flex-wrap">
                  {['Cycling', 'Weight Lifting', 'Running', 'Walking', 'Yoga', 'Other'].map((a) => (
                    <button
                      key={a}
                      onClick={() => updateSettings({ defaultActivity: a })}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        settings.defaultActivity === a
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}