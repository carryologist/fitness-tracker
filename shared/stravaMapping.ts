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

  // Peloton: indoor cycling or Peloton-tagged activities
  if (gearName.includes('peloton') || name.includes('peloton')) {
    if (['Ride', 'VirtualRide'].includes(sportType)) return { source: 'Peloton', activityType: 'Cycling' };
    if (sportType === 'Run') return { source: 'Peloton', activityType: 'Running' };
    if (sportType === 'Yoga') return { source: 'Peloton', activityType: 'Yoga' };
    if (['WeightTraining', 'Workout'].includes(sportType)) return { source: 'Peloton', activityType: 'Weight Lifting' };
    // Default Peloton-tagged activity
    return { source: 'Peloton', activityType: 'Cycling' };
  }

  // Tonal: strength training tagged as Tonal
  if (gearName.includes('tonal') || name.includes('tonal')) {
    if (['WeightTraining', 'Workout'].includes(sportType)) return { source: 'Tonal', activityType: 'Weight Lifting' };
    return { source: 'Tonal', activityType: 'Weight Lifting' };
  }

  // Cannondale: outdoor cycling with Cannondale gear, or untagged rides
  if (gearName.includes('cannondale')) {
    return { source: 'Cannondale', activityType: 'Cycling' };
  }

  // Untagged outdoor rides default to Cannondale
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
