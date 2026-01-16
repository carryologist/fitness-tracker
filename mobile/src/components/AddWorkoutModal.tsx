import React, { useState } from 'react';
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

interface AddWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SOURCES = ['Peloton', 'Tonal', 'Cannondale', 'Other'];
const ACTIVITIES = ['Cycling', 'Weight Lifting', 'Running', 'Walking', 'Yoga', 'Other'];

export function AddWorkoutModal({ visible, onClose, onSuccess }: AddWorkoutModalProps) {
  const [source, setSource] = useState('Peloton');
  const [activity, setActivity] = useState('Cycling');
  const [minutes, setMinutes] = useState('');
  const [miles, setMiles] = useState('');
  const [weightLifted, setWeightLifted] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!minutes || parseInt(minutes) <= 0) {
      Alert.alert('Error', 'Please enter valid minutes');
      return;
    }

    setSaving(true);
    try {
      await api.createWorkout({
        date,
        source,
        activity,
        minutes: parseInt(minutes),
        miles: miles ? parseFloat(miles) : undefined,
        weightLifted: weightLifted ? parseFloat(weightLifted) : undefined,
        notes: notes || undefined,
      });
      
      // Reset form
      setMinutes('');
      setMiles('');
      setWeightLifted('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
            <Text style={styles.headerTitle}>Add Workout</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            {/* Source */}
            <View style={styles.field}>
              <Text style={styles.label}>Source</Text>
              <View style={styles.optionsRow}>
                {SOURCES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.option, source === s && styles.optionSelected]}
                    onPress={() => setSource(s)}
                  >
                    <Text style={[styles.optionText, source === s && styles.optionTextSelected]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Activity */}
            <View style={styles.field}>
              <Text style={styles.label}>Activity</Text>
              <View style={styles.optionsRow}>
                {ACTIVITIES.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.option, activity === a && styles.optionSelected]}
                    onPress={() => setActivity(a)}
                  >
                    <Text style={[styles.optionText, activity === a && styles.optionTextSelected]}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Minutes */}
            <View style={styles.field}>
              <Text style={styles.label}>Minutes *</Text>
              <TextInput
                style={styles.input}
                value={minutes}
                onChangeText={setMinutes}
                placeholder="45"
                keyboardType="numeric"
              />
            </View>

            {/* Miles */}
            <View style={styles.field}>
              <Text style={styles.label}>Miles (optional)</Text>
              <TextInput
                style={styles.input}
                value={miles}
                onChangeText={setMiles}
                placeholder="10.5"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Weight Lifted */}
            <View style={styles.field}>
              <Text style={styles.label}>Weight Lifted (optional)</Text>
              <TextInput
                style={styles.input}
                value={weightLifted}
                onChangeText={setWeightLifted}
                placeholder="5000"
                keyboardType="numeric"
              />
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="How did it go?"
                multiline
                numberOfLines={3}
              />
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cancelButton: {
    fontSize: 17,
    color: '#6b7280',
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3b82f6',
  },
  saveButtonDisabled: {
    color: '#9ca3af',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  optionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#3b82f6',
  },
  bottomPadding: {
    height: 40,
  },
});
