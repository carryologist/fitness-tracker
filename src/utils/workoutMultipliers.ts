import { WorkoutSession } from '../components/WorkoutDashboard'

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
