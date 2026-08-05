'use client'

import { Check, Clock, Weight, X } from 'lucide-react'
import { perRepVolume, type FreeWeightRoutine } from '@/lib/freeWeights'

interface ActiveSessionProps {
  routine: FreeWeightRoutine
  checked: Record<string, boolean[]>
  elapsedSeconds: number
  totalVolume: number
  onToggleSet: (exerciseId: string, setIndex: number) => void
  onFinish: () => void
  onCancel: () => void
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function ActiveSession({
  routine,
  checked,
  elapsedSeconds,
  totalVolume,
  onToggleSet,
  onFinish,
  onCancel,
}: ActiveSessionProps) {
  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0)
  const completedSets = routine.exercises.reduce(
    (sum, ex) => sum + (checked[ex.id]?.filter(Boolean).length ?? 0),
    0
  )
  const anySetCompleted = completedSets > 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{routine.name} Day</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {completedSets} / {totalSets} sets complete
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Cancel workout"
          title="Cancel workout"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sticky timer + tally */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          <Clock className="w-5 h-5 text-primary-500" />
          {formatElapsed(elapsedSeconds)}
        </div>
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          <Weight className="w-5 h-5 text-primary-500" />
          {totalVolume.toLocaleString()} lbs
        </div>
      </div>

      <div className="space-y-4">
        {routine.exercises.map(exercise => {
          const volumePerRep = perRepVolume(exercise)
          const exerciseChecked = checked[exercise.id] ?? Array(exercise.sets).fill(false)
          return (
            <div
              key={exercise.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {exercise.weightPerDumbbell} lb {exercise.load === 'bilateral' ? '(each)' : ''} · {exercise.reps} reps
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {exerciseChecked.map((isChecked, setIndex) => (
                  <button
                    key={setIndex}
                    onClick={() => onToggleSet(exercise.id, setIndex)}
                    aria-pressed={isChecked}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isChecked
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                        isChecked ? 'bg-white border-white' : 'border-gray-400'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 text-primary-600" />}
                    </span>
                    Set {setIndex + 1}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {volumePerRep} lb/rep planned
              </p>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onFinish}
            disabled={!anySetCompleted}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg shadow-sm transition-colors"
          >
            Finish Workout
          </button>
        </div>
      </div>
    </div>
  )
}
