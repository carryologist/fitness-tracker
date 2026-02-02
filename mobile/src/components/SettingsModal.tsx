import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings, ThemeMode } from '../context/SettingsContext';
import { useHealthKit } from '../context/HealthKitContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SOURCES = ['Peloton', 'Tonal', 'Cannondale', 'Other'];
const ACTIVITIES = ['Cycling', 'Weight Lifting', 'Running', 'Walking', 'Yoga', 'Other'];

function formatLastSync(date: Date | null): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  
  return date.toLocaleDateString();
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { settings, updateSettings, isDark } = useSettings();
  const healthKit = useHealthKit();

  const styles = createStyles(isDark);

  const ThemeOption = ({ mode, label }: { mode: ThemeMode; label: string }) => (
    <TouchableOpacity
      style={[styles.option, settings.themeMode === mode && styles.optionSelected]}
      onPress={() => updateSettings({ themeMode: mode })}
    >
      <Text style={[styles.optionText, settings.themeMode === mode && styles.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: 60 }} />
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Appearance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APPEARANCE</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Theme</Text>
              <View style={styles.optionsRow}>
                <ThemeOption mode="light" label="☀️ Light" />
                <ThemeOption mode="dark" label="🌙 Dark" />
                <ThemeOption mode="system" label="📱 System" />
              </View>
            </View>
          </View>

          {/* Defaults Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WORKOUT DEFAULTS</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Default Source</Text>
              <View style={styles.optionsRow}>
                {SOURCES.map((source) => (
                  <TouchableOpacity
                    key={source}
                    style={[styles.option, settings.defaultSource === source && styles.optionSelected]}
                    onPress={() => updateSettings({ defaultSource: source })}
                  >
                    <Text style={[styles.optionText, settings.defaultSource === source && styles.optionTextSelected]}>
                      {source}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.label}>Default Activity</Text>
              <View style={styles.optionsRow}>
                {ACTIVITIES.map((activity) => (
                  <TouchableOpacity
                    key={activity}
                    style={[styles.option, settings.defaultActivity === activity && styles.optionSelected]}
                    onPress={() => updateSettings({ defaultActivity: activity })}
                  >
                    <Text style={[styles.optionText, settings.defaultActivity === activity && styles.optionTextSelected]}>
                      {activity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Units Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>UNITS</Text>
            <View style={styles.card}>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[styles.option, styles.optionWide, settings.units === 'imperial' && styles.optionSelected]}
                  onPress={() => updateSettings({ units: 'imperial' })}
                >
                  <Text style={[styles.optionText, settings.units === 'imperial' && styles.optionTextSelected]}>
                    🇺🇸 Imperial (mi, lbs)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.option, styles.optionWide, settings.units === 'metric' && styles.optionSelected]}
                  onPress={() => updateSettings({ units: 'metric' })}
                >
                  <Text style={[styles.optionText, settings.units === 'metric' && styles.optionTextSelected]}>
                    🌍 Metric (km, kg)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Outdoor Bonus Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OUTDOOR BONUS</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Cannondale Multiplier</Text>
              <Text style={styles.helperText}>
                Outdoor rides get bonus credit for minutes and miles
              </Text>
              <View style={styles.optionsRow}>
                {[1, 1.25, 1.5, 1.75, 2].map((multiplier) => (
                  <TouchableOpacity
                    key={multiplier}
                    style={[styles.option, settings.outdoorMultiplier === multiplier && styles.optionSelected]}
                    onPress={() => updateSettings({ outdoorMultiplier: multiplier })}
                  >
                    <Text style={[styles.optionText, settings.outdoorMultiplier === multiplier && styles.optionTextSelected]}>
                      {multiplier}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Apple Health Section - iOS only */}
          {Platform.OS === 'ios' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>APPLE HEALTH</Text>
              <View style={styles.card}>
                {healthKit.authStatus === 'authorized' ? (
                  <>
                    <View style={styles.aboutRow}>
                      <Text style={styles.aboutLabel}>Status</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>✓ Connected</Text>
                      </View>
                    </View>
                    <View style={[styles.aboutRow, { marginTop: 16 }]}>
                      <Text style={styles.aboutLabel}>Last synced</Text>
                      <Text style={styles.aboutValue}>{formatLastSync(healthKit.lastSyncTime)}</Text>
                    </View>
                    {healthKit.syncError && (
                      <Text style={styles.errorText}>{healthKit.syncError}</Text>
                    )}
                    <TouchableOpacity
                      style={[styles.syncButton, healthKit.isSyncing && styles.syncButtonDisabled]}
                      onPress={() => healthKit.syncNow()}
                      disabled={healthKit.isSyncing}
                    >
                      {healthKit.isSyncing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.syncButtonText}>Sync Now</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.resetButton]}
                      onPress={async () => {
                        Alert.alert(
                          'Reset Sync State',
                          'This will clear the sync history and re-sync all workouts from this year. Continue?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Reset',
                              style: 'destructive',
                              onPress: async () => {
                                await healthKit.resetSync();
                                Alert.alert('Success', 'Sync state reset. Tap "Sync Now" to re-sync all workouts.');
                              },
                            },
                          ]
                        );
                      }}
                      disabled={healthKit.isSyncing}
                    >
                      <Text style={styles.resetButtonText}>Reset Sync</Text>
                    </TouchableOpacity>
                    <Text style={styles.healthNote}>
                      Workouts from Peloton, Tonal, and Cannondale are automatically synced when you open the app.
                    </Text>
                  </>
                ) : healthKit.authStatus === 'unavailable' ? (
                  <Text style={styles.aboutLabel}>Apple Health is not available on this device.</Text>
                ) : (
                  <>
                    <Text style={styles.aboutLabel}>
                      Connect to Apple Health to automatically sync workouts from Peloton, Tonal, and Cannondale.
                    </Text>
                    <TouchableOpacity
                      style={styles.connectButton}
                      onPress={() => healthKit.requestPermissions()}
                    >
                      <Text style={styles.connectButtonText}>Connect Apple Health</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <View style={styles.card}>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Version</Text>
                <Text style={styles.aboutValue}>1.0.0</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0f0f1a' : '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#2d2d44' : '#e2e8f0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: isDark ? '#fff' : '#0f172a',
  },
  doneButton: {
    paddingHorizontal: 4,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6366f1',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#71717a' : '#64748b',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: isDark ? '#242438' : '#fff',
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#fff' : '#0f172a',
    marginBottom: 14,
  },
  helperText: {
    fontSize: 13,
    color: isDark ? '#71717a' : '#64748b',
    marginBottom: 14,
    marginTop: -8,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: isDark ? '#1a1a2e' : '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionWide: {
    flex: 1,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
    borderColor: '#6366f1',
  },
  optionText: {
    fontSize: 14,
    color: isDark ? '#a1a1aa' : '#64748b',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: isDark ? '#818cf8' : '#6366f1',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 15,
    color: isDark ? '#a1a1aa' : '#64748b',
  },
  aboutValue: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#fff' : '#0f172a',
  },
  statusBadge: {
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
  },
  syncButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  resetButton: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  connectButton: {
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  healthNote: {
    fontSize: 12,
    color: isDark ? '#71717a' : '#94a3b8',
    marginTop: 12,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 8,
  },
});
