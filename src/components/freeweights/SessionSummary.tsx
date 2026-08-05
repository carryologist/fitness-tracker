'use client'

import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { FreeWeightRoutine } from '@/lib/freeWeights'

interface SessionSummaryProps {
  routine: FreeWeightRoutine
  elapsedMinutes: number
  totalVolume: number
  setsCompleted: number
  totalSets: number
  saving: boolean
  error: string | null
  saved: boolean
  onSave: () => void
  onDiscard: () => void
  onDone: () => void
}

export function SessionSummary({
  routine,
  elapsedMinutes,
  totalVolume,
  setsCompleted,
  totalSets,
  saving,
  error,
  saved,
  onSave,
  onDiscard,
  onDone,
}: SessionSummaryProps) {
  return (
    <div className="max-w-md mx-auto px-4 py-10 text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {routine.name} Day Complete
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {setsCompleted} / {totalSets} sets completed
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{elapsedMinutes}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">minutes</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalVolume.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">lbs lifted</p>
        </div>
      </div>

      {saved ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            Logged to Fit Track
          </div>
          <button
            onClick={onDone}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
          >
            {saving ? 'Logging…' : 'Log Workout'}
          </button>
          <button
            onClick={onDiscard}
            disabled={saving}
            className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium py-2 transition-colors"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  )
}
