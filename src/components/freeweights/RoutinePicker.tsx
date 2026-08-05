'use client'

import { Dumbbell, Clock, ChevronRight } from 'lucide-react'
import { estimateRoutineMinutes, plannedRoutineVolume, type FreeWeightRoutine } from '@/lib/freeWeights'

interface RoutinePickerProps {
  routines: FreeWeightRoutine[]
  onSelect: (routine: FreeWeightRoutine) => void
}

export function RoutinePicker({ routines, onSelect }: RoutinePickerProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Free Weights</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Dumbbell-only routines for when you&apos;re away from Tonal. Pick a day to start.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {routines.map(routine => (
          <button
            key={routine.id}
            onClick={() => onSelect(routine)}
            className="text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-500 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{routine.name} Day</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{routine.description}</p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-0.5 mb-3">
              {routine.exercises.map(ex => (
                <li key={ex.id}>
                  {ex.name} — {ex.sets}×{ex.reps}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~{estimateRoutineMinutes(routine)} min
              </span>
              <span>~{plannedRoutineVolume(routine).toLocaleString()} lbs</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
