import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { WorkoutSession } from '../../shared/types';
import {
  StravaTokens,
  refreshTokenIfNeeded,
  fetchActivities,
  fetchActivityDetail,
} from '../../shared/strava';
import { mapStravaToSource, metersToMiles } from '../../shared/stravaMapping';

const STRAVA_TOKENS_KEY = 'strava_tokens';
const LAST_SYNC_KEY = 'strava_last_sync';
const SYNCED_IDS_KEY = 'strava_synced_ids';

// These should match your Strava app settings
const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '';
const STRAVA_CLIENT_SECRET = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET ?? '';
const STRAVA_REDIRECT_URI = process.env.EXPO_PUBLIC_STRAVA_REDIRECT_URI ?? 'fitnesstracker://strava/callback';

type AuthStatus = 'unknown' | 'authorized' | 'notDetermined';

interface StravaContextType {
  authStatus: AuthStatus;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncNow: () => Promise<{ synced: number; skipped: number }>;
  resetSync: () => Promise<void>;
}

const StravaContext = createContext<StravaContextType | undefined>(undefined);

export function StravaProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unknown');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [tokens, setTokens] = useState<StravaTokens | null>(null);

  // Initialize on mount
  useEffect(() => {
    async function init() {
      // Load stored tokens
      const storedTokens = await SecureStore.getItemAsync(STRAVA_TOKENS_KEY);
      if (storedTokens) {
        const parsed = JSON.parse(storedTokens) as StravaTokens;
        setTokens(parsed);
        setAuthStatus('authorized');
      } else {
        setAuthStatus('notDetermined');
      }

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

  // Auto-sync on app foreground
  useEffect(() => {
    if (authStatus !== 'authorized') return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncNow();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [authStatus]);

  const connect = useCallback(async () => {
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&scope=activity:read_all&approval_prompt=auto`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, STRAVA_REDIRECT_URI);

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (!code) return;

      // Exchange code for tokens
      const res = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      });

      if (!res.ok) {
        setSyncError('Failed to connect to Strava');
        return;
      }

      const data = await res.json();
      const newTokens: StravaTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      };

      await SecureStore.setItemAsync(STRAVA_TOKENS_KEY, JSON.stringify(newTokens));
      setTokens(newTokens);
      setAuthStatus('authorized');

      // Trigger initial sync
      syncNow();
    }
  }, []);

  const disconnect = useCallback(async () => {
    await SecureStore.deleteItemAsync(STRAVA_TOKENS_KEY);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    await AsyncStorage.removeItem(SYNCED_IDS_KEY);
    setTokens(null);
    setAuthStatus('notDetermined');
    setLastSyncTime(null);
    setSyncedIds(new Set());
    setSyncError(null);
  }, []);

  const syncNow = useCallback(async (): Promise<{ synced: number; skipped: number }> => {
    if (!tokens || authStatus !== 'authorized' || isSyncing) {
      return { synced: 0, skipped: 0 };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Refresh token if needed
      const refreshed = await refreshTokenIfNeeded(tokens, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET);
      if (refreshed.access_token !== tokens.access_token) {
        await SecureStore.setItemAsync(STRAVA_TOKENS_KEY, JSON.stringify(refreshed));
        setTokens(refreshed);
      }

      // Fetch activities since start of year
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const afterEpoch = Math.floor(startOfYear.getTime() / 1000);

      let allActivities: Awaited<ReturnType<typeof fetchActivities>> = [];
      let page = 1;
      while (true) {
        const batch = await fetchActivities(refreshed.access_token, afterEpoch, page);
        if (batch.length === 0) break;
        allActivities = allActivities.concat(batch);
        if (batch.length < 100) break;
        page++;
      }

      console.log('[Strava] Found', allActivities.length, 'activities');

      // Get existing workouts for dedup
      const existingWorkouts = await api.getWorkouts();
      const existingStravaIds = new Set(
        existingWorkouts
          .filter((w) => w.notes?.startsWith('Synced from Strava'))
          .map((w) => w.stravaActivityId?.toString())
          .filter(Boolean),
      );

      let synced = 0;
      const newSyncedIds = new Set(syncedIds);

      for (const activity of allActivities) {
        const stravaId = String(activity.id);

        // Skip if already synced
        if (existingStravaIds.has(stravaId) || newSyncedIds.has(stravaId)) {
          continue;
        }

        // Map to source
        const mapped = mapStravaToSource(activity);
        if (!mapped) continue;

        const durationMinutes = Math.round(activity.moving_time / 60);
        if (durationMinutes < 1) continue;

        const miles = activity.distance > 0 ? metersToMiles(activity.distance) : undefined;

        try {
          await api.createWorkout({
            date: activity.start_date,
            source: mapped.source,
            activity: mapped.activityType,
            minutes: durationMinutes,
            miles,
            notes: `Synced from Strava: ${activity.name}`,
          });
          newSyncedIds.add(stravaId);
          synced++;
        } catch (error) {
          console.error('[Strava] Failed to create workout:', error);
        }
      }

      // Update state
      const now = new Date();
      setLastSyncTime(now);
      setSyncedIds(newSyncedIds);

      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      await AsyncStorage.setItem(SYNCED_IDS_KEY, JSON.stringify([...newSyncedIds]));

      return { synced, skipped: allActivities.length - synced };
    } catch (error) {
      console.error('[Strava] Sync failed:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
      return { synced: 0, skipped: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [tokens, authStatus, isSyncing, syncedIds]);

  const resetSync = useCallback(async () => {
    console.log('[Strava] Resetting sync state...');
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    await AsyncStorage.removeItem(SYNCED_IDS_KEY);
    setLastSyncTime(null);
    setSyncedIds(new Set());
    console.log('[Strava] Sync state reset');
  }, []);

  return (
    <StravaContext.Provider
      value={{
        authStatus,
        isSyncing,
        lastSyncTime,
        syncError,
        connect,
        disconnect,
        syncNow,
        resetSync,
      }}
    >
      {children}
    </StravaContext.Provider>
  );
}

export function useStrava() {
  const context = useContext(StravaContext);
  if (!context) {
    throw new Error('useStrava must be used within a StravaProvider');
  }
  return context;
}
