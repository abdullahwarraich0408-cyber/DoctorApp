import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Calendar,
  Clock,
  Video,
  Building,
  Stethoscope,
} from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorPortalApi } from '../lib/api';
import { colors, radius, shadows } from '../theme';

type ScheduleFollowUpModalProps = {
  visible: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  appointmentId?: string;
  onScheduleSuccess: () => void;
};

function buildDateOptions() {
  const opts = [
    { label: 'Tomorrow', days: 1 },
    { label: 'In 3 Days', days: 3 },
    { label: 'Next Week', days: 7 },
    { label: 'In 2 Weeks', days: 14 },
  ];
  return opts.map(o => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + o.days);
    return {
      label: o.label,
      value: d.toISOString().slice(0, 10),
      display: d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  });
}

const SLOTS_OPTIONS = ['09:30 AM', '11:00 AM', '02:30 PM', '05:00 PM', '07:30 PM'];

export default function ScheduleFollowUpModal({
  visible,
  onClose,
  patientName,
  patientId,
  appointmentId,
  onScheduleSuccess,
}: ScheduleFollowUpModalProps) {
  const queryClient = useQueryClient();
  const dateOptions = useMemo(() => buildDateOptions(), [visible]);
  const [visitType, setVisitType] = useState<'online' | 'clinic'>('online');
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.value || '');
  const [selectedTime, setSelectedTime] = useState(SLOTS_OPTIONS[0]);
  const [reason, setReason] = useState('Routine follow-up & symptom review');

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!appointmentId) {
        throw new Error(
          'No linked appointment found. Open patient from an appointment to schedule a follow-up.',
        );
      }
      const notes = `${reason.trim()} (${visitType === 'online' ? 'Video' : 'In-clinic'} • ${selectedTime})`;
      return doctorPortalApi.updateConsultation(appointmentId, {
        follow_up_date: selectedDate,
        follow_up_notes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-patient'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-consultation'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-follow-ups'] });
      onScheduleSuccess();
      Alert.alert(
        'Follow-up Scheduled',
        `Follow-up for ${patientName} on ${
          dateOptions.find(d => d.value === selectedDate)?.display || selectedDate
        } at ${selectedTime} has been saved.`,
        [{ text: 'OK', onPress: onClose }],
      );
    },
    onError: (err: Error) => Alert.alert('Could not schedule', err.message),
  });

  const handleConfirm = () => {
    if (!reason.trim()) {
      Alert.alert('Missing Reason', 'Please enter a reason or clinical note for the visit.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Missing Date', 'Please select a follow-up date.');
      return;
    }
    saveMut.mutate();
  };

  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 36 : 16) + 14;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: bottomInset }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Stethoscope size={20} color={colors.primary} strokeWidth={2.2} />
              <View>
                <Text style={styles.modalTitle}>Schedule Follow-up</Text>
                <Text style={styles.modalSubtitle}>
                  Patient: {patientName} ({patientId})
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <Text style={styles.label}>Visit type</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, visitType === 'online' && styles.chipActive]}
                onPress={() => setVisitType('online')}>
                <Video size={14} color={visitType === 'online' ? colors.primary : colors.textMuted} />
                <Text style={[styles.chipText, visitType === 'online' && styles.chipTextActive]}>
                  Video
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, visitType === 'clinic' && styles.chipActive]}
                onPress={() => setVisitType('clinic')}>
                <Building
                  size={14}
                  color={visitType === 'clinic' ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.chipText, visitType === 'clinic' && styles.chipTextActive]}>
                  Clinic
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>
              <Calendar size={12} color={colors.textMuted} /> Date
            </Text>
            <View style={styles.wrapRow}>
              {dateOptions.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, selectedDate === opt.value && styles.chipActive]}
                  onPress={() => setSelectedDate(opt.value)}>
                  <Text
                    style={[
                      styles.chipText,
                      selectedDate === opt.value && styles.chipTextActive,
                    ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>
              <Clock size={12} color={colors.textMuted} /> Preferred time
            </Text>
            <View style={styles.wrapRow}>
              {SLOTS_OPTIONS.map(slot => (
                <Pressable
                  key={slot}
                  style={[styles.chip, selectedTime === slot && styles.chipActive]}
                  onPress={() => setSelectedTime(slot)}>
                  <Text
                    style={[
                      styles.chipText,
                      selectedTime === slot && styles.chipTextActive,
                    ]}>
                    {slot}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Clinical note / reason</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="Follow-up reason"
              placeholderTextColor={colors.textMuted}
            />
          </ScrollView>

          <Pressable
            style={styles.confirmBtn}
            onPress={handleConfirm}
            disabled={saveMut.isPending}>
            {saveMut.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>Save Follow-up</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    paddingBottom: 20,
    ...shadows.cardElevated,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.aqua,
    borderColor: '#C8EDE9',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    textAlignVertical: 'top',
    color: colors.textPrimary,
    fontSize: 13,
    backgroundColor: colors.background,
  },
  confirmBtn: {
    marginHorizontal: 18,
    marginTop: 8,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
