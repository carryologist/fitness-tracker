import { WorkoutSession } from '../../shared/types';

export interface CreditedWorkout extends WorkoutSession {
  creditedMinutes: number;
  creditedMiles?: number;
  isOutdoor: boolean;
}

/**
 * Apply outdoor multiplier to Cannondale workouts
 */
export function applyCreditMultiplier(
  workout: WorkoutSession,
  outdoorMultiplier: number
): CreditedWorkout {
  const isOutdoor = workout.source === 'Cannondale';
  const multiplier = isOutdoor ? outdoorMultiplier : 1;

  return {
    ...workout,
    creditedMinutes: Math.round(workout.minutes * multiplier),
    creditedMiles: workout.miles ? Math.round(workout.miles * multiplier * 10) / 10 : undefined,
    isOutdoor,
  };
}

/**
 * Apply multiplier to an array of workouts
 */
export function applyCreditMultiplierToAll(
  workouts: WorkoutSession[],
  outdoorMultiplier: number
): CreditedWorkout[] {
  return workouts.map((w) => applyCreditMultiplier(w, outdoorMultiplier));
}

/**
 * Calculate totals from credited workouts
 */
export function calculateCreditedTotals(workouts: CreditedWorkout[]): {
  totalMinutes: number;
  totalMiles: number;
  totalSessions: number;
} {
  return {
    totalMinutes: workouts.reduce((sum, w) => sum + w.creditedMinutes, 0),
    totalMiles: workouts.reduce((sum, w) => sum + (w.creditedMiles || 0), 0),
    totalSessions: workouts.length,
  };
}
