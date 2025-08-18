'use client'

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
}

const SOURCES = ['Peloton', 'Cannondale', 'Tonal', 'Gym', 'Outdoor', 'Home']
const ACTIVITIES = ['Cycling', 'Weight Lifting', 'Running', 'Swimming', 'Yoga', 'Other']

export function WorkoutForm({ onSubmit }: WorkoutFormProps) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<WorkoutFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      source: '',
      activity: '',
      minutes: 0,
      miles: undefined,
      weightLifted: undefined,
      notes: ''
    }
  })

  const activity = watch('activity')
  const source = watch('source')

  // Show miles field for cardio activities
  const showMiles = activity === 'Cycling' || activity === 'Running' || activity === 'Swimming'
  // Show weight lifted for strength activities or Tonal
  const showWeight = activity === 'Weight Lifting' || source === 'Tonal'

  const onFormSubmit = (data: WorkoutFormData) => {
    const session: Omit<WorkoutSession, 'id'> = {
      date: new Date(data.date),
      source: data.source,
      activity: data.activity,
      minutes: data.minutes,
      miles: showMiles ? data.miles : undefined,
      weightLifted: showWeight ? data.weightLifted : undefined,
      notes: data.notes || undefined
    }
    
    onSubmit(session)
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          {...register('date', { required: 'Date is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source
        </label>
        <select
          {...register('source', { required: 'Source is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select source...</option>
          {SOURCES.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
        {errors.source && <p className="text-red-500 text-xs mt-1">{errors.source.message}</p>}
      </div>

      {/* Activity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Activity
        </label>
        <select
          {...register('activity', { required: 'Activity is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select activity...</option>
          {ACTIVITIES.map(activity => (
            <option key={activity} value={activity}>{activity}</option>
          ))}
        </select>
        {errors.activity && <p className="text-red-500 text-xs mt-1">{errors.activity.message}</p>}
      </div>

      {/* Minutes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minutes
        </label>
        <input
          type="number"
          min="1"
          {...register('minutes', { 
            required: 'Minutes is required',
            min: { value: 1, message: 'Must be at least 1 minute' }
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.minutes && <p className="text-red-500 text-xs mt-1">{errors.minutes.message}</p>}
      </div>

      {/* Miles (conditional) */}
      {showMiles && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Miles
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            {...register('miles')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Weight Lifted (conditional) */}
      {showWeight && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Weight Lifted (lbs)
          </label>
          <input
            type="number"
            min="0"
            {...register('weightLifted')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Notes */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <input
          type="text"
          {...register('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional notes..."
        />
      </div>

      {/* Submit Button */}
      <div className="md:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Add Workout Session
        </button>
      </div>
    </form>
  )
}