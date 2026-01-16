import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isHealthKitAvailableSync,
  requestHealthKitPermissions,
  getAuthorizationStatus,
  fetchWorkoutsSince,
  getWorkoutKey,
} from '../services/healthKit';
import { api } from '../api/client';
import { WorkoutSession } from '../../shared/types';

const LAST_SYNC_KEY = 'healthkit_last_sync';
const SYNCED_IDS_KEY = 'healthkit_synced_ids';

type AuthStatus = 'unknown' | 'authorized' | 'notDetermined' | 'denied' | 'unavailable';

interface HealthKitContextType {
  isAvailable: boolean;
  authStatus: AuthStatus;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  requestPermissions: () => Promise<boolean>;
  syncNow: () => Promise<{ synced: number; skipped: number }>;
}

const HealthKitContext = createContext<HealthKitContextType | undefined>(undefined);

export function HealthKitProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unknown');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());

  // Initialize on mount
  useEffect(() => {
    async function init() {
      // Only available on iOS
      if (Platform.OS !== 'ios') {
        setIsAvailable(false);
        setAuthStatus('unavailable');
        return;
      }

      const available = isHealthKitAvailableSync();
      setIsAvailable(available);

      if (!available) {
        setAuthStatus('unavailable');
        return;
      }

      const status = await getAuthorizationStatus();
      setAuthStatus(status);

      // Load last sync time
      const storedTime = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (storedTime) {
        setLastSyncTime(new Date(storedTime));
      }

      // Load synced workout IDs
      const storedIds = await AsyncStorage.getItem(SYNCED_IDS_KEY);
      if (storedIds) {
        setSyncedIds(new Set(JSON.parse(storedIds)));
      }
    }

    init();
  }, []);

  // Auto-sync on app foreground (if authorized)
  useEffect(() => {
    if (authStatus !== 'authorized') return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncNow();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Also sync on initial mount if authorized
    syncNow();

    return () => subscription.remove();
  }, [authStatus]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    const granted = await requestHealthKitPermissions();
    if (granted) {
      setAuthStatus('authorized');
      // Trigger initial sync after permissions granted
      syncNow();
    }
    return granted;
  }, [isAvailable]);

  const syncNow = useCallback(async (): Promise<{ synced: number; skipped: number }> => {
    if (!isAvailable || authStatus !== 'authorized' || isSyncing) {
      return { synced: 0, skipped: 0 };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Fetch workouts from the start of this year (going forward only)
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const since = lastSyncTime && lastSyncTime > startOfYear ? lastSyncTime : startOfYear;
      
      const healthKitWorkouts = await fetchWorkoutsSince(since);

      // Get existing workouts from API for deduplication
      const existingWorkouts = await api.getWorkouts();
      const existingKeys = new Set(existingWorkouts.map(getWorkoutKey));

      // Filter out already synced workouts
      const newWorkouts = healthKitWorkouts.filter((w) => {
        const key = getWorkoutKey(w);
        return !existingKeys.has(key) && !syncedIds.has(w.id);
      });

      let synced = 0;
      const newSyncedIds = new Set(syncedIds);

      // Create new workouts
      for (const workout of newWorkouts) {
        try {
          await api.createWorkout({
            date: workout.date,
            source: workout.source,
            activity: workout.activity,
            minutes: workout.minutes,
            miles: workout.miles,
            weightLifted: workout.weightLifted,
            notes: 'Synced from Apple Health',
          });
          newSyncedIds.add(workout.id);
          synced++;
        } catch (error) {
          console.error('Failed to create workout:', error);
        }
      }

      // Update state
      const now = new Date();
      setLastSyncTime(now);
      setSyncedIds(newSyncedIds);

      // Persist
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      await AsyncStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...newSyncedIds]));

      return { synced, skipped: healthKitWorkouts.length - synced };
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
      return { synced: 0, skipped: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [isAvailable, authStatus, isSyncing, lastSyncTime, syncedIds]);

  return (
    <HealthKitContext.Provider
      value={{
        isAvailable,
        authStatus,
        isSyncing,
        lastSyncTime,
        syncError,
        requestPermissions,
        syncNow,
      }}
    >
      {children}
    </HealthKitContext.Provider>
  );
}

export function useHealthKit() {
  const context = useContext(HealthKitContext);
  if (!context) {
    throw new Error('useHealthKit must be used within a HealthKitProvider');
  }
  return context;
}
