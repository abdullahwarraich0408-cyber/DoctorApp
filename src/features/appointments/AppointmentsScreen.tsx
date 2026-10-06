import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
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
  X,
  Check,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapAppointment } from '../../lib/mappers/doctorPortal';
import { StatusChip } from '../../components/StatusChip';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import TabScreenHeader from '../../components/TabScreenHeader';
import type { RootStackParamList } from '../../navigation/types';

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

function getWeekDays() {
  const days = [];
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() + mondayOffset);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      // Must match appointment dateKey (local Y-M-D). Never use toISOString() —
      // UTC conversion shifts the day for timezones ahead of UTC (e.g. PKT).
      dateStr: toLocalDateKey(d),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
      hasAppointments: false,
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

export function AppointmentsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 36 : 20) + 12;

  const [activeStatusTab, setActiveStatusTab] = useState(
    route.params?.status || 'all',
  );
  const [modeFilter, setModeFilter] = useState<'all' | 'In-Clinic' | 'Video'>(
    route.params?.mode || 'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filter Bottom Sheet Modal State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempMode, setTempMode] = useState<'all' | 'In-Clinic' | 'Video'>('all');
  const [tempStatus, setTempStatus] = useState('all');
  const [tempDateScope, setTempDateScope] = useState<'selected' | 'all'>('selected');

  const weekDays = useMemo(() => getWeekDays(), []);
  const [selectedDate, setSelectedDate] = useState(
    () =>
      route.params?.dateStr ||
      weekDays.find(d => d.isToday)?.dateStr ||
      weekDays[0].dateStr,
  );

  React.useEffect(() => {
    if (route.params?.status) {
      setActiveStatusTab(route.params.status);
    }
    if (route.params?.mode) {
      setModeFilter(route.params.mode);
    }
    if (route.params?.dateStr) {
      setSelectedDate(route.params.dateStr);
    }
  }, [route.params?.status, route.params?.mode, route.params?.dateStr]);

  const query = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => doctorPortalApi.getAppointments(),
    refetchInterval: 15_000,
  });

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [query]);


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
      type: a.type?.toLowerCase().includes('clinic')
        ? 'In-Clinic'
        : a.type?.toLowerCase().includes('video') || a.isOnline
          ? 'Video'
          : a.type || 'Consult',
      isFeePaid: Boolean(a.paymentStatus === 'paid' || a.raw?.payment_status === 'paid'),
      isFollowUp: Boolean(a.isFollowUp),
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

    if (modeFilter && modeFilter !== 'all') {
      list = list.filter((a: any) => a.type === modeFilter);
    }

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

    // Calendar day filter applies to All + status chips that are not date-scoped.
    // "today" / "upcoming" already encode their own date rules.
    if (
      selectedDate &&
      activeStatusTab !== 'today' &&
      activeStatusTab !== 'upcoming'
    ) {
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
  }, [allAppointments, modeFilter, activeStatusTab, searchQuery, selectedDate]);

  const summaryLabel = useMemo(() => {
    if (activeStatusTab === 'today') return 'today';
    if (activeStatusTab === 'upcoming') return 'upcoming';
    if (selectedDate === toLocalDateKey(new Date())) return 'today';
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return `on ${label}`;
    }
    return 'selected';
  }, [activeStatusTab, selectedDate]);

  const hasActiveFilters =
    modeFilter !== 'all' || activeStatusTab !== 'all' || searchQuery.trim().length > 0;

  const modeCounts = useMemo(() => {
    let inClinic = 0;
    let video = 0;
    allAppointments.forEach((a: any) => {
      if (a.type === 'In-Clinic') inClinic++;
      else if (a.type === 'Video') video++;
    });
    return {
      all: allAppointments.length,
      inClinic,
      video,
    };
  }, [allAppointments]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return 'All Days';
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [selectedDate]);

  const previewMatchCount = useMemo(() => {
    let list = allAppointments;
    const todayKey = toLocalDateKey(new Date());

    if (tempMode && tempMode !== 'all') {
      list = list.filter((a: any) => a.type === tempMode);
    }

    if (tempStatus === 'pending') {
      list = list.filter(
        (a: any) => a.status === 'pending' || a.status === 'booked',
      );
    } else if (tempStatus === 'today') {
      list = list.filter(
        (a: any) =>
          a.dateKey === todayKey &&
          (OPEN_STATUSES.has(a.status) || a.status === 'completed'),
      );
    } else if (tempStatus === 'upcoming') {
      list = list.filter(
        (a: any) => OPEN_STATUSES.has(a.status) && a.dateKey >= todayKey,
      );
    } else if (tempStatus === 'completed') {
      list = list.filter((a: any) => a.status === 'completed');
    } else if (tempStatus === 'cancelled') {
      list = list.filter(
        (a: any) => a.status === 'cancelled' || a.status === 'no_show',
      );
    }

    if (
      tempDateScope === 'selected' &&
      selectedDate &&
      tempStatus !== 'today' &&
      tempStatus !== 'upcoming'
    ) {
      list = list.filter((a: any) => a.dateKey === selectedDate);
    }

    return list.length;
  }, [allAppointments, tempMode, tempStatus, tempDateScope, selectedDate]);

  const openFilterModal = () => {
    setTempMode(modeFilter);
    setTempStatus(activeStatusTab);
    setTempDateScope(selectedDate ? 'selected' : 'all');
    setShowFilterModal(true);
  };

  const handleApplyFilterModal = () => {
    setModeFilter(tempMode);
    setActiveStatusTab(tempStatus);
    if (tempDateScope === 'all') {
      setSelectedDate('');
    } else if (!selectedDate) {
      setSelectedDate(weekDays.find(d => d.isToday)?.dateStr || weekDays[0].dateStr);
    }
    setShowFilterModal(false);
  };

  const handleResetFilterModal = () => {
    setTempMode('all');
    setTempStatus('all');
    setTempDateScope('selected');
  };

  const handleClearAllFilters = () => {
    setModeFilter('all');
    setActiveStatusTab('all');
    setSearchQuery('');
  };

  return (
    <View style={styles.root}>
      <TabScreenHeader
        title="Appointments"
        right={
          <>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => setShowSearch(!showSearch)}
              accessibilityLabel="Search appointments"
              hitSlop={8}>
              <Search size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Pressable
              style={styles.headerIconBtn}
              onPress={openFilterModal}
              accessibilityLabel="Filter appointments"
              hitSlop={8}>
              <Filter size={20} color="#FFFFFF" strokeWidth={2} />
              {(modeFilter !== 'all' || activeStatusTab !== 'all') && (
                <View style={styles.filterActiveBadgeDot} />
              )}
            </Pressable>
          </>
        }>
        {showSearch ? (
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
        ) : (
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
        )}
      </TabScreenHeader>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onRefresh}
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
                  onPress={() => {
                    setSelectedDate(item.dateStr);
                    // Day taps should surface that day's list (All), not leave
                    // the user on a date-agnostic chip with a mismatched strip.
                    if (
                      activeStatusTab === 'today' ||
                      activeStatusTab === 'upcoming'
                    ) {
                      setActiveStatusTab('all');
                    }
                  }}>
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

        {/* Dedicated Active Filter Chips Bar (Separated from summary banner) */}
        {(modeFilter !== 'all' || activeStatusTab !== 'all') && (
          <View style={styles.activeFiltersRow}>
            <View style={styles.activeFiltersLeft}>
              <Text style={styles.activeFiltersLabel}>Filtered by:</Text>
              {modeFilter !== 'all' && (
                <View style={styles.activeFilterChip}>
                  {modeFilter === 'In-Clinic' ? (
                    <Building size={12} color={colors.primaryDark} strokeWidth={2.2} />
                  ) : (
                    <Video size={12} color={colors.primaryDark} strokeWidth={2.2} />
                  )}
                  <Text style={styles.activeFilterChipText}>{modeFilter}</Text>
                  <Pressable
                    onPress={() => setModeFilter('all')}
                    hitSlop={8}
                    style={styles.chipRemoveBtn}>
                    <X size={11} color={colors.primaryDark} strokeWidth={2.5} />
                  </Pressable>
                </View>
              )}
              {activeStatusTab !== 'all' && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>
                    Status: {STATUS_TABS.find(t => t.key === activeStatusTab)?.label || activeStatusTab}
                  </Text>
                  <Pressable
                    onPress={() => setActiveStatusTab('all')}
                    hitSlop={8}
                    style={styles.chipRemoveBtn}>
                    <X size={11} color={colors.primaryDark} strokeWidth={2.5} />
                  </Pressable>
                </View>
              )}
            </View>

            <Pressable
              onPress={handleClearAllFilters}
              hitSlop={8}
              style={styles.clearAllBtn}>
              <Text style={styles.clearAllBtnText}>Clear all</Text>
            </Pressable>
          </View>
        )}

        {/* Daily Summary Banner Strip */}
        <View style={styles.summaryBanner}>
          <Calendar size={18} color={colors.primary} strokeWidth={2} />
          <Text style={styles.summaryBannerText} numberOfLines={1}>
            You have{' '}
            <Text style={styles.summaryHighlight}>
              {filteredAppointments.length}{' '}
              {modeFilter !== 'all' ? `${modeFilter} ` : ''}appointment{filteredAppointments.length === 1 ? '' : 's'}
            </Text>{' '}
            {summaryLabel}
          </Text>
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
              {hasActiveFilters && (
                <Pressable
                  style={styles.emptyClearBtn}
                  onPress={handleClearAllFilters}>
                  <Text style={styles.emptyClearBtnText}>Reset All Filters</Text>
                </Pressable>
              )}
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
                    {appt.isFeePaid ? (
                      <View style={styles.feePaidBadge}>
                        <CheckCircle2 size={12} color={colors.success} strokeWidth={2.2} />
                        <Text style={styles.feePaidText}>Fee Paid</Text>
                      </View>
                    ) : (
                      <View style={[styles.feePaidBadge, styles.feePendingBadge]}>
                        <Text style={styles.feePendingText}>Fee Pending</Text>
                      </View>
                    )}

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

      {/* Interactive Filter Bottom Sheet Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowFilterModal(false)}
          />
          <View style={styles.modalCard}>
            {/* Sheet Handle */}
            <View style={styles.modalDragHandle} />

            {/* Enhanced Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBadge}>
                  <Filter size={18} color={colors.primary} strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Filter Appointments</Text>
                  <Text style={styles.modalSubtitle}>Refine visits by mode, status & date</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowFilterModal(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}>
                <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}>
              {/* Section 1: Consultation Type */}
              <View style={styles.modalSectionHeaderRow}>
                <Text style={styles.modalSectionLabel}>CONSULTATION TYPE</Text>
                <Text style={styles.modalSectionSublabel}>Select mode</Text>
              </View>
              <View style={styles.modalModeRow}>
                <Pressable
                  style={[
                    styles.modalModeCard,
                    tempMode === 'all' && styles.modalModeCardActive,
                  ]}
                  onPress={() => setTempMode('all')}>
                  <View style={[styles.modeCardIconWrap, tempMode === 'all' && styles.modeCardIconWrapActive]}>
                    <CheckCircle2
                      size={18}
                      color={tempMode === 'all' ? colors.primary : colors.textMuted}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modalModeCardTitle,
                      tempMode === 'all' && styles.modalModeCardTitleActive,
                    ]}>
                    All Visits
                  </Text>
                  <View style={[styles.modeCountBadge, tempMode === 'all' && styles.modeCountBadgeActive]}>
                    <Text style={[styles.modeCountBadgeText, tempMode === 'all' && styles.modeCountBadgeTextActive]}>
                      {modeCounts.all}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalModeCard,
                    tempMode === 'In-Clinic' && styles.modalModeCardActive,
                  ]}
                  onPress={() => setTempMode('In-Clinic')}>
                  <View style={[styles.modeCardIconWrap, tempMode === 'In-Clinic' && styles.modeCardIconWrapActive]}>
                    <Building
                      size={18}
                      color={tempMode === 'In-Clinic' ? colors.primary : colors.textMuted}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modalModeCardTitle,
                      tempMode === 'In-Clinic' && styles.modalModeCardTitleActive,
                    ]}>
                    In-Clinic
                  </Text>
                  <View style={[styles.modeCountBadge, tempMode === 'In-Clinic' && styles.modeCountBadgeActive]}>
                    <Text style={[styles.modeCountBadgeText, tempMode === 'In-Clinic' && styles.modeCountBadgeTextActive]}>
                      {modeCounts.inClinic}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalModeCard,
                    tempMode === 'Video' && styles.modalModeCardActive,
                  ]}
                  onPress={() => setTempMode('Video')}>
                  <View style={[styles.modeCardIconWrap, tempMode === 'Video' && styles.modeCardIconWrapActive]}>
                    <Video
                      size={18}
                      color={tempMode === 'Video' ? colors.primary : colors.textMuted}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modalModeCardTitle,
                      tempMode === 'Video' && styles.modalModeCardTitleActive,
                    ]}>
                    Video
                  </Text>
                  <View style={[styles.modeCountBadge, tempMode === 'Video' && styles.modeCountBadgeActive]}>
                    <Text style={[styles.modeCountBadgeText, tempMode === 'Video' && styles.modeCountBadgeTextActive]}>
                      {modeCounts.video}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Section 2: Appointment Status */}
              <View style={styles.modalSectionHeaderRow}>
                <Text style={styles.modalSectionLabel}>APPOINTMENT STATUS</Text>
                <Text style={styles.modalSectionSublabel}>Clinical status</Text>
              </View>
              <View style={styles.modalChipsWrap}>
                {STATUS_TABS.map(tab => {
                  const isSelected = tempStatus === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      style={[
                        styles.modalStatusChip,
                        isSelected && styles.modalStatusChipActive,
                      ]}
                      onPress={() => setTempStatus(tab.key)}>
                      {isSelected && (
                        <Check size={12} color="#FFFFFF" strokeWidth={2.6} />
                      )}
                      <Text
                        style={[
                          styles.modalStatusChipText,
                          isSelected && styles.modalStatusChipTextActive,
                        ]}>
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Section 3: Date Scope */}
              <View style={styles.modalSectionHeaderRow}>
                <Text style={styles.modalSectionLabel}>DATE SCOPE</Text>
                <Text style={styles.modalSectionSublabel}>Calendar window</Text>
              </View>
              <View style={styles.modalDateScopeRow}>
                <Pressable
                  style={[
                    styles.modalDateCard,
                    tempDateScope === 'selected' && styles.modalDateCardActive,
                  ]}
                  onPress={() => setTempDateScope('selected')}>
                  <View style={styles.modalDateCardLeft}>
                    <View
                      style={[
                        styles.dateCardIconWrap,
                        tempDateScope === 'selected' && styles.dateCardIconWrapActive,
                      ]}>
                      <Calendar
                        size={16}
                        color={tempDateScope === 'selected' ? colors.primary : colors.textMuted}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View style={styles.dateCardTextCol}>
                      <Text
                        style={[
                          styles.modalDateCardTitle,
                          tempDateScope === 'selected' && styles.modalDateCardTitleActive,
                        ]}>
                        Selected Day
                      </Text>
                      <Text style={styles.modalDateCardSub} numberOfLines={1}>
                        {selectedDateLabel}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      tempDateScope === 'selected' && styles.radioCircleActive,
                    ]}>
                    {tempDateScope === 'selected' && <View style={styles.radioInnerDot} />}
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.modalDateCard,
                    tempDateScope === 'all' && styles.modalDateCardActive,
                  ]}
                  onPress={() => setTempDateScope('all')}>
                  <View style={styles.modalDateCardLeft}>
                    <View
                      style={[
                        styles.dateCardIconWrap,
                        tempDateScope === 'all' && styles.dateCardIconWrapActive,
                      ]}>
                      <CalendarCheck
                        size={16}
                        color={tempDateScope === 'all' ? colors.primary : colors.textMuted}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View style={styles.dateCardTextCol}>
                      <Text
                        style={[
                          styles.modalDateCardTitle,
                          tempDateScope === 'all' && styles.modalDateCardTitleActive,
                        ]}>
                        Whole Week
                      </Text>
                      <Text style={styles.modalDateCardSub} numberOfLines={1}>
                        All visits
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      tempDateScope === 'all' && styles.radioCircleActive,
                    ]}>
                    {tempDateScope === 'all' && <View style={styles.radioInnerDot} />}
                  </View>
                </Pressable>
              </View>
            </ScrollView>

            {/* Modal Footer with Safe Area Bottom Padding */}
            <View style={[styles.modalFooter, { paddingBottom: modalBottomPadding }]}>
              <Pressable
                style={styles.modalResetBtn}
                onPress={handleResetFilterModal}>
                <Text style={styles.modalResetBtnText}>Reset All</Text>
              </Pressable>
              <Pressable
                style={styles.modalApplyBtn}
                onPress={handleApplyFilterModal}>
                <Text style={styles.modalApplyBtnText}>
                  Apply Filters ({previewMatchCount})
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

  /* Header action styles (shell from TabScreenHeader) */
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActiveBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mint,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
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
    justifyContent: 'flex-end',
  },
  statusTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
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

  /* Active Filter Row (Separated from summary banner) */
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  activeFiltersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  activeFiltersLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginRight: 2,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#B4E8E1',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  activeFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  chipRemoveBtn: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#C8EDE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  clearAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
    gap: 8,
  },
  summaryBannerText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '500',
    flex: 1,
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
  feePendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  feePendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
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
  emptyClearBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...shadows.cardSoft,
  },
  emptyClearBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Filter Bottom Sheet Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    ...shadows.cardElevated,
  },
  modalDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  modalSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  modalSectionSublabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modalModeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalModeCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  modalModeCardActive: {
    backgroundColor: colors.aqua,
    borderColor: colors.primary,
  },
  modeCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardIconWrapActive: {
    backgroundColor: '#FFFFFF',
  },
  modalModeCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalModeCardTitleActive: {
    color: colors.primaryDark,
  },
  modeCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  modeCountBadgeActive: {
    backgroundColor: colors.primary,
  },
  modeCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  modeCountBadgeTextActive: {
    color: '#FFFFFF',
  },
  modalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalStatusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalStatusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalStatusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalDateScopeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalDateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...shadows.cardSoft,
  },
  modalDateCardActive: {
    backgroundColor: colors.aqua,
    borderColor: colors.primary,
  },
  modalDateCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dateCardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardIconWrapActive: {
    backgroundColor: '#FFFFFF',
  },
  dateCardTextCol: {
    flex: 1,
  },
  modalDateCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalDateCardTitleActive: {
    color: colors.primaryDark,
  },
  modalDateCardSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalResetBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  modalResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalApplyBtn: {
    flex: 2,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.cardElevated,
  },
  modalApplyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
