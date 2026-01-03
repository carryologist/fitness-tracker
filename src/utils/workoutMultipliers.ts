import { WorkoutSession } from '../components/WorkoutDashboard'

/**
 * Apply special multipliers to workout miles based on source
 *
 * Currently supported multipliers:
 * - Cannondale: 1.5x miles
 *
 * @param sessions Array of workout sessions
 * @returns Array of workout sessions with multipliers applied
 */
export function applyWorkoutMultipliers(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.map(session => {
    // Apply 1.5x multiplier to Cannondale rides
    if (session.source === 'Cannondale' && session.miles) {
      return {
        ...session,
        // Keep the original miles value but create a new property for the multiplied value
        adjustedMiles: session.miles * 1.5
      };
    }

    // For non-Cannondale rides, set adjustedMiles to regular miles
    return {
      ...session,
      adjustedMiles: session.miles
    };
  });
}