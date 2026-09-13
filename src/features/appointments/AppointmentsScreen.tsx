import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Video,
  Building,
  CheckCircle2,
  CalendarCheck,
  ChevronRight,
  XCircle,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapAppointment } from '../../lib/mappers/doctorPortal';
import { StatusChip } from '../../components/StatusChip';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import GreenGradientHeader from '../../components/GreenGradientHeader';
import type { RootStackParamList } from '../../navigation/types';

function getWeekDays() {
  const days = [];
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      dateStr: d.toISOString().slice(0, 10),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
      hasAppointments: true,
    });
  }
  return days;
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const OPEN_STATUSES = new Set([
  'pending',
  'booked',
  'confirmed',
  'checked_in',
  'in_progress',
]);

function toLocalDateKey(value?: string | Date | null) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value).slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AppointmentsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const [activeStatusTab, setActiveStatusTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const weekDays = useMemo(() => getWeekDays(), []);
  const [selectedDate, setSelectedDate] = useState(
    weekDays.find(d => d.isToday)?.dateStr || weekDays[0].dateStr,
  );

  const query = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => doctorPortalApi.getAppointments(),
    refetchInterval: 15_000,
  });

  const allAppointments = useMemo(() => {
    const raw = (
      Array.isArray(query.data)
        ? query.data
        : query.data?.appointments || []
    ).map(mapAppointment);

    return raw.map((a: any) => ({
      id: a.id,
      time: a.time || '',
      patient: a.patient || 'Patient',
      age: a.raw?.customer?.profile_data?.age || a.raw?.customer?.age || null,
      gender:
        a.raw?.customer?.profile_data?.gender || a.raw?.customer?.gender || null,
      reason: a.reason || 'Consultation',
      type: a.type?.toLowerCase().includes('clinic') ? 'In-Clinic' : a.type || 'Consult',
      isFeePaid: Boolean(a.paymentStatus === 'paid' || a.raw?.payment_status === 'paid'),
      status: a.status || 'pending',
      dateRaw: a.dateRaw,
      dateKey: toLocalDateKey(a.dateRaw),
    }));
  }, [query.data]);

  const weekDaysWithMarks = useMemo(() => {
    const marked = new Set(
      allAppointments.map((a: { dateKey: string }) => a.dateKey).filter(Boolean),
    );
    return weekDays.map(day => ({
      ...day,
      hasAppointments: marked.has(day.dateStr),
    }));
  }, [weekDays, allAppointments]);

  const filteredAppointments = useMemo(() => {
    let list = allAppointments;
    const todayKey = toLocalDateKey(new Date());

    if (activeStatusTab === 'pending') {
      list = list.filter(
        (a: any) => a.status === 'pending' || a.status === 'booked',
      );
    } else if (activeStatusTab === 'today') {
      list = list.filter(
        (a: any) =>
          a.dateKey === todayKey &&
          (OPEN_STATUSES.has(a.status) || a.status === 'completed'),
      );
    } else if (activeStatusTab === 'upcoming') {
      list = list.filter(
        (a: any) => OPEN_STATUSES.has(a.status) && a.dateKey >= todayKey,
      );
    } else if (activeStatusTab === 'completed') {
      list = list.filter((a: any) => a.status === 'completed');
    } else if (activeStatusTab === 'cancelled') {
      list = list.filter(
        (a: any) => a.status === 'cancelled' || a.status === 'no_show',
      );
    }

    // Week strip only narrows the All tab
    if (selectedDate && activeStatusTab === 'all') {
      list = list.filter((a: any) => a.dateKey === selectedDate);
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a: any) =>
          a.patient.toLowerCase().includes(term) ||
          a.reason.toLowerCase().includes(term),
      );
    }

    return list;
  }, [allAppointments, activeStatusTab, searchQuery, selectedDate]);

  return (
    <View style={styles.root}>

      {/* Top Deep Teal Header */}
      <GreenGradientHeader style={[styles.headerSection, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Appointments</Text>

          <View style={styles.headerRightActions}>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => setShowSearch(!showSearch)}
              accessibilityLabel="Search appointments"
              hitSlop={8}>
              <Search size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>

            <Pressable
              style={styles.headerIconBtn}
              accessibilityLabel="Filter appointments"
              hitSlop={8}>
              <Filter size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Optional Search Bar Input */}
        {showSearch && (
          <View style={styles.searchBarWrap}>
            <Search size={16} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name or reason..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                <XCircle size={16} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        )}

        {/* Segmented Status Tabs */}
        <View style={styles.statusTabsScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusTabsContent}>
            {STATUS_TABS.map(tab => {
              const isActive = activeStatusTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.statusTabPill,
                    isActive && styles.statusTabPillActive,
                  ]}
                  onPress={() => setActiveStatusTab(tab.key)}>
                  <Text
                    style={[
                      styles.statusTabText,
                      isActive && styles.statusTabTextActive,
                    ]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </GreenGradientHeader>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }>
        {/* Horizontal 7-Day Week Selector Strip */}
        <View style={styles.weekCalendarCard}>
          {weekDaysWithMarks.map(item => {
            const isSelected = selectedDate === item.dateStr;
            return (
              <Pressable
                key={item.dateStr}
                style={[
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected,
                ]}
                onPress={() => setSelectedDate(item.dateStr)}>
                <Text
                  style={[
                    styles.dayNameText,
                    isSelected && styles.dayNameTextSelected,
                  ]}>
                  {item.dayName}
                </Text>
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                  ]}>
                  <Text
                    style={[
                      styles.dayNumText,
                      isSelected && styles.dayNumTextSelected,
                    ]}>
                    {item.dayNum}
                  </Text>
                </View>
                {item.hasAppointments && (
                  <View
                    style={[
                      styles.calendarDot,
                      isSelected && styles.calendarDotSelected,
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Daily Summary Banner Strip */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryBannerLeft}>
            <Calendar size={18} color={colors.primary} strokeWidth={2} />
            <Text style={styles.summaryBannerText}>
              You have <Text style={styles.summaryHighlight}>{filteredAppointments.length} appointments</Text> today
            </Text>
          </View>
        </View>

        {/* Structured Appointment Cards List */}
        <View style={styles.appointmentsList}>
          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Calendar size={44} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No appointments found</Text>
              <Text style={styles.emptySub}>
                There are no scheduled visits for the selected filter.
              </Text>
            </View>
          ) : (
            filteredAppointments.map((appt: any) => {
              const isVideo = appt.type.toLowerCase().includes('video');

              return (
                <Pressable
                  key={appt.id}
                  style={styles.appointmentCard}
                  onPress={() =>
                    navigation.navigate('AppointmentDetail', {
                      appointmentId: appt.id,
                    })
                  }>
                  {/* Card Header: Time, Mode Badge, Status Pill */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTimeRow}>
                      <Clock size={13} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.cardTimeText}>{appt.time}</Text>
                    </View>

                    <View style={styles.cardModeBadge}>
                      {isVideo ? (
                        <Video size={12} color={colors.primary} strokeWidth={2} />
                      ) : (
                        <Building size={12} color={colors.primary} strokeWidth={2} />
                      )}
                      <Text style={styles.cardModeText}>{appt.type}</Text>
                    </View>

                    {appt.isFollowUp ? (
                      <View style={styles.followUpBadge}>
                        <Text style={styles.followUpBadgeText}>FOLLOW-UP</Text>
                      </View>
                    ) : null}

                    <StatusChip status={appt.status} />
                  </View>

                  {/* Patient Info Row */}
                  <View style={styles.cardPatientRow}>
                    <View style={[styles.patientAvatar, styles.patientAvatarFallback]}>
                      <Text style={styles.patientAvatarInitial}>
                        {(appt.patient || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.patientInfoCol}>
                      <Text style={styles.patientNameText}>{appt.patient}</Text>
                      <Text style={styles.patientDemographicsText}>
                        {[
                          appt.age ? `${appt.age} Y` : null,
                          appt.gender || null,
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'Patient'}
                      </Text>
                      <Text style={styles.reasonText} numberOfLines={1}>
                        {appt.reason}
                      </Text>
                    </View>
                  </View>

                  {/* Card Footer: Payment Pill & Action Buttons */}
                  <View style={styles.cardFooterRow}>
                    <View style={styles.feePaidBadge}>
                      <CheckCircle2 size={12} color={colors.success} strokeWidth={2.2} />
                      <Text style={styles.feePaidText}>Fee Paid</Text>
                    </View>

                    <View style={styles.cardActionsGroup}>
                      <Pressable
                        style={styles.detailsBtn}
                        onPress={() =>
                          navigation.navigate('AppointmentDetail', {
                            appointmentId: appt.id,
                          })
                        }>
                        <Text style={styles.detailsBtnText}>View Details</Text>
                        <ChevronRight size={14} color={colors.primary} strokeWidth={2} />
                      </Pressable>

                      {isVideo && (
                        <Pressable
                          style={styles.startConsultMiniBtn}
                          onPress={() =>
                            navigation.navigate('Video', {
                              appointmentId: appt.id,
                            })
                          }>
                          <CalendarCheck size={14} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.startConsultMiniText}>
                            Start Consult
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
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
    paddingBottom: TAB_BAR_CLEARANCE + 30,
    gap: 14,
  },

  /* Header Section */
  headerSection: {
        paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  statusTabsScrollWrap: {
    marginHorizontal: -4,
  },
  statusTabsContent: {
    flexDirection: 'row',
    gap: 6,
  },
  statusTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusTabPillActive: {
    backgroundColor: colors.mint,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statusTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  /* Weekday Strip */
  weekCalendarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...shadows.cardSoft,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  dayColumnSelected: {
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
  },
  dayNameText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dayNameTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayNumTextSelected: {
    color: '#FFFFFF',
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
  },
  calendarDotSelected: {
    backgroundColor: colors.primary,
  },

  /* Summary Banner */
  summaryBanner: {
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D4EFEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryBannerText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  summaryHighlight: {
    fontWeight: '800',
    color: colors.primaryDark,
  },

  /* Appointments List */
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadows.cardSoft,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.aqua,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  cardModeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  followUpBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  followUpBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.3,
  },
  cardPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientAvatarFallback: {
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  patientInfoCol: {
    flex: 1,
    gap: 2,
  },
  patientNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  patientDemographicsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reasonText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feePaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  feePaidText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  startConsultMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  startConsultMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
