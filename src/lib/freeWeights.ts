// Free Weights travel mode: fixed Push / Pull / Legs routines for dumbbell-only
// workouts (no bench, no rack) while away from the Tonal.
//
// Phase 1 (current): routines are code-defined constants. Every exercise and
// routine carries a stable `id` slug so Phase 2 (DB-backed persistence +
// "increase reps" progression, surfaced in Settings) can key off the same
// identifiers without renumbering anything.
//
// Phase 2 (not yet built): persist routines/progression in the database and
// let reps-per-set grow over time from Settings. Weight is fixed by the
// dumbbells available (5/10/15/20 lb pairs), so only reps increase.

export type LoadType = 'bilateral' | 'unilateral' | 'single'

export interface FreeWeightExercise {
  /** Stable slug, e.g. "push-overhead-press". Used as the React key and as
   * the future DB foreign key — do not change once shipped. */
  id: string
  name: string
  /**
   * How weight is loaded per rep:
   * - bilateral: both dumbbells move together every rep. Volume/rep = 2 * weightPerDumbbell.
   * - unilateral: one dumbbell moves per rep (e.g. single-arm row), even if
   *   you alternate arms within a set. Volume/rep = weightPerDumbbell.
   * - single: one dumbbell held with both hands (e.g. goblet squat). Volume/rep = weightPerDumbbell.
   */
  load: LoadType
  /** One of the dumbbell pairs you're traveling with: 5, 10, 15, or 20 lb. */
  weightPerDumbbell: 5 | 10 | 15 | 20
  sets: number
  reps: number
}

export interface FreeWeightRoutine {
  id: 'push' | 'pull' | 'legs'
  name: string
  description: string
  exercises: FreeWeightExercise[]
}

/** Volume (lbs) contributed by a single rep of this exercise. */
export function perRepVolume(exercise: FreeWeightExercise): number {
  const multiplier = exercise.load === 'bilateral' ? 2 : 1
  return exercise.weightPerDumbbell * multiplier
}

/** Total planned volume (lbs) for one exercise if every set is completed as planned. */
export function plannedExerciseVolume(exercise: FreeWeightExercise): number {
  return perRepVolume(exercise) * exercise.reps * exercise.sets
}

/** Total planned volume (lbs) for an entire routine if every set is completed as planned. */
export function plannedRoutineVolume(routine: FreeWeightRoutine): number {
  return routine.exercises.reduce((sum, ex) => sum + plannedExerciseVolume(ex), 0)
}

/** Volume (lbs) for one completed set, given the reps actually done. */
export function setVolume(exercise: FreeWeightExercise, repsCompleted: number): number {
  return perRepVolume(exercise) * repsCompleted
}

export const FREE_WEIGHT_ROUTINES: FreeWeightRoutine[] = [
  {
    id: 'push',
    name: 'Push',
    description: 'Chest, shoulders, triceps',
    exercises: [
      { id: 'push-overhead-press', name: 'Standing Overhead Press', load: 'bilateral', weightPerDumbbell: 15, sets: 5, reps: 15 },
      { id: 'push-floor-chest-press', name: 'Floor Chest Press', load: 'bilateral', weightPerDumbbell: 20, sets: 5, reps: 15 },
      { id: 'push-floor-chest-fly', name: 'Floor Chest Fly', load: 'bilateral', weightPerDumbbell: 10, sets: 5, reps: 15 },
      { id: 'push-lateral-raise', name: 'Lateral Raise', load: 'bilateral', weightPerDumbbell: 5, sets: 5, reps: 15 },
      { id: 'push-triceps-kickback', name: 'Triceps Kickback', load: 'unilateral', weightPerDumbbell: 10, sets: 5, reps: 15 },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    description: 'Back, biceps, rear delts',
    exercises: [
      { id: 'pull-bent-over-row', name: 'Bent-Over Row', load: 'bilateral', weightPerDumbbell: 20, sets: 5, reps: 15 },
      { id: 'pull-single-arm-row', name: 'Single-Arm Row', load: 'unilateral', weightPerDumbbell: 20, sets: 5, reps: 15 },
      { id: 'pull-bicep-curl', name: 'Bicep Curl', load: 'bilateral', weightPerDumbbell: 10, sets: 5, reps: 15 },
      { id: 'pull-hammer-curl', name: 'Hammer Curl', load: 'bilateral', weightPerDumbbell: 10, sets: 5, reps: 15 },
      { id: 'pull-rear-delt-fly', name: 'Rear Delt Fly', load: 'bilateral', weightPerDumbbell: 5, sets: 5, reps: 15 },
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    description: 'Quads, hamstrings, glutes, calves',
    exercises: [
      { id: 'legs-suitcase-squat', name: 'Suitcase Squat', load: 'bilateral', weightPerDumbbell: 20, sets: 6, reps: 15 },
      { id: 'legs-romanian-deadlift', name: 'Romanian Deadlift', load: 'bilateral', weightPerDumbbell: 15, sets: 6, reps: 15 },
      { id: 'legs-reverse-lunge', name: 'Reverse Lunge', load: 'bilateral', weightPerDumbbell: 10, sets: 6, reps: 15 },
      { id: 'legs-calf-raise', name: 'Calf Raise', load: 'bilateral', weightPerDumbbell: 5, sets: 6, reps: 15 },
      { id: 'legs-glute-bridge', name: 'Glute Bridge', load: 'single', weightPerDumbbell: 15, sets: 6, reps: 15 },
    ],
  },
]

export function getRoutine(id: string): FreeWeightRoutine | undefined {
  return FREE_WEIGHT_ROUTINES.find(r => r.id === id)
}

/**
 * Rough session-length estimate for the routine picker screen. Assumes
 * ~3 sec/rep, 45 sec rest between sets, and a 30 sec transition between
 * exercises. Rest time is intentionally baked into this estimate (and into
 * the real session timer) rather than tracked separately, matching how
 * Tonal's synced `minutes` already includes rest.
 */
export function estimateRoutineMinutes(routine: FreeWeightRoutine): number {
  const SEC_PER_REP = 3
  const REST_SEC_PER_SET = 45
  const TRANSITION_SEC_PER_EXERCISE = 30

  const totalSec = routine.exercises.reduce((sum, ex) => {
    const workSec = ex.sets * (ex.reps * SEC_PER_REP + REST_SEC_PER_SET)
    return sum + workSec + TRANSITION_SEC_PER_EXERCISE
  }, 0)

  return Math.round(totalSec / 60)
}
