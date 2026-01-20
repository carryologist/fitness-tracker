import HealthKit, {
  isHealthDataAvailable,
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
// Also handles outdoor cycling from Peloton -> Cannondale mapping
function normalizeSourceName(
  sourceName: string, 
  bundleId?: string,
  isIndoor?: boolean,
  workoutType?: WorkoutActivityType
): string | null {
  const lowerName = sourceName.toLowerCase();
  const lowerBundle = bundleId?.toLowerCase() || '';
  
  // Check if this is a Peloton workout
  if (lowerName.includes('peloton') || lowerBundle.includes('peloton')) {
    // If it's outdoor cycling from Peloton, map to Cannondale
    if (workoutType === WorkoutActivityType.cycling && isIndoor === false) {
      return 'Cannondale';
    }
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
    // Check availability first
    if (!isHealthDataAvailable()) {
      console.error('HealthKit not available on this device');
      return false;
    }
    
    // Use the named export directly instead of default export
    const { requestAuthorization } = await import('@kingstinct/react-native-healthkit');
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
    
    // v13 API takes a single object argument
    const status = await HealthKit.getRequestStatusForAuthorization({
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
      
      // Check if indoor workout (HealthKit metadata)
      // metadataIndoorWorkout is true for indoor, false for outdoor, undefined if not set
      const isIndoor = workout.metadataIndoorWorkout;
      
      const source = normalizeSourceName(sourceName, bundleId, isIndoor, workout.workoutActivityType);
      if (!source) continue; // Skip non-matching sources
      
      const activity = getActivity(source, workout.workoutActivityType);
      if (!activity) continue; // Skip unknown activity types
      
      // Duration is in seconds
      const durationSeconds = typeof workout.duration === 'object' 
        ? (workout.duration as { quantity: number }).quantity 
        : workout.duration;
      const durationMinutes = Math.round(durationSeconds / 60);
      if (durationMinutes < 1) continue; // Skip very short workouts
      
      // Get distance and weight via statistics if available
      let miles: number | undefined;
      let weightLifted: number | undefined;
      
      try {
        // First check totalDistance property on workout (most reliable)
        if (workout.totalDistance) {
          const distanceObj = workout.totalDistance as { quantity?: number; unit?: string } | number;
          let distanceMeters: number;
          if (typeof distanceObj === 'number') {
            distanceMeters = distanceObj;
          } else if (distanceObj.quantity !== undefined) {
            // Convert based on unit - default is meters
            distanceMeters = distanceObj.unit === 'mi' 
              ? distanceObj.quantity * 1609.34 
              : distanceObj.quantity;
          } else {
            distanceMeters = 0;
          }
          if (distanceMeters > 0) {
            miles = Math.round((distanceMeters / 1609.34) * 10) / 10;
          }
        }
        
        // Fallback to statistics if totalDistance not available
        if (!miles) {
          const cyclingStats = await workout.getStatistic('HKQuantityTypeIdentifierDistanceCycling', 'mi');
          if (cyclingStats?.sumQuantity) {
            miles = Math.round(cyclingStats.sumQuantity.quantity * 10) / 10;
          } else {
            const walkRunStats = await workout.getStatistic('HKQuantityTypeIdentifierDistanceWalkingRunning', 'mi');
            if (walkRunStats?.sumQuantity) {
              miles = Math.round(walkRunStats.sumQuantity.quantity * 10) / 10;
            }
          }
        }
      } catch (e) {
        console.log('Could not get distance stats:', e);
      }
      
      // For strength training, try to get total weight lifted (Tonal may provide this)
      if (activity === 'Weight Lifting') {
        try {
          // Try to get exercise time stats as a fallback, or any weight-related stats
          const allStats = await workout.getAllStatistics();
          console.log('Tonal workout stats:', JSON.stringify(Object.keys(allStats)));
          
          // Check for any weight/energy stats that Tonal might provide
          // Tonal doesn't have a standard "total weight lifted" in HealthKit,
          // but we log available stats for future reference
        } catch (e) {
          console.log('Could not get weight stats:', e);
        }
      }
      
      mappedWorkouts.push({
        id: workout.uuid,
        date: workout.startDate.toISOString(),
        source,
        activity,
        minutes: durationMinutes,
        miles: miles && miles > 0 ? miles : undefined,
        weightLifted: weightLifted,
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
