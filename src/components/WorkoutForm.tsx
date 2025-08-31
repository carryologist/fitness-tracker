'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { WorkoutSession } from './WorkoutDashboard'

interface WorkoutFormData {
  date: string
  source: string
  activity: string
  minutes: number
  miles?: number
  weightLifted?: number
  notes?: string
}

interface WorkoutFormProps {
  onSubmit: (session: Omit<WorkoutSession, 'id'>) => void
  initial?: Partial<WorkoutSession>
  submitLabel?: string
}

function toLocalDateInputValue(d: Date) {
  const today = new Date(d.getTime() - (d.getTimezoneOffset() * 60000))
    .toISOString()
    .split('T')[0]
  return today
}

function parseLocalDateInput(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Helper to get custom activities from localStorage
function getStoredCustomActivities(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('customActivities')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Helper to save custom activity to localStorage
function saveCustomActivity(activity: string) {
  if (typeof window === 'undefined') return
  try {
    const stored = getStoredCustomActivities()
    if (!stored.includes(activity)) {
      const updated = [...stored, activity].slice(-20) // Keep last 20 custom activities
      localStorage.setItem('customActivities', JSON.stringify(updated))
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function WorkoutForm({ onSubmit, initial, submitLabel = 'Add Workout' }: WorkoutFormProps) {
  // Default to today, or initial date if provided
  const today = useMemo(() => new Date(), [])
  const defaultDate = toLocalDateInputValue(initial?.date ?? today)

  const { register, handleSubmit, watch, reset, formState: { errors }, setValue } = useForm<WorkoutFormData>({
    defaultValues: {
      date: defaultDate,
      source: initial?.source ?? '',
      activity: initial?.activity ?? '',
      minutes: initial?.minutes ?? 0,
      miles: initial?.miles,
      weightLifted: initial?.weightLifted,
      notes: initial?.notes ?? ''
    }
  })

  useEffect(() => {
    reset({
      date: toLocalDateInputValue(initial?.date ?? today),
      source: initial?.source ?? '',
      activity: initial?.activity ?? '',
      minutes: initial?.minutes ?? 0,
      miles: initial?.miles,
      weightLifted: initial?.weightLifted,
      notes: initial?.notes ?? ''
    })
  }, [initial, reset, today])

  const activity = watch('activity')
  const source = watch('source')
  const minutes = watch('minutes')
  const miles = watch('miles')
  const weightLifted = watch('weightLifted')
  
  // State for custom activity input
  const [customActivity, setCustomActivity] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customSuggestions, setCustomSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Load stored custom activities on mount
  useEffect(() => {
    setCustomSuggestions(getStoredCustomActivities())
  }, [])
  
  // Watch for source changes to toggle custom input
  useEffect(() => {
    if (source === 'Other') {
      setShowCustomInput(true)
      setValue('activity', customActivity || 'Other')
    } else {
      setShowCustomInput(false)
      setCustomActivity('')
      if (source) {
        setValue('activity', '') // Reset activity when source changes
      }
    }
  }, [source, customActivity, setValue])

  const sources = ['Peloton', 'Tonal', 'Cannondale', 'Gym', 'Other']
  
  // Define source-to-activity mapping
  const sourceActivityMap: Record<string, string[]> = {
    'Peloton': ['Cycling', 'Outdoor cycling', 'Weight lifting', 'Walking', 'Running', 'Yoga'],
    'Tonal': ['Weight lifting'],
    'Cannondale': ['Outdoor cycling'],
    'Gym': ['Weight lifting', 'Running', 'Swimming'],
    'Other': ['Other']
  };
  
  // Get filtered activities based on selected source
  const getFilteredActivities = () => {
    if (!source) return [];
    return sourceActivityMap[source] || [];
  };
  
  const activities = getFilteredActivities();
  
  // Show miles field for cardio activities or custom activities with cardio keywords
  const showMiles = (() => {
    const cardioActivities = ['Cycling', 'Outdoor cycling', 'Running', 'Swimming', 'Walking'];
    if (cardioActivities.includes(activity)) return true;
    
    // For custom activities, check for cardio-related keywords
    if (source === 'Other' && customActivity) {
      const cardioKeywords = ['run', 'walk', 'swim', 'bike', 'cycle', 'jog', 'hike', 'row'];
      return cardioKeywords.some(keyword => 
        customActivity.toLowerCase().includes(keyword)
      );
    }
    return false;
  })();
  
  // Show weight lifted for strength activities or custom activities with strength keywords
  const showWeight = (() => {
    if (activity === 'Weight lifting' || source === 'Tonal') return true;
    
    // For custom activities, check for strength-related keywords
    if (source === 'Other' && customActivity) {
      const strengthKeywords = ['weight', 'lift', 'strength', 'gym', 'dumbbell', 'barbell', 'press', 'curl', 'squat'];
      return strengthKeywords.some(keyword => 
        customActivity.toLowerCase().includes(keyword)
      );
    }
    return false;
  })();

  const onFormSubmit = (data: WorkoutFormData) => {
    const finalActivity = source === 'Other' && customActivity ? customActivity : data.activity
    
    // Save custom activity to localStorage if it's from Other source
    if (source === 'Other' && customActivity) {
      saveCustomActivity(customActivity)
    }
    
    const session: Omit<WorkoutSession, 'id'> = {
      date: parseLocalDateInput(data.date),
      source: data.source,
      activity: finalActivity,
      minutes: Number(data.minutes),
      miles: data.miles ? Number(data.miles) : undefined,
      weightLifted: data.weightLifted ? Number(data.weightLifted) : undefined,
      notes: data.notes || undefined
    }
    onSubmit(session)
    reset()
    setCustomActivity('') // Reset custom activity
  }

  const handleValueChange = (field: 'minutes' | 'miles' | 'weightLifted', value: string) => {
    // Allow any number of decimal places in input
    if (value === '') {
      setValue(field, 0);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setValue(field, numValue);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-1 gap-4">
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date
        </label>
        <input
          type="date"
          {...register('date', { required: 'Date is required' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Source
        </label>
        <select
          {...register('source', { required: 'Source is required' })}
          onChange={(e) => {
            setValue('source', e.target.value);
            setValue('activity', ''); // Reset activity when source changes
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option value="">Select source</option>
          {sources.map(src => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
        {errors.source && <p className="text-red-500 text-xs mt-1">{errors.source.message}</p>}
      </div>

      {/* Activity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Activity
        </label>
        <select
          {...register('activity', { required: 'Activity is required' })}
          disabled={!source}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
        >
          <option value="">Select activity</option>
          {activities.map(act => (
            <option key={act} value={act}>{act}</option>
          ))}
        </select>
        {errors.activity && <p className="text-red-500 text-xs mt-1">{errors.activity.message}</p>}
      </div>

      {/* Minutes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Minutes
        </label>
        <input
          type="number"
          step="any"
          placeholder="Minutes"
          value={minutes}
          onChange={(e) => handleValueChange('minutes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        {errors.minutes && <p className="text-red-500 text-xs mt-1">{errors.minutes.message}</p>}
      </div>

      {/* Miles (conditional) */}
      {showMiles && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Miles
          </label>
          <input
            type="number"
            step="any"
            placeholder="Miles"
            value={miles}
            onChange={(e) => handleValueChange('miles', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      )}

      {/* Weight Lifted (conditional) */}
      {showWeight && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Weight Lifted (lbs)
          </label>
          <input
            type="number"
            step="any"
            placeholder="Weight (lbs)"
            value={weightLifted}
            onChange={(e) => handleValueChange('weightLifted', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
      )}

      {/* Notes */}
      <div className="col-span-full">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes (optional)
        </label>
        <textarea
          {...register('notes')}
          placeholder="Any additional notes..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
      </div>

      {/* Submit Button */}
      <div className="md:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          {submitLabel ?? 'Add Workout Session'}
        </button>
      </div>
    </form>
  )
}