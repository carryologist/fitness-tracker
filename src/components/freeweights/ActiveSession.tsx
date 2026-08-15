'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Clock, Weight, X, Pencil, BookOpen } from 'lucide-react'
import { WEIGHT_TIERS, customSetVolume, type FreeWeightExercise, type FreeWeightRoutine } from '@/lib/freeWeights'

export interface SetState {
  completed: boolean
  actualReps: number
  actualWeight: number
  /** Dumbbell tiers combined to make up actualWeight, e.g. [10, 20] for a
   * stacked 20lb + 10lb set. Defaults to a single-element array matching
   * actualWeight for sets that haven't been edited. */
  actualWeightTiers: number[]
}

interface ActiveSessionProps {
  routine: FreeWeightRoutine
  checked: Record<string, SetState[]>
  elapsedSeconds: number
  totalVolume: number
  onToggleSet: (exerciseId: string, setIndex: number) => void
  onEditSet: (
    exerciseId: string,
    setIndex: number,
    actualReps: number,
    actualWeight: number,
    actualWeightTiers: number[]
  ) => void
  onFinish: () => void
  onCancel: () => void
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function SetEditor({
  exercise,
  set,
  onSave,
  onClose,
}: {
  exercise: FreeWeightExercise
  set: SetState
  onSave: (actualReps: number, actualWeight: number, actualWeightTiers: number[]) => void
  onClose: () => void
}) {
  const [reps, setReps] = useState(set.actualReps)
  const [tiers, setTiers] = useState<number[]>(
    set.actualWeightTiers?.length ? set.actualWeightTiers : [set.actualWeight]
  )
  const combinedWeight = tiers.reduce((sum, t) => sum + t, 0)

  const toggleTier = (tier: number) => {
    setTiers(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier].sort((a, b) => a - b)
    )
  }

  return (
    <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Actual reps</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReps(r => Math.max(0, r - 1))}
            className="w-7 h-7 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold text-gray-900 dark:text-gray-100">{reps}</span>
          <button
            onClick={() => setReps(r => r + 1)}
            className="w-7 h-7 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Dumbbell(s) used</label>
        <div className="flex gap-1">
          {WEIGHT_TIERS.map(tier => (
            <button
              key={tier}
              onClick={() => toggleTier(tier)}
              aria-pressed={tiers.includes(tier)}
              className={`px-2 py-1 rounded-md text-xs font-semibold border ${
                tiers.includes(tier)
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Combined: {combinedWeight} lb{tiers.length > 1 ? ` (${tiers.join(' + ')})` : ''}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave(reps, combinedWeight, tiers)
            onClose()
          }}
          disabled={tiers.length === 0}
          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-1.5 rounded-md"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="px-3 text-sm text-gray-500 dark:text-gray-400"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Planned: {exercise.reps} reps × {exercise.weightPerDumbbell} lb. One-off for this set only.
      </p>
    </div>
  )
}

export function ActiveSession({
  routine,
  checked,
  elapsedSeconds,
  totalVolume,
  onToggleSet,
  onEditSet,
  onFinish,
  onCancel,
}: ActiveSessionProps) {
  const [editing, setEditing] = useState<{ exerciseId: string; setIndex: number } | null>(null)

  const totalSets = routine.exercises.reduce((sum, ex) => sum + ex.sets, 0)
  const completedSets = routine.exercises.reduce(
    (sum, ex) => sum + (checked[ex.id]?.filter(s => s.completed).length ?? 0),
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
          const exerciseSets = checked[exercise.id] ?? []
          return (
            <div
              key={exercise.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  {exercise.name}
                  <Link
                    href={`/freeweights/glossary#${exercise.id}`}
                    target="_blank"
                    className="text-gray-400 hover:text-primary-500"
                    aria-label={`What is ${exercise.name}?`}
                    title="What is this exercise?"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </Link>
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {exercise.weightPerDumbbell} lb {exercise.load === 'bilateral' ? '(each)' : ''} · {exercise.reps} reps
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {exerciseSets.map((set, setIndex) => {
                  const isEditingThis = editing?.exerciseId === exercise.id && editing.setIndex === setIndex
                  const modified = set.actualReps !== exercise.reps || set.actualWeight !== exercise.weightPerDumbbell
                  return (
                    <div key={setIndex} className={isEditingThis ? 'w-full' : ''}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onToggleSet(exercise.id, setIndex)}
                          aria-pressed={set.completed}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            set.completed
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                              set.completed ? 'bg-white border-white' : 'border-gray-400'
                            }`}
                          >
                            {set.completed && <Check className="w-3 h-3 text-primary-600" />}
                          </span>
                          Set {setIndex + 1}
                          {modified && <span className="text-[10px] opacity-80">*</span>}
                        </button>
                        <button
                          onClick={() => setEditing(isEditingThis ? null : { exerciseId: exercise.id, setIndex })}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                          aria-label={`Edit set ${setIndex + 1} for ${exercise.name}`}
                          title="Edit reps/weight for this set"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {set.actualWeightTiers.length > 1 && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ml-1">
                          {set.actualWeightTiers.join(' + ')} lb combined
                        </p>
                      )}
                      {isEditingThis && (
                        <SetEditor
                          exercise={exercise}
                          set={set}
                          onSave={(actualReps, actualWeight, actualWeightTiers) =>
                            onEditSet(exercise.id, setIndex, actualReps, actualWeight, actualWeightTiers)
                          }
                          onClose={() => setEditing(null)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {customSetVolume(exercise, exercise.reps, exercise.weightPerDumbbell)} lb/set planned
                {exerciseSets.some(s => s.actualReps !== exercise.reps || s.actualWeight !== exercise.weightPerDumbbell) && ' · * = edited for this session'}
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
