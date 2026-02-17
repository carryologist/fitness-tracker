import HealthKit, {
  isHealthDataAvailable,
  queryWorkoutSamples,
  WorkoutActivityType,
  WorkoutTypeIdentifier,
  HKQuantityTypeIdentifier,
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
      toRead: [
        WorkoutTypeIdentifier,
        HKQuantityTypeIdentifier.distanceCycling,
        HKQuantityTypeIdentifier.distanceWalkingRunning,
        HKQuantityTypeIdentifier.activeEnergyBurned,
      ],
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
        console.log(`[HealthKit] Getting distance for ${source} ${activity} workout...`);
        console.log(`[HealthKit] Workout object keys:`, Object.keys(workout));
        
        // Method 1: Check totalDistance property (iOS 16+)
        if ((workout as any).totalDistance) {
          const distanceObj = (workout as any).totalDistance;
          console.log(`[HealthKit] totalDistance found:`, JSON.stringify(distanceObj));
          
          // Handle HKQuantity object
          if (distanceObj && typeof distanceObj === 'object') {
            // Try quantity property (new API)
            if (distanceObj.quantity !== undefined) {
              const distanceMeters = distanceObj.unit === 'mi' 
                ? distanceObj.quantity * 1609.34 
                : distanceObj.quantity;
              
              if (distanceMeters > 0) {
                miles = Math.round((distanceMeters / 1609.34) * 10) / 10;
                console.log(`[HealthKit] Got miles from totalDistance.quantity: ${miles}`);
              }
            }
            // Try direct number value
            else if (typeof distanceObj === 'number') {
              const distanceMeters = distanceObj;
              miles = Math.round((distanceMeters / 1609.34) * 10) / 10;
              console.log(`[HealthKit] Got miles from totalDistance number: ${miles}`);
            }
          }
        }
        
        // Method 2: Try totalDistance() method if it exists (some iOS versions)
        if (!miles && typeof (workout as any).totalDistance === 'function') {
          try {
            const distanceValue = await (workout as any).totalDistance();
            console.log(`[HealthKit] totalDistance() method returned:`, distanceValue);
            if (distanceValue && distanceValue.quantity) {
              const distanceMeters = distanceValue.quantity;
              miles = Math.round((distanceMeters / 1609.34) * 10) / 10;
              console.log(`[HealthKit] Got miles from totalDistance() method: ${miles}`);
            }
          } catch (methodError) {
            console.log(`[HealthKit] totalDistance() method failed:`, methodError);
          }
        }
        
        // Method 3: Use statistics API (most reliable fallback)
        if (!miles) {
          console.log(`[HealthKit] Trying statistics API...`);
          
          // Try cycling distance
          try {
            const cyclingStats = await workout.getStatistic('HKQuantityTypeIdentifierDistanceCycling', 'mi');
            console.log(`[HealthKit] Cycling stats:`, JSON.stringify(cyclingStats));
            if (cyclingStats?.sumQuantity?.quantity) {
              miles = Math.round(cyclingStats.sumQuantity.quantity * 10) / 10;
              console.log(`[HealthKit] Got miles from cycling stats: ${miles}`);
            }
          } catch (cyclingError) {
            console.log(`[HealthKit] Cycling stats error:`, cyclingError);
          }
          
          // Try walking/running distance
          if (!miles) {
            try {
              const walkRunStats = await workout.getStatistic('HKQuantityTypeIdentifierDistanceWalkingRunning', 'mi');
              console.log(`[HealthKit] Walk/run stats:`, JSON.stringify(walkRunStats));
              if (walkRunStats?.sumQuantity?.quantity) {
                miles = Math.round(walkRunStats.sumQuantity.quantity * 10) / 10;
                console.log(`[HealthKit] Got miles from walk/run stats: ${miles}`);
              }
            } catch (walkRunError) {
              console.log(`[HealthKit] Walk/run stats error:`, walkRunError);
            }
          }
        }
        
        if (!miles) {
          console.log(`[HealthKit] WARNING: No distance data found for this workout`);
        } else {
          console.log(`[HealthKit] SUCCESS: Final miles value: ${miles}`);
        }
      } catch (e) {
        console.log('[HealthKit] FATAL ERROR getting distance stats:', e);
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
      
      const workoutData = {
        id: workout.uuid,
        date: workout.startDate.toISOString(),
        source,
        activity,
        minutes: durationMinutes,
        miles: miles && miles > 0 ? miles : undefined,
        weightLifted: weightLifted,
      };
      
      console.log(`[HealthKit] Pushing workout to array:`, JSON.stringify(workoutData));
      mappedWorkouts.push(workoutData);
    }
    
    return mappedWorkouts;
  } catch (error) {
    console.error('Failed to fetch workouts from HealthKit:', error);
    return [];
  }
}

// Helper to generate a unique key for deduplication
export function getWorkoutKey(workout: HealthKitWorkout | WorkoutSession): string {
  // Include full ISO timestamp to handle multiple workouts on same day
  const timestamp = new Date(workout.date).toISOString();
  return `${timestamp}-${workout.source}-${workout.activity}-${workout.minutes}`;
}
