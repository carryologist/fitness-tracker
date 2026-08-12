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
  /** Two-sentence, no-jargon how-to. Shown in the exercise glossary and
   * linked from the routine picker / active session for anyone (including
   * future-you) who forgets what a "Floor Chest Fly" is. */
  description: string
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

/**
 * Volume (lbs) for one completed set when both the reps AND the dumbbell
 * weight actually used differ from the exercise's planned values (Phase 2
 * per-set editing — e.g. you swapped to a lighter pair mid-set).
 */
export function customSetVolume(exercise: FreeWeightExercise, actualReps: number, actualWeight: number): number {
  const multiplier = exercise.load === 'bilateral' ? 2 : 1
  return actualWeight * multiplier * actualReps
}

export const FREE_WEIGHT_ROUTINES: FreeWeightRoutine[] = [
  {
    id: 'push',
    name: 'Push',
    description: 'Chest, shoulders, triceps',
    exercises: [
      {
        id: 'push-overhead-press',
        name: 'Standing Overhead Press',
        description: 'Stand with feet shoulder-width apart, holding a dumbbell in each hand at shoulder height with palms facing forward. Press both dumbbells straight overhead until your arms are fully extended, then lower back to shoulder height with control.',
        load: 'bilateral', weightPerDumbbell: 15, sets: 5, reps: 15,
      },
      {
        id: 'push-floor-chest-press',
        name: 'Floor Chest Press',
        description: 'Lie on your back on the floor with knees bent, holding a dumbbell in each hand at chest level with elbows bent. Press both dumbbells straight up until your arms are extended, then lower until your upper arms touch the floor.',
        load: 'bilateral', weightPerDumbbell: 20, sets: 5, reps: 15,
      },
      {
        id: 'push-floor-chest-fly',
        name: 'Floor Chest Fly',
        description: "Lie on your back on the floor with a slight bend in your elbows, arms extended out to the sides at chest level holding a dumbbell in each hand. Bring the dumbbells together in an arc over your chest, then lower back out to the sides with control.",
        load: 'bilateral', weightPerDumbbell: 10, sets: 5, reps: 15,
      },
      {
        id: 'push-lateral-raise',
        name: 'Lateral Raise',
        description: "Stand with a dumbbell in each hand at your sides, palms facing your body. Raise both arms out to the sides until they're roughly shoulder height, then lower with control.",
        load: 'bilateral', weightPerDumbbell: 5, sets: 5, reps: 15,
      },
      {
        id: 'push-triceps-kickback',
        name: 'Triceps Kickback',
        description: 'Hinge forward at the hips with a flat back, holding a dumbbell in one hand with your upper arm pinned close to your torso and elbow bent. Extend your forearm straight back until your arm is fully straight, then bend it back to the start.',
        load: 'unilateral', weightPerDumbbell: 10, sets: 5, reps: 15,
      },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    description: 'Back, biceps, rear delts',
    exercises: [
      {
        id: 'pull-bent-over-row',
        name: 'Bent-Over Row',
        description: 'Hinge forward at the hips with a flat back and knees slightly bent, holding a dumbbell in each hand hanging below your shoulders. Pull both dumbbells up toward your ribcage, squeezing your shoulder blades together, then lower with control.',
        load: 'bilateral', weightPerDumbbell: 20, sets: 5, reps: 15,
      },
      {
        id: 'pull-single-arm-row',
        name: 'Single-Arm Row',
        description: 'Hinge forward at the hips with a flat back, holding a dumbbell in one hand hanging straight down while the other hand rests on your thigh for support. Pull the dumbbell up toward your ribcage, then lower it back down with control.',
        load: 'unilateral', weightPerDumbbell: 20, sets: 5, reps: 15,
      },
      {
        id: 'pull-bicep-curl',
        name: 'Bicep Curl',
        description: 'Stand with a dumbbell in each hand, arms hanging at your sides with palms facing forward. Curl both dumbbells up toward your shoulders by bending your elbows, then lower with control.',
        load: 'bilateral', weightPerDumbbell: 10, sets: 5, reps: 15,
      },
      {
        id: 'pull-hammer-curl',
        name: 'Hammer Curl',
        description: 'Stand with a dumbbell in each hand, arms hanging at your sides with palms facing your body. Curl both dumbbells up toward your shoulders while keeping your palms facing inward, then lower with control.',
        load: 'bilateral', weightPerDumbbell: 10, sets: 5, reps: 15,
      },
      {
        id: 'pull-rear-delt-fly',
        name: 'Rear Delt Fly',
        description: "Hinge forward at the hips with a flat back, holding a dumbbell in each hand hanging below your shoulders with a slight bend in your elbows. Raise both arms out to the sides until they're roughly in line with your shoulders, then lower with control.",
        load: 'bilateral', weightPerDumbbell: 5, sets: 5, reps: 15,
      },
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    description: 'Quads, hamstrings, glutes, calves',
    exercises: [
      {
        id: 'legs-suitcase-squat',
        name: 'Suitcase Squat',
        description: 'Stand holding a dumbbell in each hand at your sides, like carrying suitcases, feet about shoulder-width apart. Bend your knees and hips to lower into a squat until your thighs are roughly parallel to the floor, then stand back up.',
        load: 'bilateral', weightPerDumbbell: 20, sets: 6, reps: 15,
      },
      {
        id: 'legs-romanian-deadlift',
        name: 'Romanian Deadlift',
        description: 'Stand holding a dumbbell in each hand in front of your thighs with knees slightly bent. Hinge at the hips and push them back, lowering the dumbbells along your legs until you feel a stretch in your hamstrings, then drive your hips forward to stand back up.',
        load: 'bilateral', weightPerDumbbell: 15, sets: 6, reps: 15,
      },
      {
        id: 'legs-reverse-lunge',
        name: 'Reverse Lunge',
        description: 'Stand holding a dumbbell in each hand at your sides, then step one leg backward and lower until both knees are bent around 90 degrees. Push through your front foot to return to standing, then repeat on the other side.',
        load: 'bilateral', weightPerDumbbell: 10, sets: 6, reps: 15,
      },
      {
        id: 'legs-calf-raise',
        name: 'Calf Raise',
        description: 'Stand holding a dumbbell in each hand at your sides with feet flat on the floor. Rise up onto the balls of your feet as high as you can, then lower your heels back down with control.',
        load: 'bilateral', weightPerDumbbell: 10, sets: 6, reps: 15,
      },
      {
        id: 'legs-glute-bridge',
        name: 'Glute Bridge',
        description: 'Lie on your back with knees bent and feet flat on the floor, holding one dumbbell across your hips with both hands. Drive through your heels to lift your hips toward the ceiling, squeezing your glutes, then lower back down with control.',
        load: 'single', weightPerDumbbell: 20, sets: 6, reps: 15,
      },
    ],
  },
]

export function getRoutine(id: string): FreeWeightRoutine | undefined {
  return FREE_WEIGHT_ROUTINES.find(r => r.id === id)
}

/** All dumbbell pairs available while traveling, lightest to heaviest. */
export const WEIGHT_TIERS = [5, 10, 15, 20] as const

/** Reps/set that triggers the "level up to the next dumbbell tier" prompt. */
export const REP_CEILING = 20

/** Reps/set to restart at after leveling up to a heavier dumbbell tier. */
export const LEVEL_UP_RESET_REPS = 8

/** The next heavier dumbbell tier, or null if already at the heaviest (20 lb). */
export function nextWeightTier(current: number): 5 | 10 | 15 | 20 | null {
  const index = WEIGHT_TIERS.indexOf(current as (typeof WEIGHT_TIERS)[number])
  if (index === -1 || index === WEIGHT_TIERS.length - 1) return null
  return WEIGHT_TIERS[index + 1]
}

/** A persisted override of one exercise's weight/reps (Phase 2 progression). */
export interface FreeWeightProgressRow {
  exerciseId: string
  weightPerDumbbell: number
  reps: number
}

/**
 * Overlay DB progression rows onto the code-defined routines. Exercises
 * with no matching row keep their code default (weight + reps); `sets`
 * and `load` are never overridden — only weight and reps progress.
 */
export function mergeProgress(
  routines: FreeWeightRoutine[],
  progress: FreeWeightProgressRow[],
): FreeWeightRoutine[] {
  const byId = new Map(progress.map(p => [p.exerciseId, p]))
  return routines.map(routine => ({
    ...routine,
    exercises: routine.exercises.map(exercise => {
      const override = byId.get(exercise.id)
      if (!override) return exercise
      return {
        ...exercise,
        weightPerDumbbell: override.weightPerDumbbell as FreeWeightExercise['weightPerDumbbell'],
        reps: override.reps,
      }
    }),
  }))
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
