import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Image,
  Platform,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  Bell,
  Video,
  Building,
  Star,
  Users,
  Clock,
  MessageSquare,
  FileText,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapAppointment, mapDoctorProfile, formatDate } from '../../lib/mappers/doctorPortal';
import { useAuth } from '../../lib/auth/AuthContext';
import { StatusChip } from '../../components/StatusChip';
import GreenGradientHeader from '../../components/GreenGradientHeader';
import { colors, spacing, radius, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

export function DashboardScreen() {
  const { partner } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const [isOnline, setIsOnline] = useState(true);

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

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    statsQuery.refetch();
    apptQuery.refetch();
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
    const videoCount = appointments.filter((a: any) => a.isOnline || a.type?.toLowerCase().includes('video')).length;
    const inClinicCount = appointments.filter((a: any) => a.isInPerson || a.type?.toLowerCase().includes('clinic')).length;
    const ratingVal = raw.rating ? Number(raw.rating).toFixed(1) : '5.0';

    return {
      todayConsultations: totalToday,
      inClinic: inClinicCount,
      video: videoCount,
      rating: ratingVal,
    };
  }, [statsQuery.data, appointments]);

  const nextPatient = useMemo(() => {
    const found = appointments.find(
      (a: any) =>
        a.status === 'confirmed' ||
        a.status === 'in_progress' ||
        a.status === 'pending' ||
        a.status === 'upcoming',
    );
    if (found) {
      return {
        id: found.id,
        name: found.patient || 'Patient',
        time: found.time || '',
        date: found.date || 'Today',
        type: found.type?.toLowerCase().includes('clinic') ? 'In-Clinic' : 'Video Visit',
        priority: found.status === 'in_progress' ? 'In Progress' : 'Confirmed Visit',
        chiefComplaint: found.reason || 'Consultation',
        ageGender: 'Patient',
      };
    }
    return null;
  }, [appointments]);

  const agendaList = useMemo(() => {
    return appointments.slice(0, 10).map((a: any) => ({
      id: a.id,
      patient: a.patient || 'Patient',
      time: a.time || '',
      mode: a.type?.toLowerCase().includes('clinic') ? 'In-Clinic' : 'Video',
      status: a.status || 'confirmed',
    }));
  }, [appointments]);

  // Dynamic Weekly Distribution
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });
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
      count: counts[d],
      active: d === currentDayName,
    }));
  }, [appointments]);

  return (
    <View style={styles.root}>
      {/* Home header — shared L→R light→dark gradient */}
      <GreenGradientHeader style={[styles.headerSection, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerContent}>
        <View style={styles.headerTopRow}>
          {/* Avatar */}
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

          {/* Doctor Info */}
          <View style={styles.headerInfoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.doctorNameText} numberOfLines={1}>
                {profile.name || 'Doctor'}
              </Text>
              <BadgeCheck size={16} color={colors.mint} strokeWidth={2.5} />
            </View>
            <Text style={styles.specialtyText} numberOfLines={1}>
              {profile.specialty || 'Consultant Neurologist'}
            </Text>
          </View>

          {/* Notification Bell */}
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
            hitSlop={8}>
            <Bell size={20} color="#FFFFFF" strokeWidth={2} />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* Live Online/Offline Switch Bar */}
        <View style={styles.liveBar}>
          <View style={styles.liveLeft}>
            <View
              style={[
                styles.liveStatusDot,
                isOnline ? styles.liveStatusDotOn : styles.liveStatusDotOff,
              ]}
            />
            <Text style={styles.liveText}>
              {isOnline ? 'Online for Telehealth' : 'Offline'}
            </Text>
          </View>

          <View style={styles.switchWrapper}>
            <Text style={styles.switchLabel}>{isOnline ? 'Active' : 'Paused'}</Text>
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
        </View>
      </GreenGradientHeader>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
        refreshControl={
          <RefreshControl
            refreshing={apptQuery.isRefetching || statsQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {/* Practice summary — featured total + mode breakdown */}
        <View style={styles.summaryPanel}>
          <View style={styles.summaryHero}>
            <Text style={styles.summaryEyebrow}>Today</Text>
            <Text style={styles.summaryHeroValue}>{stats.todayConsultations}</Text>
            <Text style={styles.summaryHeroLabel}>Consultations</Text>
            <View style={styles.summaryRatingChip}>
              <Star size={12} color={colors.warning} strokeWidth={2.2} fill={colors.warning} />
              <Text style={styles.summaryRatingText}>{stats.rating}</Text>
            </View>
          </View>

          <View style={styles.summaryModes}>
            <View style={styles.summaryModeRow}>
              <View style={[styles.summaryModeIcon, { backgroundColor: colors.mint }]}>
                <Building size={16} color={colors.primaryDark} strokeWidth={2.2} />
              </View>
              <View style={styles.summaryModeCopy}>
                <Text style={styles.summaryModeLabel}>In-Clinic</Text>
                <Text style={styles.summaryModeHint}>In-person visits</Text>
              </View>
              <Text style={styles.summaryModeValue}>{stats.inClinic}</Text>
            </View>

            <View style={styles.summaryModeDivider} />

            <View style={styles.summaryModeRow}>
              <View style={[styles.summaryModeIcon, { backgroundColor: colors.infoBg }]}>
                <Video size={16} color={colors.info} strokeWidth={2.2} />
              </View>
              <View style={styles.summaryModeCopy}>
                <Text style={styles.summaryModeLabel}>Video</Text>
                <Text style={styles.summaryModeHint}>Telehealth calls</Text>
              </View>
              <Text style={styles.summaryModeValue}>{stats.video}</Text>
            </View>
          </View>
        </View>

        {/* Dominant Next Patient Hero Card */}
        {nextPatient ? (
          <View style={styles.heroCard}>
            {/* Header Row: Label & Mode Badge */}
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroLabelRow}>
                <View style={styles.pulseLiveDot} />
                <Text style={styles.heroSectionTitle}>NEXT PATIENT</Text>
              </View>
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityBadgeText}>{nextPatient.priority}</Text>
              </View>
            </View>

            {/* Patient Details Row */}
            <View style={styles.heroPatientRow}>
              <View style={[styles.heroPatientAvatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(nextPatient.name || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.heroPatientMetaCol}>
                <Text style={styles.heroPatientName}>{nextPatient.name}</Text>
                <Text style={styles.heroPatientDemographics}>
                  {nextPatient.ageGender} • {nextPatient.type}
                </Text>
                <View style={styles.heroTimeRow}>
                  <Clock size={12} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.heroTimeText}>
                    {nextPatient.date} • {nextPatient.time}
                  </Text>
                </View>
              </View>
            </View>

            {/* Chief Complaint Box */}
            <View style={styles.complaintBox}>
              <Text style={styles.complaintLabel}>Chief Complaint:</Text>
              <Text style={styles.complaintText} numberOfLines={2}>
                {nextPatient.chiefComplaint}
              </Text>
            </View>

            {/* Clinical Action Buttons */}
            <View style={styles.heroActionsRow}>
              <Pressable
                style={styles.startConsultBtn}
                onPress={() =>
                  navigation.navigate('Video', {
                    appointmentId: nextPatient.id,
                    patientName: nextPatient.name,
                  })
                }>
                <Video size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.startConsultBtnText}>Start Consult</Text>
              </Pressable>

              <Pressable
                style={styles.iconOutlineBtn}
                onPress={() =>
                  navigation.navigate('Chat', {
                    appointmentId: nextPatient.id,
                    patientName: nextPatient.name,
                  })
                }
                accessibilityLabel="Open Chat">
                <MessageSquare size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.iconOutlineBtnText}>Chat</Text>
              </Pressable>

              <Pressable
                style={styles.iconOutlineBtn}
                onPress={() =>
                  navigation.navigate('Consultation', {
                    appointmentId: nextPatient.id,
                    patientName: nextPatient.name,
                  })
                }
                accessibilityLabel="View Records">
                <FileText size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.iconOutlineBtnText}>Records</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyHeroCard}>
            <View style={styles.emptyHeroIconCircle}>
              <Users size={22} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyHeroTitle}>No Patient In Waiting Queue</Text>
            <Text style={styles.emptyHeroSub}>
              You have no upcoming consultations in queue right now.
            </Text>
            <Pressable
              style={styles.emptyHeroBtn}
              onPress={() => (navigation as any).navigate('Appointments')}>
              <Text style={styles.emptyHeroBtnText}>View Appointments Calendar &gt;</Text>
            </Pressable>
          </View>
        )}

        {/* Today's Agenda Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>Today's Agenda</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Pressable onPress={() => navigation.navigate('FollowUps')}>
              <Text style={styles.sectionLinkText}>Follow-ups</Text>
            </Pressable>
            <Pressable onPress={() => (navigation as any).navigate('Appointments')}>
              <Text style={styles.sectionLinkText}>See All &gt;</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.agendaCard}>
          {agendaList.length === 0 ? (
            <View style={styles.emptyAgendaWrap}>
              <Clock size={24} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.emptyAgendaText}>No appointments scheduled on your agenda</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.agendaScroll}
              contentContainerStyle={styles.agendaScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={true}
              bounces={agendaList.length > 3}>
              {agendaList.map((item: any, idx: number) => {
                const isLast = idx === agendaList.length - 1;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.agendaRow, !isLast && styles.agendaRowBorder]}
                    onPress={() =>
                      navigation.navigate('AppointmentDetail', {
                        appointmentId: item.id,
                      })
                    }>
                    <View style={[styles.agendaAvatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitialSmall}>
                        {(item.patient || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.agendaInfoCol}>
                      <Text style={styles.agendaPatientName}>{item.patient}</Text>
                      <View style={styles.agendaMetaRow}>
                        <Clock size={11} color={colors.textMuted} strokeWidth={2} />
                        <Text style={styles.agendaTimeText}>{item.time}</Text>
                        <Text style={styles.agendaDot}>•</Text>
                        <Text style={styles.agendaModeText}>{item.mode}</Text>
                      </View>
                    </View>

                    <StatusChip status={item.status} />
                    <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Weekly Overview Trend Chart */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>Weekly Overview</Text>
          <View style={styles.weeklyGrowthPill}>
            <TrendingUp size={12} color={colors.success} strokeWidth={2.2} />
            <Text style={styles.weeklyGrowthText}>From your appointments</Text>
          </View>
        </View>

        <View style={styles.weeklyChartCard}>
          <View style={styles.barsContainer}>
            {weeklyData.map(item => (
              <View key={item.day} style={styles.barColumn}>
                <Text
                  style={[
                    styles.barValueText,
                    item.active && styles.barValueTextActive,
                  ]}>
                  {item.count}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.min(100, (item.count / 30) * 100)}%` },
                      item.active && styles.barFillActive,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barDayText,
                    item.active && styles.barDayTextActive,
                  ]}>
                  {item.day}
                </Text>
              </View>
            ))}
          </View>
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

  /* Header — shared GreenGradientHeader fill */
  headerSection: {
    paddingBottom: 14,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerContent: {
    paddingHorizontal: 20,
    gap: 10,
  },

  /* Live Online/Offline Bar */
  liveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  doctorAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  avatarFallback: {
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  avatarInitialSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    gap: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  doctorNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  specialtyText: {
    fontSize: 11,
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
    position: 'relative',
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


  liveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveStatusDotOn: {
    backgroundColor: colors.mint,
  },
  liveStatusDotOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  /* Practice summary panel */
  summaryPanel: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  summaryHero: {
    width: '38%',
    backgroundColor: colors.aqua,
    borderRightWidth: 1,
    borderRightColor: '#B4E8E1',
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
    gap: 2,
  },
  summaryEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryHeroValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -1,
    marginTop: 2,
  },
  summaryHeroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryRatingChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  summaryRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryModes: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 8,
  },
  summaryModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryModeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryModeCopy: {
    flex: 1,
    gap: 1,
  },
  summaryModeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryModeHint: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  summaryModeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    minWidth: 28,
    textAlign: 'right',
  },
  summaryModeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 44,
  },

  /* Dominant Next Patient Hero Card — clear teal theme */
  heroCard: {
    backgroundColor: colors.aqua,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: 12,
    ...shadows.cardElevated,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  heroSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  priorityBadge: {
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  heroPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroPatientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  heroPatientMetaCol: {
    flex: 1,
    gap: 2,
  },
  heroPatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  heroPatientDemographics: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  heroTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  heroTimeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  complaintBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#B4E8E1',
    gap: 2,
  },
  complaintLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  complaintText: {
    fontSize: 11,
    color: colors.textPrimary,
    lineHeight: 15,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  startConsultBtn: {
    flex: 1.4,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  startConsultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iconOutlineBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconOutlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Agenda Section */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  weeklyGrowthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  weeklyGrowthText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  agendaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    overflow: 'hidden',
    ...shadows.cardSoft,
  },
  agendaScroll: {
    maxHeight: 240,
  },
  agendaScrollContent: {
    paddingBottom: 4,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  agendaRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  agendaAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  agendaInfoCol: {
    flex: 1,
    gap: 2,
  },
  agendaPatientName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  agendaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agendaTimeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  agendaDot: {
    fontSize: 10,
    color: colors.textMuted,
  },
  agendaModeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryLight,
  },

  /* Weekly Overview Chart */
  weeklyChartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.cardSoft,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barValueText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  barValueTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  barTrack: {
    width: 14,
    height: 60,
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.iceBlue,
    borderRadius: radius.xs,
  },
  barFillActive: {
    backgroundColor: colors.primary,
  },
  barDayText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  barDayTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* Empty State Styles */
  emptyHeroCard: {
    backgroundColor: colors.aqua,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.cardSoft,
  },
  emptyHeroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyHeroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyHeroSub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  emptyHeroBtn: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  emptyHeroBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyAgendaWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyAgendaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
