import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Image,
  Switch,
  Alert,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Bell,
  Video,
  Building,
  Users,
  Clock,
  MessageSquare,
  FileText,
  ChevronRight,
  TrendingUp,
  Pill,
  Sparkles,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapAppointment, mapDoctorProfile } from '../../lib/mappers/doctorPortal';
import { useAuth } from '../../lib/auth/AuthContext';
import { StatusChip } from '../../components/StatusChip';
import TabScreenHeader from '../../components/TabScreenHeader';
import { colors, radius, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

function cleanComplaintText(reason?: string | null): string {
  if (!reason) return 'General Consultation';
  let cleaned = String(reason)
    .replace(/\[DoctorApp demo\]/gi, '')
    .replace(/\([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\)/g, '')
    .trim();
  cleaned = cleaned.replace(/^[-—–:\s]+|[-—–:\s]+$/g, '').trim();
  return cleaned || 'General Consultation';
}

function appointmentSortTime(a: any): number {
  if (a?.dateRaw) {
    const t = new Date(a.dateRaw).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return Number.MAX_SAFE_INTEGER;
}

export function DashboardScreen() {
  const { partner } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 380;
  const isNarrow = windowWidth < 360;

  const [isOnline, setIsOnline] = useState(true);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(18)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const profileQuery = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: () => doctorPortalApi.getProfile(),
  });
  const statsQuery = useQuery({
    queryKey: ['doctor-stats'],
    queryFn: () => doctorPortalApi.getStats(),
  });
  const apptQuery = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => doctorPortalApi.getAppointments(),
  });

  const profile = mapDoctorProfile(profileQuery.data?.doctor || profileQuery.data) || {
    name: partner?.name || 'Doctor',
    specialty: partner?.specialty || '',
    photoUrl: null,
    online: true,
    notifications: {
      email: true,
      sms: true,
      reminders: true,
      push: true,
      marketing: false,
    },
  };

  useEffect(() => {
    if (profile?.online !== undefined) {
      setIsOnline(Boolean(profile.online));
    }
  }, [profile?.online]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fadeIn, slideUp, pulse]);

  const onlineMut = useMutation({
    mutationFn: (newStatus: boolean) =>
      doctorPortalApi.updateProfile({ online: newStatus }),
    onSuccess: (_, newStatus) => {
      setIsOnline(newStatus);
      queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
    },
    onError: (err: Error) => {
      setIsOnline(!isOnline);
      Alert.alert('Status Error', err.message);
    },
  });

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([
        profileQuery.refetch(),
        statsQuery.refetch(),
        apptQuery.refetch(),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }, [profileQuery, statsQuery, apptQuery]);

  const appointments = useMemo(
    () =>
      (
        Array.isArray(apptQuery.data)
          ? apptQuery.data
          : apptQuery.data?.appointments || []
      ).map(mapAppointment),
    [apptQuery.data],
  );

  const stats = useMemo(() => {
    const raw = statsQuery.data?.stats || statsQuery.data || {};
    const totalToday = appointments.length || raw.todayAppointments || 0;
    const videoCount = appointments.filter(
      (a: any) => a.isOnline || a.type?.toLowerCase().includes('video'),
    ).length;
    const inClinicCount = appointments.filter(
      (a: any) => a.isInPerson || a.type?.toLowerCase().includes('clinic'),
    ).length;
    const ratingVal = raw.rating ? Number(raw.rating).toFixed(1) : '5.0';

    return {
      todayConsultations: totalToday,
      inClinic: inClinicCount,
      video: videoCount,
      rating: ratingVal,
    };
  }, [statsQuery.data, appointments]);

  const pendingAppointments = useMemo(() => {
    return appointments.filter(
      (a: any) => a.status === 'pending' || a.status === 'booked',
    );
  }, [appointments]);

  const nextPatient = useMemo(() => {
    const actionable = appointments.filter((a: any) =>
      ['in_progress', 'checked_in', 'confirmed', 'pending', 'booked', 'upcoming'].includes(
        a.status,
      ),
    );

    const ranked = [...actionable].sort((a: any, b: any) => {
      const rank = (s: string) => {
        if (s === 'in_progress') return 0;
        if (s === 'checked_in') return 1;
        return 2;
      };
      const ra = rank(a.status);
      const rb = rank(b.status);
      if (ra !== rb) return ra - rb;
      return appointmentSortTime(a) - appointmentSortTime(b);
    });

    const found = ranked[0];
    if (!found) return null;

    const isVideo = Boolean(
      found.isOnline ||
        (found.type?.toLowerCase().includes('video') && !found.isInPerson),
    );
    const isClinic = Boolean(
      found.isInPerson || found.type?.toLowerCase().includes('clinic'),
    );

    let priorityLabel = 'Confirmed Visit';
    let priorityKind: 'in_progress' | 'confirmed' | 'pending' = 'confirmed';
    if (found.status === 'in_progress') {
      priorityLabel = 'In Progress';
      priorityKind = 'in_progress';
    } else if (found.status === 'checked_in') {
      priorityLabel = 'Checked In';
      priorityKind = 'confirmed';
    } else if (found.status === 'pending' || found.status === 'booked') {
      priorityLabel = 'Pending Review';
      priorityKind = 'pending';
    }

    return {
      id: found.id,
      patientId: found.patientId,
      name: found.patient || 'Patient',
      time: found.time || '',
      date: found.date || 'Today',
      isVideo,
      type: isClinic ? 'In-Clinic' : isVideo ? 'Video Visit' : found.type || 'Consultation',
      priority: priorityLabel,
      priorityKind,
      chiefComplaint: cleanComplaintText(found.reason),
      ageGender: 'Patient',
      meetingUrl: found.meetingUrl,
    };
  }, [appointments]);

  const agendaList = useMemo(() => {
    const statusRank: Record<string, number> = {
      in_progress: 1,
      checked_in: 2,
      confirmed: 3,
      pending: 4,
      booked: 5,
      completed: 6,
      cancelled: 7,
      no_show: 8,
    };

    const sorted = [...appointments].sort((a: any, b: any) => {
      const rankA = statusRank[a.status] || 99;
      const rankB = statusRank[b.status] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return appointmentSortTime(a) - appointmentSortTime(b);
    });

    return sorted.slice(0, 8).map((a: any) => ({
      id: a.id,
      patient: a.patient || 'Patient',
      time: a.time || '',
      mode: a.type?.toLowerCase().includes('clinic') ? 'In-Clinic' : 'Video',
      status: a.status || 'confirmed',
      isCompleted: a.status === 'completed' || a.status === 'cancelled',
    }));
  }, [appointments]);

  const [isMainScrollEnabled, setIsMainScrollEnabled] = useState(true);
  const agendaScrollY = useRef(new Animated.Value(0)).current;
  const [agendaContentHeight, setAgendaContentHeight] = useState(1);
  const [agendaVisibleHeight, setAgendaVisibleHeight] = useState(1);

  const isAgendaScrollable = agendaContentHeight > agendaVisibleHeight + 5;
  const trackHeight = Math.max(0, agendaVisibleHeight - 16);
  const thumbHeight = isAgendaScrollable
    ? Math.max(28, (agendaVisibleHeight / agendaContentHeight) * trackHeight)
    : 0;
  const maxScroll = Math.max(1, agendaContentHeight - agendaVisibleHeight);
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);

  const thumbTranslateY = useMemo(() => {
    return agendaScrollY.interpolate({
      inputRange: [0, maxScroll],
      outputRange: [0, maxThumbTop],
      extrapolate: 'clamp',
    });
  }, [agendaScrollY, maxScroll, maxThumbTop]);

  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const currentDayName = today.toLocaleDateString('en-US', { weekday: 'short' });
    const currentDayOfWeek = today.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() + mondayOffset);

    const weekDates: Record<string, string> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      weekDates[dayName] = `${y}-${m}-${dayNum}`;
    }

    const counts: Record<string, number> = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    appointments.forEach((a: any) => {
      if (a.dateRaw) {
        const d = new Date(a.dateRaw);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (dayStr in counts) {
          counts[dayStr] += 1;
        }
      }
    });

    return days.map(d => ({
      day: d,
      dateStr: weekDates[d],
      count: counts[d],
      active: d === currentDayName,
    }));
  }, [appointments]);

  const maxWeeklyCount = useMemo(() => {
    const max = Math.max(...weeklyData.map(d => d.count), 0);
    return Math.max(max, 4);
  }, [weeklyData]);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <View style={styles.root}>
      {/* Atmospheric mesh — brand teal, not flat white */}
      <View pointerEvents="none" style={styles.atmosphere}>
        <View style={styles.orbTop} />
        <View style={styles.orbMid} />
        <View style={styles.orbSoft} />
      </View>

      <TabScreenHeader
        leading={
          <View style={styles.headerTopRow}>
            <Pressable
              style={styles.avatarWrap}
              onPress={() => (navigation as any).navigate('Profile')}>
              {profile.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={styles.doctorAvatarImg} />
              ) : (
                <View style={[styles.doctorAvatarImg, styles.doctorAvatarFallback]}>
                  <Text style={styles.doctorAvatarInitial}>
                    {(profile.name || 'D').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.verifiedCheckBadge}>
                <BadgeCheck size={14} color={colors.primaryLight} strokeWidth={2.5} />
              </View>
            </Pressable>

            <View style={styles.headerInfoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.doctorNameText} numberOfLines={1}>
                  {profile.name || 'Doctor'}
                </Text>
                <BadgeCheck size={16} color={colors.mint} strokeWidth={2.5} />
              </View>
              <Text style={styles.specialtyText} numberOfLines={1}>
                {profile.specialty || 'Consultant'}
              </Text>
            </View>
          </View>
        }
        right={
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
            hitSlop={8}>
            <Bell size={20} color="#FFFFFF" strokeWidth={2} />
            <View style={styles.notificationDot} />
          </Pressable>
        }>
        <View style={styles.liveBar}>
          <View style={styles.liveLeft}>
            <Animated.View
              style={[
                styles.liveStatusDot,
                isOnline ? styles.liveStatusDotOn : styles.liveStatusDotOff,
                isOnline && { transform: [{ scale: pulse }] },
              ]}
            />
            <Text style={styles.liveText} numberOfLines={1}>
              {isOnline ? 'Online for Telehealth' : 'Offline'}
            </Text>
          </View>

          <View style={styles.switchWrapper}>
            {!isNarrow ? (
              <Text style={styles.switchLabel}>{isOnline ? 'Active' : 'Paused'}</Text>
            ) : null}
            <Switch
              value={isOnline}
              onValueChange={val => onlineMut.mutate(val)}
              disabled={onlineMut.isPending}
              trackColor={{ false: 'rgba(255,255,255,0.25)', true: colors.mint }}
              thumbColor={isOnline ? colors.primary : '#FFFFFF'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
      </TabScreenHeader>

      <ScrollView
        scrollEnabled={isMainScrollEnabled}
        nestedScrollEnabled
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        <Animated.View
          style={{
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
            gap: 16,
          }}>
          {/* Day opener — brand + count as hero signal */}
          <View style={[styles.dayStage, isCompact && styles.dayStageCompact]}>
            <View style={styles.dayStageCopy}>
              <Text style={styles.dayEyebrow} numberOfLines={1}>
                {todayLabel}
              </Text>
              <Text style={styles.dayHeadline} numberOfLines={2}>
                Your practice,{'\n'}in motion
              </Text>
              <Text style={styles.daySub} numberOfLines={2}>
                Consultations queued for today across clinic and video.
              </Text>
            </View>

            <Pressable
              style={[styles.dayCountBlock, isCompact && styles.dayCountBlockWide]}
              onPress={() =>
                (navigation as any).navigate('Appointments', {
                  status: 'today',
                  mode: 'all',
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Total consultations today: ${stats.todayConsultations}`}>
              <Text style={styles.dayCountLabel}>Today</Text>
              <Text style={styles.dayCountValue} numberOfLines={1}>
                {stats.todayConsultations}
              </Text>
              <View style={styles.dayCountDelta}>
                <Sparkles size={11} color={colors.mint} strokeWidth={2.2} />
                <Text style={styles.dayCountDeltaText}>+{stats.todayConsultations}</Text>
              </View>
            </Pressable>
          </View>

          {/* Split metrics */}
          <View style={[styles.metricRail, isCompact && styles.metricRailStack]}>
            <Pressable
              style={[styles.metricTile, styles.metricTileClinic, isCompact && styles.metricTileGrow]}
              onPress={() =>
                (navigation as any).navigate('Appointments', {
                  status: 'today',
                  mode: 'In-Clinic',
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`In-Clinic visits: ${stats.inClinic}`}>
              <View style={styles.metricIconClinic}>
                <Building size={16} color={colors.primaryDark} strokeWidth={2.2} />
              </View>
              <View style={styles.metricCopy}>
                <Text style={styles.metricTitle} numberOfLines={1}>
                  In-Clinic
                </Text>
                <Text style={styles.metricSub} numberOfLines={1}>
                  In-person visits
                </Text>
              </View>
              <Text style={styles.metricValueClinic} numberOfLines={1}>
                {stats.inClinic}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.metricTile, styles.metricTileVideo, isCompact && styles.metricTileGrow]}
              onPress={() =>
                (navigation as any).navigate('Appointments', {
                  status: 'today',
                  mode: 'Video',
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Video consultations: ${stats.video}`}>
              <View style={styles.metricIconVideo}>
                <Video size={16} color="#0369A1" strokeWidth={2.2} />
              </View>
              <View style={styles.metricCopy}>
                <Text style={styles.metricTitle} numberOfLines={1}>
                  Video Call
                </Text>
                <Text style={styles.metricSub} numberOfLines={1}>
                  Telehealth calls
                </Text>
              </View>
              <Text style={styles.metricValueVideo} numberOfLines={1}>
                {stats.video}
              </Text>
            </Pressable>
          </View>

          {pendingAppointments.length > 0 ? (
            <Pressable
              style={styles.pendingStrip}
              onPress={() =>
                (navigation as any).navigate('Appointments', { status: 'pending' })
              }>
              <View style={styles.pendingLeft}>
                <View style={styles.pendingDot} />
                <Text style={styles.pendingText} numberOfLines={2}>
                  <Text style={styles.pendingBold}>
                    {pendingAppointments.length} booking request
                    {pendingAppointments.length > 1 ? 's' : ''}
                  </Text>{' '}
                  awaiting review
                </Text>
              </View>
              <View style={styles.pendingAction}>
                <Text style={styles.pendingActionText}>Review</Text>
                <ChevronRight size={14} color="#92400E" strokeWidth={2.4} />
              </View>
            </Pressable>
          ) : null}

          {/* Next patient — elevated light card (readable, not a solid teal slab) */}
          {nextPatient ? (
            <View style={styles.nextStage}>
              <View pointerEvents="none" style={styles.nextAccentRail} />
              <View pointerEvents="none" style={styles.nextGlow} />

              <Pressable
                style={styles.nextBody}
                onPress={() =>
                  navigation.navigate('AppointmentDetail', {
                    appointmentId: nextPatient.id,
                  })
                }>
                <View style={styles.nextHeader}>
                  <View style={styles.nextLabelRow}>
                    <Animated.View
                      style={[styles.nextPulse, { transform: [{ scale: pulse }] }]}
                    />
                    <Text style={styles.nextLabel}>NEXT PATIENT</Text>
                  </View>
                  <View
                    style={[
                      styles.priorityBadge,
                      nextPatient.priorityKind === 'in_progress' &&
                        styles.priorityBadgeProgress,
                      nextPatient.priorityKind === 'pending' && styles.priorityBadgePending,
                    ]}>
                    <Text
                      style={[
                        styles.priorityBadgeText,
                        nextPatient.priorityKind === 'in_progress' &&
                          styles.priorityBadgeTextProgress,
                        nextPatient.priorityKind === 'pending' &&
                          styles.priorityBadgeTextPending,
                      ]}
                      numberOfLines={1}>
                      {nextPatient.priority}
                    </Text>
                  </View>
                </View>

                <View style={styles.nextPatientRow}>
                  <View style={styles.nextAvatar}>
                    <Text style={styles.nextAvatarInitial}>
                      {(nextPatient.name || 'P').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.nextMeta}>
                    <Text style={styles.nextName} numberOfLines={1}>
                      {nextPatient.name}
                    </Text>
                    <Text style={styles.nextDemographics} numberOfLines={1}>
                      {nextPatient.ageGender} • {nextPatient.type}
                    </Text>
                    <View style={styles.nextTimeRow}>
                      <Clock size={12} color={colors.primary} strokeWidth={2.2} />
                      <Text style={styles.nextTime} numberOfLines={1}>
                        {nextPatient.date} • {nextPatient.time}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.primaryLight} strokeWidth={2.2} />
                </View>

                <View style={styles.complaintPlane}>
                  <Text style={styles.complaintLabel}>Chief Complaint</Text>
                  <Text style={styles.complaintText} numberOfLines={3}>
                    {nextPatient.chiefComplaint}
                  </Text>
                </View>
              </Pressable>

              <View style={[styles.nextActions, isCompact && styles.nextActionsWrap]}>
                {nextPatient.isVideo ? (
                  <Pressable
                    style={[styles.primaryAction, isCompact && styles.actionFull]}
                    onPress={() =>
                      navigation.navigate('Video', {
                        appointmentId: nextPatient.id,
                        meetingUrl: nextPatient.meetingUrl,
                        patientName: nextPatient.name,
                      })
                    }>
                    <Video size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.primaryActionText} numberOfLines={1}>
                      Join Video
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.primaryAction, isCompact && styles.actionFull]}
                    onPress={() =>
                      navigation.navigate('Consultation', {
                        appointmentId: nextPatient.id,
                        patientName: nextPatient.name,
                        patientId: nextPatient.patientId,
                      })
                    }>
                    <FileText size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.primaryActionText} numberOfLines={1}>
                      {isNarrow ? 'Notes' : 'Start Visit Notes'}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.ghostAction, isCompact && styles.actionHalf]}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      appointmentId: nextPatient.id,
                      patientName: nextPatient.name,
                    })
                  }
                  accessibilityLabel="Open Chat">
                  <MessageSquare size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.ghostActionText} numberOfLines={1}>
                    Chat
                  </Text>
                </Pressable>

                {nextPatient.isVideo ? (
                  <Pressable
                    style={[styles.ghostAction, isCompact && styles.actionHalf]}
                    onPress={() =>
                      navigation.navigate('Consultation', {
                        appointmentId: nextPatient.id,
                        patientName: nextPatient.name,
                        patientId: nextPatient.patientId,
                      })
                    }
                    accessibilityLabel="View Records">
                    <FileText size={15} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.ghostActionText} numberOfLines={1}>
                      Records
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.ghostAction, isCompact && styles.actionHalf]}
                    onPress={() =>
                      navigation.navigate('Prescription', {
                        appointmentId: nextPatient.id,
                        patientName: nextPatient.name,
                      })
                    }
                    accessibilityLabel="Write Prescription">
                    <Pill size={15} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.ghostActionText} numberOfLines={1}>
                      {isNarrow ? 'Rx' : 'Prescribe'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptyNext}>
              <View style={styles.emptyNextIcon}>
                <Users size={22} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyNextTitle}>No patient in queue</Text>
              <Text style={styles.emptyNextSub}>
                You have no upcoming consultations waiting right now.
              </Text>
              <Pressable
                style={styles.emptyNextBtn}
                onPress={() => (navigation as any).navigate('Appointments')}>
                <Text style={styles.emptyNextBtnText}>View appointments</Text>
                <ChevronRight size={14} color={colors.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
          )}

          {/* Agenda */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              Today's Agenda
            </Text>
            <View style={styles.sectionLinks}>
              <Pressable onPress={() => navigation.navigate('FollowUps')} hitSlop={6}>
                <Text style={styles.sectionLink}>Follow-ups</Text>
              </Pressable>
              <Pressable
                onPress={() => (navigation as any).navigate('Appointments')}
                hitSlop={6}>
                <Text style={styles.sectionLink}>See All</Text>
              </Pressable>
            </View>
          </View>

          <View
            style={styles.agendaCard}
            onTouchStart={() => setIsMainScrollEnabled(false)}
            onTouchEnd={() => setIsMainScrollEnabled(true)}
            onTouchCancel={() => setIsMainScrollEnabled(true)}>
            {agendaList.length === 0 ? (
              <View style={styles.emptyAgenda}>
                <Clock size={22} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.emptyAgendaText}>
                  No appointments scheduled on your agenda
                </Text>
              </View>
            ) : (
              <View style={styles.agendaBody}>
                <Animated.ScrollView
                  style={styles.agendaScroll}
                  contentContainerStyle={styles.agendaScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  overScrollMode="never"
                  scrollEventThrottle={1}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: agendaScrollY } } }],
                    { useNativeDriver: true },
                  )}
                  onScrollBeginDrag={() => setIsMainScrollEnabled(false)}
                  onScrollEndDrag={() => setIsMainScrollEnabled(true)}
                  onMomentumScrollEnd={() => setIsMainScrollEnabled(true)}
                  onContentSizeChange={(_w, h) => setAgendaContentHeight(h)}
                  onLayout={e => setAgendaVisibleHeight(e.nativeEvent.layout.height)}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  bounces={agendaList.length > 3}>
                  {agendaList.map((item: any, idx: number) => {
                    const isLast = idx === agendaList.length - 1;
                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.agendaRow,
                          !isLast && styles.agendaRowBorder,
                          item.isCompleted && styles.agendaRowCompleted,
                        ]}
                        onPress={() =>
                          navigation.navigate('AppointmentDetail', {
                            appointmentId: item.id,
                          })
                        }>
                        <View style={styles.agendaTimeline}>
                          <View
                            style={[
                              styles.agendaNode,
                              item.isCompleted && styles.agendaNodeDone,
                            ]}
                          />
                          {!isLast ? <View style={styles.agendaSpine} /> : null}
                        </View>

                        <View
                          style={[
                            styles.agendaAvatar,
                            item.isCompleted && styles.agendaAvatarCompleted,
                          ]}>
                          <Text style={styles.agendaAvatarInitial}>
                            {(item.patient || 'P').charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.agendaInfo}>
                          <Text
                            style={[
                              styles.agendaName,
                              item.isCompleted && styles.agendaNameCompleted,
                            ]}
                            numberOfLines={1}>
                            {item.patient}
                          </Text>
                          <View style={styles.agendaMeta}>
                            <Text style={styles.agendaTime} numberOfLines={1}>
                              {item.time}
                            </Text>
                            <Text style={styles.agendaDot}>•</Text>
                            <Text style={styles.agendaMode} numberOfLines={1}>
                              {item.mode}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.agendaChipWrap}>
                          <StatusChip status={item.status} />
                        </View>
                      </Pressable>
                    );
                  })}
                </Animated.ScrollView>

                {isAgendaScrollable ? (
                  <View style={[styles.agendaTrack, { height: trackHeight }]}>
                    <Animated.View
                      style={[
                        styles.agendaThumb,
                        {
                          height: thumbHeight,
                          transform: [{ translateY: thumbTranslateY }],
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Weekly */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              Weekly Overview
            </Text>
            <View style={styles.weekPill}>
              <TrendingUp size={12} color={colors.success} strokeWidth={2.2} />
              {!isNarrow ? (
                <Text style={styles.weekPillText} numberOfLines={1}>
                  From your appointments
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.weekCard}>
            <View style={styles.weekBars}>
              {weeklyData.map(item => {
                const barH =
                  item.count > 0
                    ? Math.max(14, Math.round((item.count / maxWeeklyCount) * 56))
                    : 4;
                return (
                  <Pressable
                    key={item.day}
                    style={styles.weekCol}
                    onPress={() =>
                      (navigation as any).navigate('Appointments', {
                        status: 'all',
                        dateStr: item.dateStr,
                      })
                    }>
                    <Text
                      style={[styles.weekValue, item.active && styles.weekValueActive]}
                      numberOfLines={1}>
                      {item.count}
                    </Text>
                    <View style={styles.weekTrack}>
                      <View
                        style={[
                          styles.weekFill,
                          { height: barH },
                          item.active && styles.weekFillActive,
                        ]}
                      />
                    </View>
                    <Text
                      style={[styles.weekDay, item.active && styles.weekDayActive]}
                      numberOfLines={1}>
                      {isNarrow ? item.day.charAt(0) : item.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F7F8',
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orbTop: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 109, 114, 0.07)',
  },
  orbMid: {
    position: 'absolute',
    top: 280,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 140, 145, 0.05)',
  },
  orbSoft: {
    position: 'absolute',
    bottom: 120,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(221, 246, 242, 0.55)',
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: TAB_BAR_CLEARANCE + 36,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  doctorAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorAvatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  headerInfoCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  doctorNameText: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  liveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 8,
    minWidth: 0,
  },
  liveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  liveStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  liveStatusDotOn: {
    backgroundColor: colors.mint,
  },
  liveStatusDotOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  liveText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  dayStage: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    minWidth: 0,
  },
  dayStageCompact: {
    flexDirection: 'column',
  },
  dayStageCopy: {
    flex: 1.35,
    minWidth: 0,
    justifyContent: 'center',
    gap: 6,
  },
  dayEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayHeadline: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.9,
    lineHeight: 30,
  },
  daySub: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dayCountBlock: {
    width: 108,
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
    flexShrink: 0,
    ...shadows.cardElevated,
  },
  dayCountBlockWide: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  dayCountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
  dayCountValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.6,
    lineHeight: 44,
  },
  dayCountDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dayCountDeltaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mint,
  },

  metricRail: {
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  metricRailStack: {
    flexDirection: 'column',
  },
  metricTile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  metricTileGrow: {
    flex: 0,
    width: '100%',
  },
  metricTileClinic: {
    backgroundColor: '#F0FDF9',
    borderColor: '#A7F3D0',
  },
  metricTileVideo: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  metricIconClinic: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricIconVideo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  metricSub: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
  metricValueClinic: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.6,
    flexShrink: 0,
  },
  metricValueVideo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: -0.6,
    flexShrink: 0,
  },

  pendingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    minWidth: 0,
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
    flexShrink: 0,
  },
  pendingText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  pendingBold: {
    fontWeight: '700',
  },
  pendingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  pendingActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },

  nextStage: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    gap: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D7ECEA',
    ...shadows.cardElevated,
  },
  nextAccentRail: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: colors.primary,
  },
  nextGlow: {
    position: 'absolute',
    top: -36,
    right: -28,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 109, 114, 0.06)',
  },
  nextBody: {
    gap: 14,
    paddingLeft: 6,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 0,
  },
  nextLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  nextPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.85,
  },
  priorityBadge: {
    backgroundColor: colors.aqua,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    flexShrink: 0,
    maxWidth: '48%',
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  priorityBadgeProgress: {
    backgroundColor: colors.successBg,
    borderColor: '#A7F3D0',
  },
  priorityBadgeTextProgress: {
    color: '#065F46',
  },
  priorityBadgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  priorityBadgeTextPending: {
    color: '#92400E',
  },
  nextPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  nextAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.aqua,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nextAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  nextMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nextName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.45,
  },
  nextDemographics: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  nextTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
    minWidth: 0,
  },
  nextTime: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  complaintPlane: {
    backgroundColor: '#F4FBFA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D7ECEA',
    gap: 4,
  },
  complaintLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  complaintText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    fontWeight: '500',
  },
  nextActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    paddingLeft: 6,
  },
  nextActionsWrap: {
    flexWrap: 'wrap',
  },
  primaryAction: {
    flexGrow: 1.4,
    flexShrink: 1,
    flexBasis: 120,
    minWidth: 0,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  ghostAction: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 72,
    minWidth: 0,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  ghostActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 1,
  },
  actionFull: {
    flexBasis: '100%',
    width: '100%',
  },
  actionHalf: {
    flexBasis: '46%',
  },

  emptyNext: {
    backgroundColor: colors.aqua,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#B4E8E1',
    alignItems: 'center',
    gap: 8,
  },
  emptyNextIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNextTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyNextSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  emptyNextBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  emptyNextBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
    marginTop: 2,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.35,
  },
  sectionLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },

  agendaCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 63, 0.06)',
    paddingLeft: 10,
    paddingRight: 6,
    overflow: 'hidden',
    ...shadows.cardSoft,
  },
  agendaBody: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  agendaScroll: {
    flex: 1,
    maxHeight: 248,
    paddingRight: 4,
    minWidth: 0,
  },
  agendaScrollContent: {
    paddingBottom: 4,
  },
  agendaTrack: {
    width: 4,
    backgroundColor: '#E6F4F2',
    borderRadius: radius.pill,
    marginLeft: 4,
    marginRight: 2,
    alignSelf: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  agendaThumb: {
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 8,
    minWidth: 0,
  },
  agendaRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  agendaRowCompleted: {
    opacity: 0.62,
  },
  agendaTimeline: {
    width: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingTop: 12,
    flexShrink: 0,
  },
  agendaNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.mint,
  },
  agendaNodeDone: {
    backgroundColor: colors.textMuted,
    borderColor: colors.border,
  },
  agendaSpine: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  agendaAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  agendaAvatarCompleted: {
    backgroundColor: '#E2E8F0',
  },
  agendaAvatarInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  agendaInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  agendaName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  agendaNameCompleted: {
    color: colors.textSecondary,
  },
  agendaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  agendaTime: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    flexShrink: 0,
  },
  agendaDot: {
    fontSize: 10,
    color: colors.textMuted,
  },
  agendaMode: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
    flexShrink: 1,
  },
  agendaChipWrap: {
    flexShrink: 0,
    maxWidth: 104,
  },
  emptyAgenda: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyAgendaText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexShrink: 0,
    maxWidth: '52%',
  },
  weekPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    flexShrink: 1,
  },
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 63, 0.06)',
    ...shadows.cardSoft,
  },
  weekBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 108,
    minWidth: 0,
  },
  weekCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  weekValue: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  weekValueActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  weekTrack: {
    width: 12,
    height: 60,
    backgroundColor: '#EEF4F5',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weekFill: {
    width: '100%',
    backgroundColor: colors.iceBlue,
    borderRadius: 8,
  },
  weekFillActive: {
    backgroundColor: colors.primary,
  },
  weekDay: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  weekDayActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
