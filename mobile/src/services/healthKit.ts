import {
  isHealthDataAvailable,
  requestAuthorization,
  getRequestStatusForAuthorization,
  queryWorkoutSamples,
  WorkoutActivityType,
  WorkoutTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import { WorkoutSession } from '../../shared/types';

// Map HealthKit activity types to our activity names
const ACTIVITY_TYPE_MAP: Partial<Record<WorkoutActivityType, string>> = {
  [WorkoutActivityType.cycling]: 'Cycling',
  [WorkoutActivityType.yoga]: 'Yoga',
  [WorkoutActivityType.traditionalStrengthTraining]: 'Weight Lifting',
  [WorkoutActivityType.functionalStrengthTraining]: 'Weight Lifting',
  [WorkoutActivityType.running]: 'Running',
  [WorkoutActivityType.walking]: 'Walking',
};

// Normalize source name from HealthKit bundle ID or name
function normalizeSourceName(sourceName: string, bundleId?: string): string | null {
  const lowerName = sourceName.toLowerCase();
  const lowerBundle = bundleId?.toLowerCase() || '';
  
  if (lowerName.includes('peloton') || lowerBundle.includes('peloton')) {
    return 'Peloton';
  }
  if (lowerName.includes('tonal') || lowerBundle.includes('tonal')) {
    return 'Tonal';
  }
  if (lowerName.includes('cannondale') || lowerBundle.includes('cannondale')) {
    return 'Cannondale';
  }
  
  return null; // Not a source we care about
}

// Get activity based on source and workout type
function getActivity(source: string, workoutType: WorkoutActivityType): string | null {
  // Tonal is always Weight Lifting
  if (source === 'Tonal') {
    return 'Weight Lifting';
  }
  
  // Cannondale is always Cycling
  if (source === 'Cannondale') {
    return 'Cycling';
  }
  
  // Peloton uses the actual workout type
  if (source === 'Peloton') {
    return ACTIVITY_TYPE_MAP[workoutType] || null;
  }
  
  return null;
}

export interface HealthKitWorkout {
  id: string;
  date: string;
  source: string;
  activity: string;
  minutes: number;
  miles?: number;
  weightLifted?: number;
}

export function isHealthKitAvailableSync(): boolean {
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  try {
    await requestAuthorization({
      toRead: [WorkoutTypeIdentifier],
    });
    return true;
  } catch (error) {
    console.error('HealthKit authorization failed:', error);
    return false;
  }
}

export async function getAuthorizationStatus(): Promise<'authorized' | 'notDetermined' | 'denied'> {
  try {
    // Check if HealthKit is available
    if (!isHealthDataAvailable()) return 'denied';
    
    // Check authorization status
    const status = await getRequestStatusForAuthorization({
      toRead: [WorkoutTypeIdentifier],
    });
    
    // Status 1 = unnecessary (already granted), 2 = required (not yet granted)
    return status === 1 ? 'authorized' : 'notDetermined';
  } catch {
    return 'denied';
  }
}

export async function fetchWorkoutsSince(since: Date): Promise<HealthKitWorkout[]> {
  try {
    const workouts = await queryWorkoutSamples({
      limit: -1, // Fetch all
      filter: {
        date: {
          startDate: since,
          endDate: new Date(),
        },
      },
    });
    
    const mappedWorkouts: HealthKitWorkout[] = [];
    
    for (const workout of workouts) {
      const sourceName = workout.sourceRevision?.source?.name || '';
      const bundleId = workout.sourceRevision?.source?.bundleIdentifier || '';
      
      const source = normalizeSourceName(sourceName, bundleId);
      if (!source) continue; // Skip non-matching sources
      
      const activity = getActivity(source, workout.workoutActivityType);
      if (!activity) continue; // Skip unknown activity types
      
      // Duration is in seconds
      const durationSeconds = typeof workout.duration === 'object' 
        ? (workout.duration as { quantity: number }).quantity 
        : workout.duration;
      const durationMinutes = Math.round(durationSeconds / 60);
      if (durationMinutes < 1) continue; // Skip very short workouts
      
      // Get distance via statistics if available
      let miles: number | undefined;
      try {
        const stats = await workout.getAllStatistics();
        const distanceStats = stats['HKQuantityTypeIdentifierDistanceWalkingRunning'] 
          || stats['HKQuantityTypeIdentifierDistanceCycling'];
        if (distanceStats?.sumQuantity) {
          // Convert meters to miles
          miles = Math.round((distanceStats.sumQuantity.quantity / 1609.344) * 10) / 10;
        }
      } catch {
        // Stats not available, continue without distance
      }
      
      mappedWorkouts.push({
        id: workout.uuid,
        date: workout.startDate.toISOString(),
        source,
        activity,
        minutes: durationMinutes,
        miles: miles && miles > 0 ? miles : undefined,
        // Note: HealthKit doesn't directly store total weight lifted,
        // this would need to come from individual exercise sets if available
        weightLifted: undefined,
      });
    }
    
    return mappedWorkouts;
  } catch (error) {
    console.error('Failed to fetch workouts from HealthKit:', error);
    return [];
  }
}

// Helper to generate a unique key for deduplication
export function getWorkoutKey(workout: HealthKitWorkout | WorkoutSession): string {
  const date = new Date(workout.date).toISOString().split('T')[0];
  return `${date}-${workout.source}-${workout.activity}-${workout.minutes}`;
}
