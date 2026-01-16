import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings, ThemeMode } from '../context/SettingsContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SOURCES = ['Peloton', 'Tonal', 'Cannondale', 'Other'];
const ACTIVITIES = ['Cycling', 'Weight Lifting', 'Running', 'Walking', 'Yoga', 'Other'];

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { settings, updateSettings, isDark } = useSettings();

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
});
