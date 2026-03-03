import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Goal } from '../../shared/types';

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingGoal?: Goal | null;
}

export function GoalModal({ visible, onClose, onSuccess, editingGoal }: GoalModalProps) {
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [annualWeightTarget, setAnnualWeightTarget] = useState('');
  const [minutesPerSession, setMinutesPerSession] = useState('45');
  const [weeklySessionsTarget, setWeeklySessionsTarget] = useState('5');
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setYear(editingGoal.year.toString());
      setAnnualWeightTarget(editingGoal.annualWeightTarget.toString());
      setMinutesPerSession(editingGoal.minutesPerSession.toString());
      setWeeklySessionsTarget(editingGoal.weeklySessionsTarget.toString());
    } else {
      // Reset form for new goal
      setName(`${new Date().getFullYear() + 1} Fitness Challenge`);
      setYear((new Date().getFullYear() + 1).toString());
      setAnnualWeightTarget('1000000');
      setMinutesPerSession('45');
      setWeeklySessionsTarget('5');
    }
  }, [editingGoal, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }
    if (!year || parseInt(year) < 2020) {
      Alert.alert('Error', 'Please enter a valid year');
      return;
    }
    if (!annualWeightTarget || parseFloat(annualWeightTarget) <= 0) {
      Alert.alert('Error', 'Please enter a valid weight target');
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        name: name.trim(),
        year: parseInt(year),
        annualWeightTarget: parseFloat(annualWeightTarget),
        minutesPerSession: parseInt(minutesPerSession),
        weeklySessionsTarget: parseInt(weeklySessionsTarget),
      };

      if (editingGoal) {
        await api.updateGoal(editingGoal.id, goalData);
      } else {
        await api.createGoal(goalData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save goal:', error);
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate derived values for preview
  const weeklyMinutes = parseInt(minutesPerSession || '0') * parseInt(weeklySessionsTarget || '0');
  const annualMinutes = weeklyMinutes * 52;
  const quarterlyWeight = parseFloat(annualWeightTarget || '0') / 4;
  const quarterlySessions = parseInt(weeklySessionsTarget || '0') * 13;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editingGoal ? 'Edit Goal' : 'Add Goal'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Goal Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Goal Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="2027 Fitness Challenge"
              />
            </View>

            {/* Year */}
            <View style={styles.field}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                value={year}
                onChangeText={setYear}
                placeholder="2027"
                keyboardType="numeric"
              />
            </View>

            {/* Annual Weight Target */}
            <View style={styles.field}>
              <Text style={styles.label}>Annual Weight Target (lbs)</Text>
              <TextInput
                style={styles.input}
                value={annualWeightTarget}
                onChangeText={setAnnualWeightTarget}
                placeholder="1000000"
                keyboardType="numeric"
              />
              <Text style={styles.hint}>
                Total weight to lift in the year (e.g., 1000000 = 1M lbs)
              </Text>
            </View>

            {/* Minutes Per Session */}
            <View style={styles.field}>
              <Text style={styles.label}>Minutes Per Session</Text>
              <TextInput
                style={styles.input}
                value={minutesPerSession}
                onChangeText={setMinutesPerSession}
                placeholder="45"
                keyboardType="numeric"
              />
            </View>

            {/* Weekly Sessions Target */}
            <View style={styles.field}>
              <Text style={styles.label}>Weekly Sessions Target</Text>
              <TextInput
                style={styles.input}
                value={weeklySessionsTarget}
                onChangeText={setWeeklySessionsTarget}
                placeholder="5"
                keyboardType="numeric"
              />
            </View>

            {/* Calculated Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Calculated Targets</Text>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Weekly Minutes</Text>
                <Text style={styles.previewValue}>{weeklyMinutes.toLocaleString()}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Annual Minutes</Text>
                <Text style={styles.previewValue}>{annualMinutes.toLocaleString()}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Quarterly Weight</Text>
                <Text style={styles.previewValue}>{(quarterlyWeight / 1000).toFixed(0)}k lbs</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Quarterly Sessions</Text>
                <Text style={styles.previewValue}>{quarterlySessions}</Text>
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    fontSize: 17,
    color: '#a1a1aa',
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '700',
    color: '#818cf8',
  },
  saveButtonDisabled: {
    color: '#71717a',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#242438',
    borderWidth: 1,
    borderColor: '#3f3f5a',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 8,
  },
  previewSection: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#34d399',
    marginBottom: 14,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#6ee7b7',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34d399',
  },
  bottomPadding: {
    height: 40,
  },
});
