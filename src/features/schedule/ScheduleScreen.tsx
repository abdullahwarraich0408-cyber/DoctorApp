import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  Switch,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  Building,
  Clock,
  Pencil,
  Banknote,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { formatMoney, mapDoctorProfile } from '../../lib/mappers/doctorPortal';
import { colors, radius, shadows } from '../../theme';
import TabScreenHeader from '../../components/TabScreenHeader';
import type { RootStackParamList } from '../../navigation/types';

const WEEKDAYS = [
  { key: 'Mon', label: 'Mon', full: 'Monday' },
  { key: 'Tue', label: 'Tue', full: 'Tuesday' },
  { key: 'Wed', label: 'Wed', full: 'Wednesday' },
  { key: 'Thu', label: 'Thu', full: 'Thursday' },
  { key: 'Fri', label: 'Fri', full: 'Friday' },
  { key: 'Sat', label: 'Sat', full: 'Saturday' },
  { key: 'Sun', label: 'Sun', full: 'Sunday' },
];

const SLOT_PRESETS = [
  '09:00 AM - 01:00 PM',
  '02:00 PM - 04:00 PM',
  '05:00 PM - 08:00 PM',
];

type LocationForm = {
  id?: string;
  clinic_name: string;
  address: string;
  fee: string;
};

const emptyLocationForm: LocationForm = {
  clinic_name: '',
  address: '',
  fee: '',
};

