'use client'

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  FREE_WEIGHT_ROUTINES,
  REP_CEILING,
  LEVEL_UP_RESET_REPS,
  mergeProgress,
  nextWeightTier,
  type FreeWeightProgressRow,
  type FreeWeightRoutine,
} from '@/lib/freeWeights'

/**
 * Phase 2 progression control. Weight is capped by the dumbbells you
 * actually own (5/10/15/20 lb pairs), so only reps/set is adjustable here.
 * Once an exercise hits REP_CEILING at a weight below the heaviest tier,
 * a "Level Up" prompt offers to move to the next dumbbell size and reset
 * reps to a restart baseline, rather than let reps climb forever on light
 * weight.
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
              const canLevelUp = exercise.reps >= REP_CEILING && nextWeightTier(exercise.weightPerDumbbell) !== null
              const maxed = exercise.weightPerDumbbell === 20
              const disabled = pendingId === exercise.id

              return (
                <div key={exercise.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{exercise.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {exercise.weightPerDumbbell} lb · {exercise.reps} reps/set
                      {maxed && exercise.reps >= REP_CEILING && ' · maxed at 20 lb'}
                    </p>
                  </div>
                  {canLevelUp ? (
                    <button
                      disabled={disabled}
                      onClick={() => patch(exercise.id, LEVEL_UP_RESET_REPS, nextWeightTier(exercise.weightPerDumbbell)!)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 disabled:opacity-50 shrink-0"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Level up to {nextWeightTier(exercise.weightPerDumbbell)} lb
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
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
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
