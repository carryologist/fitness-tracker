'use client'

import { useEffect, useState } from 'react'
import {
  FREE_WEIGHT_ROUTINES,
  WEIGHT_TIERS,
  mergeProgress,
  type FreeWeightProgressRow,
  type FreeWeightRoutine,
} from '@/lib/freeWeights'

/**
 * Phase 2 progression control. Both reps/set and dumbbell weight (one of
 * the 5/10/15/20 lb tiers you own) are directly editable per exercise and
 * persist to the database, overriding the code defaults on every load.
 */
export function FreeWeightProgressSettings() {
  const [routines, setRoutines] = useState<FreeWeightRoutine[]>(FREE_WEIGHT_ROUTINES)
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/freeweights/progress')
      .then(res => (res.ok ? res.json() : { progress: [] }))
      .then((data: { progress: FreeWeightProgressRow[] }) => {
        if (cancelled) return
        setRoutines(mergeProgress(FREE_WEIGHT_ROUTINES, data.progress ?? []))
      })
      .catch(() => {
        // Keep code defaults.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const patch = async (exerciseId: string, reps: number, weightPerDumbbell: number) => {
    setPendingId(exerciseId)
    try {
      const res = await fetch('/api/freeweights/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, reps, weightPerDumbbell }),
      })
      if (!res.ok) return
      setRoutines(prev =>
        prev.map(r => ({
          ...r,
          exercises: r.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, reps, weightPerDumbbell: weightPerDumbbell as typeof ex.weightPerDumbbell } : ex
          ),
        }))
      )
    } finally {
      setPendingId(null)
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading progression…</p>
    )
  }

  return (
    <div className="space-y-4">
      {routines.map(routine => (
        <div key={routine.id}>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
            {routine.name} Day
          </p>
          <div className="space-y-2">
            {routine.exercises.map(exercise => {
              const disabled = pendingId === exercise.id

              return (
                <div key={exercise.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{exercise.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {exercise.weightPerDumbbell} lb · {exercise.reps} reps/set
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex gap-1">
                      {WEIGHT_TIERS.map(tier => (
                        <button
                          key={tier}
                          disabled={disabled}
                          onClick={() => patch(exercise.id, exercise.reps, tier)}
                          className={`px-2 py-1 rounded-md text-xs font-semibold border disabled:opacity-40 ${
                            exercise.weightPerDumbbell === tier
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={disabled || exercise.reps <= 1}
                        onClick={() => patch(exercise.id, exercise.reps - 1, exercise.weightPerDumbbell)}
                        className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                      >
                        −
                      </button>
                      <button
                        disabled={disabled}
                        onClick={() => patch(exercise.id, exercise.reps + 1, exercise.weightPerDumbbell)}
                        className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
