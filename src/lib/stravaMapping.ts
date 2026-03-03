import { StravaActivity } from './strava';

export interface MappedWorkout {
  source: string;
  activityType: string;
}

/**
 * Map a Strava activity to existing sources (Peloton, Tonal, Cannondale)
 * based on gear name, activity name, and sport type.
 * Returns null if the activity doesn't match any known source (filtered out).
 */
export function mapStravaToSource(activity: StravaActivity): MappedWorkout | null {
  const gearName = (activity.gear?.name ?? '').toLowerCase();
  const sportType = activity.sport_type;
  const name = (activity.name ?? '').toLowerCase();

  // Cannondale: check first — Cannondale app pushes rides with GPS distance.
  // Prioritize over Peloton since outdoor rides may have both sources.
  if (gearName.includes('cannondale') || name.includes('cannondale')) {
    return { source: 'Cannondale', activityType: 'Cycling' };
  }

  // Peloton: indoor rides, runs, yoga, strength
  if (gearName.includes('peloton') || name.includes('peloton')) {
    // Skip Peloton outdoor rides — Cannondale app handles those
    if (sportType === 'Ride' && name.includes('outdoor')) {
      return null;
    }
    if (['Ride', 'VirtualRide'].includes(sportType)) return { source: 'Peloton', activityType: 'Cycling' };
    if (sportType === 'Run') return { source: 'Peloton', activityType: 'Running' };
    if (sportType === 'Yoga') return { source: 'Peloton', activityType: 'Yoga' };
    if (['WeightTraining', 'Workout'].includes(sportType)) return { source: 'Peloton', activityType: 'Weight Lifting' };
    return { source: 'Peloton', activityType: 'Cycling' };
  }

  // Tonal: strength training
  if (gearName.includes('tonal') || name.includes('tonal')) {
    return { source: 'Tonal', activityType: 'Weight Lifting' };
  }

  // Indoor trainer rides without a known gear/name → Peloton (most likely source)
  if (['Ride', 'VirtualRide'].includes(sportType) && activity.trainer) {
    return { source: 'Peloton', activityType: 'Cycling' };
  }

  // Outdoor rides without a known gear/name → Cannondale
  if (sportType === 'Ride' && !activity.trainer) {
    return { source: 'Cannondale', activityType: 'Cycling' };
  }

  return null; // Filter out — doesn't match known sources
}

/**
 * Convert Strava distance (meters) to miles, rounded to 1 decimal.
 */
export function metersToMiles(meters: number): number {
  return Math.round((meters / 1609.34) * 10) / 10;
}
