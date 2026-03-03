import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const LAST_SYNC_KEY = 'strava_last_sync';

type AuthStatus = 'unknown' | 'authorized' | 'notDetermined';

interface StravaSyncResult {
  synced: number;
  skipped: number;
}

interface StravaContextType {
  authStatus: AuthStatus;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  connect: () => void;
  syncNow: () => Promise<StravaSyncResult>;
  resetSync: () => Promise<void>;
}

const StravaContext = createContext<StravaContextType | undefined>(undefined);

export function StravaProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unknown');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Check server-side Strava connection status
  const checkStatus = useCallback(async () => {
    try {
      const status = await api.getStravaStatus();
      setAuthStatus(status.connected ? 'authorized' : 'notDetermined');
    } catch {
      setAuthStatus('notDetermined');
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    async function init() {
      await checkStatus();

      const storedTime = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (storedTime) {
        setLastSyncTime(new Date(storedTime));
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

  // Open the web app to connect Strava (OAuth happens on server)
  const connect = useCallback(() => {
    Linking.openURL('https://robs-fitness-tracker.vercel.app/api/strava/auth');
  }, []);

  // Trigger server-side sync
  const syncNow = useCallback(async (): Promise<StravaSyncResult> => {
    if (authStatus !== 'authorized' || isSyncing) {
      return { synced: 0, skipped: 0 };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await api.syncStrava();
      console.log(`[Strava] Synced: ${result.synced} new, ${result.skipped} skipped, ${result.filtered} filtered`);

      const now = new Date();
      setLastSyncTime(now);
      await AsyncStorage.setItem(LAST_SYNC_KEY, now.toISOString());

      return { synced: result.synced, skipped: result.skipped };
    } catch (error) {
      console.error('[Strava] Sync failed:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
      // Re-check status in case token expired
      await checkStatus();
      return { synced: 0, skipped: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [authStatus, isSyncing, checkStatus]);

  const resetSync = useCallback(async () => {
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    setLastSyncTime(null);
    setSyncError(null);
  }, []);

  return (
    <StravaContext.Provider
      value={{
        authStatus,
        isSyncing,
        lastSyncTime,
        syncError,
        connect,
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
