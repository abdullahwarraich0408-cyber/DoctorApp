import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  Video,
  Clock,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Calendar,
  FileText,
  CheckCircle2,
  CalendarCheck,
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

export function ConsultTabScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const apptQuery = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => doctorPortalApi.getAppointments(),
    refetchInterval: 15_000,
  });

  const appointments = useMemo(
    () =>
      (
        Array.isArray(apptQuery.data)
          ? apptQuery.data
          : apptQuery.data?.appointments || []
      ).map(mapAppointment),
    [apptQuery.data],
  );

  const todayKey = toLocalDateKey(new Date());

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Filter ONLY Video Consultations for PRESENT DATE (Today)
  const todayVideoAppts = useMemo(() => {
    const statusRank: Record<string, number> = {
      in_progress: 1,
      checked_in: 2,
      confirmed: 3,
      pending: 4,
      booked: 5,
      completed: 6,
      cancelled: 7,
    };

    return appointments
      .filter((a: any) => {
        const isVideo =
          a.type?.toLowerCase().includes('video') ||
          a.consultation_mode === 'video' ||
          a.isOnline;
        const apptDateKey = toLocalDateKey(a.dateRaw);
        return isVideo && apptDateKey === todayKey;
      })
      .sort((a: any, b: any) => {
        const rankA = statusRank[a.status] || 99;
        const rankB = statusRank[b.status] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [appointments, todayKey]);

  // Determine the Next / Active Patient for Today
  const nextPatient = useMemo(() => {
    return (
      todayVideoAppts.find((a: any) => a.status === 'in_progress') ||
      todayVideoAppts.find((a: any) => a.status === 'checked_in') ||
      todayVideoAppts.find((a: any) => a.status === 'confirmed') ||
      todayVideoAppts.find((a: any) => a.status === 'pending' || a.status === 'booked')
    );
  }, [todayVideoAppts]);

  const completedCount = useMemo(
    () => todayVideoAppts.filter((a: any) => a.status === 'completed').length,
    [todayVideoAppts],
  );
  const remainingCount = todayVideoAppts.length - completedCount;

  return (
    <View style={styles.root}>
      <TabScreenHeader
        title="Live Consultations"
        subtitle={`Virtual Clinic • ${todayFormatted}`}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={apptQuery.isRefetching}
            onRefresh={() => apptQuery.refetch()}
            tintColor={colors.primary}
          />
        }>
        {/* Today's Video Metrics Strip */}
        <View style={styles.metricsStrip}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{todayVideoAppts.length}</Text>
            <Text style={styles.metricLabel}>Today's Video</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {remainingCount}
            </Text>
            <Text style={styles.metricLabel}>Upcoming</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {completedCount}
            </Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>
        </View>

        {/* If NO video sessions scheduled for today, show ONLY ONE clear, informative empty card */}
        {todayVideoAppts.length === 0 ? (
          <View style={styles.singleEmptyCard}>
            <View style={styles.singleEmptyIconCircle}>
              <Video size={28} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.singleEmptyTitle}>No Video Sessions So Far Today</Text>
            <Text style={styles.singleEmptySub}>
              You have no virtual consultations scheduled so far for today ({todayFormatted}). In-clinic appointments or upcoming dates can be checked in your calendar.
            </Text>
            <Pressable
              style={styles.singleEmptyBtn}
              onPress={() => (navigation as any).navigate('Appointments')}>
              <Text style={styles.singleEmptyBtnText}>View Appointments Calendar &gt;</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Hero Card: Next Video Patient / All Completed */}
            {nextPatient ? (
              <View style={styles.heroCard}>
                {/* Header: Live Badge + Time */}
                <View style={styles.heroHeaderRow}>
                  <View style={styles.heroBadgeRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.heroBadgeText}>NEXT VIDEO PATIENT</Text>
                  </View>
                  <View style={styles.heroTimeBadge}>
                    <Clock size={12} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.heroTimeText}>{nextPatient.time || 'Scheduled'}</Text>
                  </View>
                </View>

                {/* Patient Info Row */}
                <Pressable
                  style={styles.heroPatientRow}
                  onPress={() =>
                    navigation.navigate('AppointmentDetail', {
                      appointmentId: nextPatient.id,
                    })
                  }>
                  <View style={styles.heroAvatar}>
                    <Text style={styles.heroAvatarInitial}>
                      {(nextPatient.patient || 'P').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.heroPatientCol}>
                    <View style={styles.heroNameRow}>
                      <Text style={styles.heroPatientName} numberOfLines={1}>
                        {nextPatient.patient}
                      </Text>
                      <StatusChip status={nextPatient.status} />
                    </View>
                    <Text style={styles.heroDemographicsText}>
                      {[
                        nextPatient.raw?.customer?.profile_data?.age
                          ? `${nextPatient.raw.customer.profile_data.age} Y`
                          : null,
                        nextPatient.raw?.customer?.profile_data?.gender || null,
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'Patient • Video Consultation'}
                    </Text>
                  </View>
                </Pressable>

                {/* Chief Complaint Callout */}
                <View style={styles.chiefComplaintBox}>
                  <Text style={styles.chiefComplaintLabel}>CHIEF COMPLAINT:</Text>
                  <Text style={styles.chiefComplaintText} numberOfLines={2}>
                    {nextPatient.reason || 'General virtual consultation & follow-up'}
                  </Text>
                </View>

                {/* Clinical Actions Row */}
                <View style={styles.heroActionsRow}>
                  <Pressable
                    style={styles.joinPrimaryBtn}
                    onPress={() =>
                      navigation.navigate('Video', {
                        appointmentId: nextPatient.id,
                        meetingUrl: nextPatient.meetingUrl,
                        patientName: nextPatient.patient,
                      })
                    }>
                    <Video size={17} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.joinPrimaryBtnText}>Join Video Call</Text>
                  </Pressable>

                  <Pressable
                    style={styles.heroOutlineBtn}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        appointmentId: nextPatient.id,
                        patientName: nextPatient.patient,
                      })
                    }
                    accessibilityLabel="Open Chat">
                    <MessageSquare size={16} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.heroOutlineBtnText}>Chat</Text>
                  </Pressable>

                  <Pressable
                    style={styles.heroOutlineBtn}
                    onPress={() =>
                      navigation.navigate('Consultation', {
                        appointmentId: nextPatient.id,
                        patientName: nextPatient.patient,
                        patientId: nextPatient.patientId,
                      })
                    }
                    accessibilityLabel="View Records">
                    <FileText size={16} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.heroOutlineBtnText}>Records</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.allCompletedCard}>
                <View style={styles.allCompletedIconCircle}>
                  <CheckCircle2 size={20} color={colors.success} strokeWidth={2.4} />
                </View>
                <View style={styles.allCompletedTextCol}>
                  <Text style={styles.allCompletedTitle}>
                    All Today's Video Consultations Completed
                  </Text>
                  <Text style={styles.allCompletedSub}>
                    You have finished all virtual sessions scheduled for today.
                  </Text>
                </View>
              </View>
            )}

            {/* Section Header: Today's Video Queue */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>Today's Video Queue</Text>
              <Text style={styles.sectionBadgeText}>
                {todayVideoAppts.length} Scheduled Today
              </Text>
            </View>

            {/* Video Appointments List */}
            <View style={styles.queueList}>
            {todayVideoAppts.map((appt: any) => {
              const isCompleted = appt.status === 'completed';

              return (
                <View
                  key={appt.id}
                  style={[
                    styles.apptCard,
                    isCompleted && styles.apptCardCompleted,
                  ]}>
                  {/* Top Bar: Time, Mode Badge, Status */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.timePill}>
                      <Clock size={12} color={colors.primary} strokeWidth={2.2} />
                      <Text style={styles.timePillText}>{appt.time || '10:00 AM'}</Text>
                    </View>

                    <View style={styles.modeTag}>
                      <Video size={12} color={colors.primaryDark} strokeWidth={2} />
                      <Text style={styles.modeTagText}>Video Call</Text>
                    </View>

                    {appt.isFollowUp && (
                      <View style={styles.followUpTag}>
                        <Text style={styles.followUpTagText}>Follow-Up</Text>
                      </View>
                    )}

                    <StatusChip status={appt.status} />
                  </View>

                  {/* Patient Info Row */}
                  <Pressable
                    style={styles.cardPatientRow}
                    onPress={() =>
                      navigation.navigate('AppointmentDetail', {
                        appointmentId: appt.id,
                      })
                    }>
                    <View
                      style={[
                        styles.patientAvatar,
                        isCompleted && styles.patientAvatarCompleted,
                      ]}>
                      <Text style={styles.patientAvatarInitial}>
                        {(appt.patient || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.patientInfoCol}>
                      <Text
                        style={[
                          styles.patientName,
                          isCompleted && styles.patientNameCompleted,
                        ]}>
                        {appt.patient || 'Patient'}
                      </Text>
                      <Text style={styles.patientReason} numberOfLines={1}>
                        {appt.reason || 'General Medical Consultation'}
                      </Text>
                    </View>

                    <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>

                  {/* Actions Row */}
                  <View style={styles.cardActionsRow}>
                    <Pressable
                      style={styles.cardSecondaryBtn}
                      onPress={() =>
                        navigation.navigate('Chat', {
                          appointmentId: appt.id,
                          patientName: appt.patient,
                        })
                      }>
                      <MessageSquare size={14} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.cardSecondaryBtnText}>Chat</Text>
                    </Pressable>

                    <Pressable
                      style={styles.cardSecondaryBtn}
                      onPress={() =>
                        navigation.navigate('Consultation', {
                          appointmentId: appt.id,
                          patientName: appt.patient,
                          patientId: appt.patientId,
                        })
                      }>
                      <FileText size={14} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.cardSecondaryBtnText}>Notes</Text>
                    </Pressable>

                    {isCompleted ? (
                      <View style={styles.completedPill}>
                        <CheckCircle2 size={13} color={colors.success} strokeWidth={2.2} />
                        <Text style={styles.completedPillText}>Completed</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.startVideoBtn}
                        onPress={() =>
                          navigation.navigate('Video', {
                            appointmentId: appt.id,
                            meetingUrl: appt.meetingUrl,
                            patientName: appt.patient,
                          })
                        }>
                        <Video size={13} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={styles.startVideoBtnText}>Join Video</Text>
                        <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.2} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

        {/* Security & HIPAA Compliance Notice */}
        <View style={styles.securityBanner}>
          <ShieldCheck size={18} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.securityText}>
            All video consultations and patient communications are end-to-end encrypted with HIPAA and GDPR medical compliance.
          </Text>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: TAB_BAR_CLEARANCE + 30,
    gap: 14,
  },

  /* Metrics Strip */
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.cardSoft,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  /* Hero Card: Next Video Patient */
  heroCard: {
    backgroundColor: colors.surface,
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
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  heroTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.aqua,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  heroTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  heroPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
  },
  heroAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  heroPatientCol: {
    flex: 1,
    gap: 3,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroPatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  heroDemographicsText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  chiefComplaintBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: 2,
  },
  chiefComplaintLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  chiefComplaintText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 16,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  joinPrimaryBtn: {
    flex: 2,
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  joinPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroOutlineBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroOutlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Single Empty State Card (When no video sessions exist today) */
  singleEmptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
    marginVertical: 4,
  },
  singleEmptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  singleEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  singleEmptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 8,
    lineHeight: 18,
  },
  singleEmptyBtn: {
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 18,
    backgroundColor: colors.aqua,
    borderRadius: radius.pill,
  },
  singleEmptyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  /* All Today's Consultations Completed Card */
  allCompletedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    ...shadows.cardSoft,
  },
  allCompletedIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allCompletedTextCol: {
    flex: 1,
    gap: 2,
  },
  allCompletedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  allCompletedSub: {
    fontSize: 11,
    color: '#15803D',
    lineHeight: 15,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Queue List */
  queueList: {
    gap: 12,
  },
  apptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
  },
  apptCardCompleted: {
    opacity: 0.72,
    backgroundColor: '#FAFBFD',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.aqua,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  followUpTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  followUpTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  cardPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  patientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarCompleted: {
    backgroundColor: '#E2E8F0',
  },
  patientAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  patientInfoCol: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  patientNameCompleted: {
    color: colors.textSecondary,
  },
  patientReason: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  cardSecondaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  startVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    ...shadows.cardSoft,
  },
  startVideoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  completedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },



  /* Security Banner */
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D4EFEF',
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: colors.primaryDark,
    lineHeight: 15,
  },
});
