import React, { useEffect, useState } from 'react';
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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Video,
  Building,
  Clock,
  Pencil,
  Banknote,
  Info,
  CheckCircle2,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { colors, radius, spacing, shadows } from '../../theme';
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

export function ScheduleScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const [selectedDay, setSelectedDay] = useState('Wed');
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [clinicEnabled, setClinicEnabled] = useState(true);

  // Slots per mode
  const [onlineSlots, setOnlineSlots] = useState([
    '09:00 AM - 01:00 PM',
    '05:00 PM - 09:00 PM',
  ]);
  const [clinicSlots, setClinicSlots] = useState([
    '09:00 AM - 01:00 PM',
    '05:00 PM - 09:00 PM',
  ]);

  const query = useQuery({
    queryKey: ['doctor-schedule'],
    queryFn: () => doctorPortalApi.getSchedule(),
  });

  const locationsQuery = useQuery({
    queryKey: ['doctor-locations'],
    queryFn: () => doctorPortalApi.getPracticeLocations(),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      doctorPortalApi.updateSchedule([
        { day: 'Wednesday', slots: [...onlineSlots, ...clinicSlots] },
      ]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedule'] });
      Alert.alert('Schedule Saved', 'Your practice hours and availability have been updated.');
    },
    onError: (err: Error) => Alert.alert('Could not save', err.message),
  });

  const addSlot = (type: 'online' | 'clinic') => {
    Alert.prompt
      ? Alert.prompt('Add Slot', 'Enter slot time (e.g. 02:00 PM - 04:00 PM):', text => {
          if (text) {
            if (type === 'online') setOnlineSlots(prev => [...prev, text]);
            else setClinicSlots(prev => [...prev, text]);
          }
        })
      : type === 'online'
      ? setOnlineSlots(prev => [...prev, '02:00 PM - 04:00 PM'])
      : setClinicSlots(prev => [...prev, '02:00 PM - 04:00 PM']);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Deep Teal Header */}
      <View style={[styles.headerSection, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            hitSlop={8}>
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.headerTextCenter}>
            <Text style={styles.headerTitle}>Schedule</Text>
            <Text style={styles.headerSub}>
              Manage your availability and practice locations
            </Text>
          </View>

          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
            }}
            style={styles.doctorHeaderAvatar}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Weekly Availability Section */}
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionMainTitle}>Weekly Availability</Text>
          <Text style={styles.sectionSubtitle}>Set your regular consultation hours</Text>
        </View>

        {/* 7-Day Horizontal Week Selector */}
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map(day => {
            const isSelected = selectedDay === day.key;
            return (
              <Pressable
                key={day.key}
                style={[
                  styles.dayPill,
                  isSelected && styles.dayPillActive,
                ]}
                onPress={() => setSelectedDay(day.key)}>
                <Text
                  style={[
                    styles.dayPillText,
                    isSelected && styles.dayPillTextActive,
                  ]}>
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Online Consultation Channel Card */}
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

          {onlineEnabled && (
            <View style={styles.slotsContainer}>
              <View style={styles.slotsRow}>
                {onlineSlots.map((slot, i) => (
                  <View key={i} style={styles.slotPill}>
                    <Clock size={12} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.slotPillText}>{slot}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={styles.addSlotBtn}
                onPress={() => addSlot('online')}>
                <Text style={styles.addSlotBtnText}>+ Add Slot</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* In-Clinic Consultation Channel Card */}
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

          {clinicEnabled && (
            <View style={styles.slotsContainer}>
              <View style={styles.slotsRow}>
                {clinicSlots.map((slot, i) => (
                  <View key={i} style={styles.slotPill}>
                    <Clock size={12} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.slotPillText}>{slot}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={styles.addSlotBtn}
                onPress={() => addSlot('clinic')}>
                <Text style={styles.addSlotBtnText}>+ Add Slot</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Practice Locations Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionMainTitle}>Practice Locations</Text>
            <Text style={styles.sectionSubtitle}>Manage your clinic locations and details</Text>
          </View>

          <Pressable
            style={styles.addLocationPillBtn}
            onPress={() => Alert.alert('Add Location', 'New clinic location modal will appear.')}>
            <Text style={styles.addLocationPillText}>+ Add Location</Text>
          </Pressable>
        </View>

        {/* Location Card 1: HealthCare Clinic (Primary) */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconWrap}>
            <Building size={22} color={colors.primary} strokeWidth={2} />
          </View>

          <View style={styles.locationDetailsCol}>
            <View style={styles.locationTitleRow}>
              <Text style={styles.locationNameText}>HealthCare Clinic</Text>
              <View style={styles.primaryTagPill}>
                <Text style={styles.primaryTagText}>Primary</Text>
              </View>
            </View>

            <Text style={styles.locationAddressText}>
              123, Wellness Street, DHA Phase 5, Lahore, Punjab 54000
            </Text>

            <Text style={styles.locationFeeText}>
              Consultation Fee: <Text style={{ color: colors.primary, fontWeight: '700' }}>PKR 2,000</Text>
            </Text>
          </View>

          <Pressable
            style={styles.editLocBtn}
            onPress={() => Alert.alert('Edit Location', 'Editing HealthCare Clinic details')}>
            <Pencil size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.editLocBtnText}>Edit</Text>
          </Pressable>
        </View>

        {/* Location Card 2: City Medical Center */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconWrap}>
            <Building size={22} color={colors.primary} strokeWidth={2} />
          </View>

          <View style={styles.locationDetailsCol}>
            <Text style={styles.locationNameText}>City Medical Center</Text>

            <Text style={styles.locationAddressText}>
              456, Park Avenue, F-7 Markaz, Islamabad, 44000
            </Text>

            <Text style={styles.locationFeeText}>
              Consultation Fee: <Text style={{ color: colors.primary, fontWeight: '700' }}>PKR 2,500</Text>
            </Text>
          </View>

          <Pressable
            style={styles.editLocBtn}
            onPress={() => Alert.alert('Edit Location', 'Editing City Medical Center details')}>
            <Pencil size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.editLocBtnText}>Edit</Text>
          </Pressable>
        </View>

        {/* Consultation Fees Summary Card */}
        <View style={styles.feeSummaryCard}>
          <View style={styles.feeSummaryIconWrap}>
            <Banknote size={20} color={colors.primary} strokeWidth={2.2} />
          </View>

          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.feeSummaryTitle}>Consultation Fees Summary</Text>
            <Text style={styles.feeSummarySub}>Your current consultation fees</Text>
          </View>

          <View style={styles.feeValuesCol}>
            <View style={styles.feeValRow}>
              <Text style={styles.feeModeLabel}>Video Visit</Text>
              <Text style={styles.feeAmountText}>PKR 2,000</Text>
            </View>
            <View style={styles.feeValRow}>
              <Text style={styles.feeModeLabel}>In-Clinic Visit</Text>
              <Text style={styles.feeAmountText}>PKR 2,500</Text>
            </View>
          </View>

          <Info size={16} color={colors.textMuted} strokeWidth={2} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 90,
    gap: 12,
  },

  /* Header Section */
  headerSection: {
    backgroundColor: colors.primary,
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
});
