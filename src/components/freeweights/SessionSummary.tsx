'use client'

import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import type { FreeWeightRoutine } from '@/lib/freeWeights'
import type { SetState } from './ActiveSession'

interface SessionSummaryProps {
  routine: FreeWeightRoutine
  checked: Record<string, SetState[]>
  elapsedMinutes: number
  totalVolume: number
  saving: boolean
  error: string | null
  saved: boolean
  onSave: () => void
  onDiscard: () => void
  onDone: () => void
}

export function SessionSummary({
  routine,
  checked,
  elapsedMinutes,
  totalVolume,
  saving,
  error,
  saved,
  onSave,
  onDiscard,
  onDone,
}: SessionSummaryProps) {
  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0)
  const setsCompleted = Object.values(checked).reduce(
    (sum, sets) => sum + sets.filter(s => s.completed).length,
    0
  )

  // "Don't regress" check: compare completed reps against the current
  // baseline (planned reps × completed sets) per exercise. Flags — never
  // blocks — anything that came in under the baseline you set for yourself.
  const belowBaseline = routine.exercises
    .map(exercise => {
      const sets = checked[exercise.id] ?? []
      const completedSets = sets.filter(s => s.completed)
      const baselineReps = exercise.reps * completedSets.length
      const actualReps = completedSets.reduce((sum, s) => sum + s.actualReps, 0)
      return { exercise, baselineReps, actualReps, completedSetCount: completedSets.length }
    })
    .filter(({ baselineReps, actualReps, completedSetCount }) => completedSetCount > 0 && actualReps < baselineReps)

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

      {belowBaseline.length > 0 && (
        <div className="mb-6 text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            Below your current baseline
          </div>
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-0.5">
            {belowBaseline.map(({ exercise, baselineReps, actualReps }) => (
              <li key={exercise.id}>
                {exercise.name}: {actualReps}/{baselineReps} reps
              </li>
            ))}
          </ul>
        </div>
      )}

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
