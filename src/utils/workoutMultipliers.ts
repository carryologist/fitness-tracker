import { WorkoutSession } from '@/types/workout'

/**
 * Calculate default mileage for cycling workouts that have no recorded miles.
 * Uses the formula: miles = minutes * (defaultSpeed / 60)
 *
 * @param sessions Array of workout sessions
 * @param defaultSpeed Default cycling speed in mph (e.g. 17, 18, 19)
 * @returns Array of workout sessions with estimated mileage applied where needed
 */
export function applyDefaultMileage(
  sessions: WorkoutSession[],
  defaultSpeed: number = 18,
): WorkoutSession[] {
  return sessions.map(session => {
    const isCycling = session.activity.toLowerCase() === 'cycling'
    const hasMiles = session.miles !== undefined && session.miles !== null && session.miles > 0

    if (isCycling && !hasMiles && session.minutes > 0) {
      const estimatedMiles = parseFloat((session.minutes * (defaultSpeed / 60)).toFixed(2))
      return {
        ...session,
        miles: estimatedMiles,
        estimatedMiles: true,
      }
    }

    return {
      ...session,
      estimatedMiles: false,
    }
  })
}

/**
 * Apply outdoor multiplier to Cannondale rides (miles and minutes).
 *
 * @param sessions Array of workout sessions
 * @param multiplier Outdoor multiplier from settings (default 1.5)
 * @returns Array of workout sessions with multipliers applied
 */
export function applyWorkoutMultipliers(
  sessions: WorkoutSession[],
  multiplier: number = 1.5,
): WorkoutSession[] {
  return sessions.map(session => {
    if (session.source === 'Cannondale') {
      return {
        ...session,
        adjustedMiles: session.miles ? session.miles * multiplier : session.miles,
        adjustedMinutes: Math.round(session.minutes * multiplier),
      };
    }

    return {
      ...session,
      adjustedMiles: session.miles,
      adjustedMinutes: session.minutes,
    };
  });
}