function parseTimePart(value: string): number | null {
  const str = String(value || '').trim();
  const match12 = str.match(/^(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = str.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  return null;
}

function formatMinutes(total: number): string {
  const hrs24 = Math.floor(total / 60);
  const mins = total % 60;
  const meridiem = hrs24 >= 12 ? 'PM' : 'AM';
  const hrs12 = hrs24 % 12 || 12;
  return `${String(hrs12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${meridiem}`;
}

/** Matches backend normalizeTimeRange — e.g. "09:00 AM - 01:00 PM" */
function validateAndFormatTimeSlot(rawSlot: string): string | null {
  if (!rawSlot || typeof rawSlot !== 'string') return null;
  const parts = rawSlot
    .replace(/[–—]/g, '-')
    .split('-')
    .map(p => p.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const start = parseTimePart(parts[0]);
  const end = parseTimePart(parts[1]);
  if (start == null || end == null || end <= start) return null;
  return `${formatMinutes(start)} - ${formatMinutes(end)}`;
}

export function ScheduleScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [selectedDay, setSelectedDay] = useState('Wed');
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [clinicEnabled, setClinicEnabled] = useState(true);
  const [daySlots, setDaySlots] = useState<string[]>([]);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyLocationForm);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotStart, setSlotStart] = useState('09:00 AM');
  const [slotEnd, setSlotEnd] = useState('01:00 PM');
  const dirtyRef = useRef(false);
  const hydratedDayRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['doctor-schedule'],
    queryFn: () => doctorPortalApi.getSchedule(),
  });

  const locationsQuery = useQuery({
    queryKey: ['doctor-locations'],
    queryFn: () => doctorPortalApi.getPracticeLocations(),
  });

  const profileQuery = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: () => doctorPortalApi.getProfile(),
  });

  const profile = mapDoctorProfile(profileQuery.data?.doctor || profileQuery.data);

  const scheduleRows = useMemo(() => {
    const raw = query.data?.schedule || query.data?.slots || query.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [query.data]);

  const locations = useMemo(() => {
    const raw = locationsQuery.data?.locations || locationsQuery.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [locationsQuery.data]);

  const hydrateDay = (dayKey: string, rows: any[]) => {
    const dayMeta = WEEKDAYS.find(d => d.key === dayKey);
    const row = rows.find(
      (item: any) =>
        String(item.day || '').toLowerCase() === String(dayMeta?.full || '').toLowerCase(),
    );
    const slots = Array.isArray(row?.slots) ? row.slots.map(String) : [];
    setDaySlots(slots);
    // Keep channels on so "+ Add Slot" stays reachable even on empty days
    setOnlineEnabled(true);
    setClinicEnabled(true);
    dirtyRef.current = false;
    hydratedDayRef.current = dayKey;
  };

  useEffect(() => {
    if (!scheduleRows.length && query.isLoading) return;
    // Re-hydrate when day changes, or first load / clean refetch (not while editing)
    if (hydratedDayRef.current !== selectedDay || !dirtyRef.current) {
      hydrateDay(selectedDay, scheduleRows);
    }
  }, [selectedDay, scheduleRows, query.isLoading]);

  const saveMut = useMutation({
    mutationFn: () => {
      const mergedSlots =
        onlineEnabled || clinicEnabled
          ? Array.from(new Set(daySlots))
          : [];
      const nextSchedule = WEEKDAYS.map(day => {
        const existing = scheduleRows.find(
          (item: any) =>
            String(item.day || '').toLowerCase() === day.full.toLowerCase(),
        );
        if (day.key === selectedDay) {
          return { day: day.full, slots: mergedSlots };
        }
        return {
          day: day.full,
          slots: Array.isArray(existing?.slots) ? existing.slots : [],
        };
      });
      return doctorPortalApi.updateSchedule(nextSchedule);
    },
    onSuccess: () => {
      dirtyRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
      Alert.alert('Schedule Saved', 'Your practice hours and availability have been updated.');
    },
    onError: (err: Error) => Alert.alert('Could not save', err.message),
  });

  const locationMut = useMutation({
    mutationFn: async () => {
      const clinicName = locationForm.clinic_name.trim();
      if (!clinicName) {
        throw new Error('Clinic name is required');
      }
      const slotSource = daySlots[0] || '09:00 AM - 01:00 PM';
      const formattedSlot =
        validateAndFormatTimeSlot(slotSource) || '09:00 AM - 01:00 PM';
      const payload = {
        clinic_name: clinicName,
        address: locationForm.address.trim() || undefined,
        fee: locationForm.fee ? Number(locationForm.fee) : undefined,
        days: WEEKDAYS.map(d => d.full),
        slots: [formattedSlot],
      };
      if (locationForm.id) {
        return doctorPortalApi.updatePracticeLocation(locationForm.id, payload);
      }
      return doctorPortalApi.createPracticeLocation(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-locations'] });
      setLocationModalOpen(false);
      setLocationForm(emptyLocationForm);
      Alert.alert('Saved', 'Practice location updated.');
    },
    onError: (err: Error) => Alert.alert('Could not save location', err.message),
  });

  const deleteLocationMut = useMutation({
    mutationFn: (locationId: string) =>
      doctorPortalApi.deletePracticeLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-locations'] });
      Alert.alert('Removed', 'Practice location deleted.');
    },
    onError: (err: Error) => Alert.alert('Could not delete', err.message),
  });

  const openAddSlot = () => {
    setSlotStart('09:00 AM');
    setSlotEnd('01:00 PM');
    setSlotModalOpen(true);
  };

  const confirmAddSlot = (raw?: string) => {
    const formatted = validateAndFormatTimeSlot(
      raw || `${slotStart.trim()} - ${slotEnd.trim()}`,
    );
    if (!formatted) {
      Alert.alert(
        'Invalid time',
        'Use a valid range like 09:00 AM - 01:00 PM (end must be after start).',
      );
      return;
    }
    if (daySlots.includes(formatted)) {
      Alert.alert('Already added', 'This time slot is already on the schedule.');
      return;
    }
    dirtyRef.current = true;
    setDaySlots(prev => [...prev, formatted]);
    setSlotModalOpen(false);
  };

  const removeSlot = (index: number) => {
    dirtyRef.current = true;
    setDaySlots(prev => prev.filter((_, i) => i !== index));
  };

  const selectDay = (dayKey: string) => {
    if (dayKey === selectedDay) return;
    if (dirtyRef.current) {
      Alert.alert(
        'Unsaved changes',
        'Switching days will discard unsaved slots for this day. Save first?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              dirtyRef.current = false;
              setSelectedDay(dayKey);
            },
          },
        ],
      );
      return;
    }
    setSelectedDay(dayKey);
  };

  const openCreateLocation = () => {
    setLocationForm({
      ...emptyLocationForm,
      fee: profile?.consultationFee || '',
    });
    setLocationModalOpen(true);
  };

  const openEditLocation = (location: any) => {
    setLocationForm({
      id: String(location.id),
      clinic_name: location.clinic_name || location.hospital?.name || location.name || '',
      address: location.address || location.hospital?.address || '',
      fee: location.fee != null ? String(location.fee) : '',
    });
    setLocationModalOpen(true);
  };

  const feeSummary = useMemo(() => {
    const fees = locations
      .map((l: any) => Number(l.fee))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    const profileFee = Number(profile?.consultationFee || 0);
    const avg = fees.length
      ? fees.reduce((a: number, b: number) => a + b, 0) / fees.length
      : profileFee;
    return {
      video: formatMoney(profileFee || avg || 0),
      clinic: formatMoney(fees[0] || profileFee || avg || 0),
    };
  }, [locations, profile?.consultationFee]);

  return (
    <View style={styles.root}>
      <TabScreenHeader
        showBack
        title="Schedule"
        subtitle="Manage your availability and practice locations"
        right={
          <View style={[styles.doctorHeaderAvatar, styles.doctorHeaderAvatarFallback]}>
            <Text style={styles.doctorHeaderAvatarInitial}>
              {(profile?.name || 'D').charAt(0).toUpperCase()}
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionMainTitle}>Weekly Availability</Text>
          <Text style={styles.sectionSubtitle}>Set your regular consultation hours</Text>
        </View>

        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map(day => {
            const isSelected = selectedDay === day.key;
            return (
              <Pressable
                key={day.key}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
                onPress={() => selectDay(day.key)}>
                <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.channelCard}>
          <View style={styles.channelTopRow}>
            <View style={styles.channelIconWrap}>
              <Video size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.channelTextCol}>
              <Text style={styles.channelNameText}>Online Consultation</Text>
              <Text style={styles.channelSubText}>Available for video consultations</Text>
            </View>
            <Switch
              value={onlineEnabled}
              onValueChange={setOnlineEnabled}
              trackColor={{ false: '#CBD5E1', true: colors.primaryLight }}
              thumbColor={onlineEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.channelCard}>
          <View style={styles.channelTopRow}>
            <View style={styles.channelIconWrap}>
              <Building size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.channelTextCol}>
              <Text style={styles.channelNameText}>In-Clinic Consultation</Text>
              <Text style={styles.channelSubText}>Available for in-clinic visits</Text>
            </View>
            <Switch
              value={clinicEnabled}
              onValueChange={setClinicEnabled}
              trackColor={{ false: '#CBD5E1', true: colors.primaryLight }}
              thumbColor={clinicEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.channelCard}>
          <View style={styles.channelTopRow}>
            <View style={styles.channelIconWrap}>
              <Clock size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.channelTextCol}>
              <Text style={styles.channelNameText}>
                Hours · {WEEKDAYS.find(d => d.key === selectedDay)?.full}
              </Text>
              <Text style={styles.channelSubText}>
                Shared for online and in-clinic bookings
              </Text>
            </View>
          </View>
          <View style={styles.slotsContainer}>
            {daySlots.length === 0 ? (
              <Text style={styles.emptySlotsHint}>No time slots yet. Add one below.</Text>
            ) : (
              <View style={styles.slotsRow}>
                {daySlots.map((slot, i) => (
                  <Pressable
                    key={`${slot}-${i}`}
                    style={styles.slotPill}
                    onPress={() => removeSlot(i)}
                    accessibilityLabel={`Remove slot ${slot}`}>
                    <Clock size={12} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.slotPillText}>{slot}</Text>
                    <X size={12} color={colors.textMuted} strokeWidth={2.2} />
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable style={styles.addSlotBtn} onPress={openAddSlot}>
              <Text style={styles.addSlotBtnText}>+ Add Slot</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionMainTitle}>Practice Locations</Text>
            <Text style={styles.sectionSubtitle}>Manage your clinic locations and details</Text>
          </View>
          <Pressable style={styles.addLocationPillBtn} onPress={openCreateLocation}>
            <Text style={styles.addLocationPillText}>+ Add Location</Text>
          </Pressable>
        </View>

        {locationsQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : locations.length === 0 ? (
          <View style={styles.emptyLocations}>
            <Text style={styles.emptyLocationsText}>No practice locations yet</Text>
            <Text style={styles.emptyLocationsSub}>
              Add a clinic so patients can book in-person visits.
            </Text>
          </View>
        ) : (
          locations.map((location: any, idx: number) => {
            const name =
              location.clinic_name ||
              location.hospital?.name ||
              location.name ||
              'Clinic';
            const address =
              location.address ||
              location.hospital?.address ||
              'Address not set';
            return (
              <View key={String(location.id || idx)} style={styles.locationCard}>
                <View style={styles.locationIconWrap}>
                  <Building size={22} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.locationDetailsCol}>
                  <View style={styles.locationTitleRow}>
                    <Text style={styles.locationNameText}>{name}</Text>
                    {idx === 0 && (
                      <View style={styles.primaryTagPill}>
                        <Text style={styles.primaryTagText}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.locationAddressText}>{address}</Text>
                  <Text style={styles.locationFeeText}>
                    Consultation Fee:{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {formatMoney(location.fee)}
                    </Text>
                  </Text>
                  <Pressable
                    style={styles.deleteLocBtn}
                    onPress={() =>
                      Alert.alert('Remove location?', name, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteLocationMut.mutate(String(location.id)),
                        },
                      ])
                    }>
                    <Text style={styles.deleteLocBtnText}>Delete</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.editLocBtn} onPress={() => openEditLocation(location)}>
                  <Pencil size={14} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.editLocBtnText}>Edit</Text>
                </Pressable>
              </View>
            );
          })
        )}

        <View style={styles.feeSummaryCard}>
          <View style={styles.feeSummaryIconWrap}>
            <Banknote size={20} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.feeSummaryTitle}>Consultation Fees Summary</Text>
            <Text style={styles.feeSummarySub}>From your profile and locations</Text>
          </View>
          <View style={styles.feeValuesCol}>
            <View style={styles.feeValRow}>
              <Text style={styles.feeModeLabel}>Video Visit</Text>
              <Text style={styles.feeAmountText}>{feeSummary.video}</Text>
            </View>
            <View style={styles.feeValRow}>
              <Text style={styles.feeModeLabel}>In-Clinic Visit</Text>
              <Text style={styles.feeAmountText}>{feeSummary.clinic}</Text>
            </View>
          </View>
          <Info size={16} color={colors.textMuted} strokeWidth={2} />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <Pressable
          style={styles.saveScheduleBtn}
          onPress={() => saveMut.mutate()}
          disabled={saveMut.isPending}>
          <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.saveScheduleBtnText}>
            {saveMut.isPending ? 'Saving...' : 'Save Schedule'}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={locationModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationModalOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setLocationModalOpen(false)}
          />
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>
                {locationForm.id ? 'Edit Location' : 'Add Location'}
              </Text>
              <Text style={styles.modalLabel}>Clinic name</Text>
              <TextInput
                style={styles.modalInput}
                value={locationForm.clinic_name}
                onChangeText={clinic_name => setLocationForm(prev => ({ ...prev, clinic_name }))}
                placeholder="e.g. City Medical Center"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
              />
              <Text style={styles.modalLabel}>Address</Text>
              <TextInput
                style={styles.modalInput}
                value={locationForm.address}
                onChangeText={address => setLocationForm(prev => ({ ...prev, address }))}
                placeholder="Clinic address"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
              />
              <Text style={styles.modalLabel}>Consultation fee (PKR)</Text>
              <TextInput
                style={styles.modalInput}
                value={locationForm.fee}
                onChangeText={fee => setLocationForm(prev => ({ ...prev, fee }))}
                keyboardType="numeric"
                placeholder="2500"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setLocationModalOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.modalSaveBtn}
                  onPress={() => locationMut.mutate()}
                  disabled={locationMut.isPending}>
                  {locationMut.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={slotModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSlotModalOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setSlotModalOpen(false)}
          />
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>Add time slot</Text>
              <Text style={styles.modalHint}>
                Format: 09:00 AM - 01:00 PM. Or pick a quick preset.
              </Text>

              <View style={styles.presetRow}>
                {SLOT_PRESETS.map(preset => (
                  <Pressable
                    key={preset}
                    style={styles.presetChip}
                    onPress={() => confirmAddSlot(preset)}>
                    <Text style={styles.presetChipText}>{preset}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.modalLabel}>Start</Text>
              <TextInput
                style={styles.modalInput}
                value={slotStart}
                onChangeText={setSlotStart}
                placeholder="09:00 AM"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                returnKeyType="next"
              />
              <Text style={styles.modalLabel}>End</Text>
              <TextInput
                style={styles.modalInput}
                value={slotEnd}
                onChangeText={setSlotEnd}
                placeholder="01:00 PM"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={() => confirmAddSlot()}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setSlotModalOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveBtn} onPress={() => confirmAddSlot()}>
                  <Text style={styles.modalSaveText}>Add Slot</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 90,
    gap: 12,
  },

  /* Header Section */
  headerSection: {
        paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  doctorHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  /* Section Title Block */
  sectionTitleBlock: {
    gap: 2,
    marginTop: 2,
  },
  sectionMainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },

  /* Weekdays Selector */
  weekdaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayPillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  /* Channel Availability Cards */
  channelCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
  },
  channelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTextCol: {
    flex: 1,
    gap: 1,
  },
  channelNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  channelSubText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  slotsContainer: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  slotPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addSlotBtn: {
    alignSelf: 'flex-start',
  },
  addSlotBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  emptySlotsHint: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  modalHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#B4E8E1',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Practice Locations */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  addLocationPillBtn: {
    backgroundColor: colors.aqua,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#C8EDE9',
  },
  addLocationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadows.cardSoft,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDetailsCol: {
    flex: 1,
    gap: 2,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  primaryTagPill: {
    backgroundColor: colors.mint,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  primaryTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  locationAddressText: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 14,
  },
  locationFeeText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  editLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  editLocBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },

  /* Fees Summary Card */
  feeSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadows.card,
  },
  feeSummaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeSummaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  feeSummarySub: {
    fontSize: 9,
    color: colors.textMuted,
  },
  feeValuesCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  feeValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeModeLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  feeAmountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Bottom Actions Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    ...shadows.cardElevated,
  },
  saveScheduleBtn: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  saveScheduleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  doctorHeaderAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorHeaderAvatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyLocations: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  emptyLocationsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyLocationsSub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  deleteLocBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  deleteLocBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    maxHeight: '90%',
  },
  modalScrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontWeight: '700',
    color: colors.textSecondary,
    fontSize: 13,
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 13,
  },
});
