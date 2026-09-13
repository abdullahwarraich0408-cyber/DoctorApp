import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Video,
  Clock,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapAppointment } from '../../lib/mappers/doctorPortal';
import { StatusChip } from '../../components/StatusChip';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import GreenGradientHeader from '../../components/GreenGradientHeader';
import type { RootStackParamList } from '../../navigation/types';

export function ConsultTabScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const apptQuery = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => doctorPortalApi.getAppointments(),
  });

  const appointments = (
    Array.isArray(apptQuery.data)
      ? apptQuery.data
      : apptQuery.data?.appointments || []
  ).map(mapAppointment);

  const activeOrNext = appointments.find(
    (a: any) => a.status === 'in_progress' || a.status === 'confirmed',
  );

  const videoAppts = appointments.filter(
    (a: any) => a.type?.toLowerCase().includes('video') || a.consultation_mode === 'video',
  );

  return (
    <View style={styles.root}>

      {/* Header */}
      <GreenGradientHeader style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={styles.headerTitle}>Live Consultations</Text>
        <Text style={styles.headerSub}>Telehealth room & virtual clinical care center</Text>
      </GreenGradientHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={apptQuery.isRefetching}
            onRefresh={() => apptQuery.refetch()}
            tintColor={colors.primary}
          />
        }>
        {/* Quick Launch Room Card */}
        <View style={styles.launchCard}>
          <View style={styles.launchIconCircle}>
            <Video size={28} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.launchTitle}>Virtual Consultation Room</Text>
          <Text style={styles.launchSub}>
            {activeOrNext
              ? `Next patient: ${activeOrNext.patient || 'Patient'}`
              : 'Launch your secure encrypted video room'}
          </Text>

          <Pressable
            style={styles.launchBtn}
            onPress={() => {
              if (activeOrNext?.id) {
                navigation.navigate('Video', {
                  appointmentId: activeOrNext.id,
                  patientName: activeOrNext.patient,
                });
              } else if (videoAppts.length > 0) {
                navigation.navigate('Video', {
                  appointmentId: videoAppts[0].id,
                  patientName: videoAppts[0].patient,
                });
              } else {
                (navigation as any).navigate('Appointments');
              }
            }}>
            <Video size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.launchBtnText}>
              {activeOrNext
                ? 'Join Virtual Session'
                : videoAppts.length > 0
                ? 'Open Next Video Visit'
                : 'View Scheduled Visits'}
            </Text>
          </Pressable>
        </View>

        {/* Video Appointments Queue */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Video Queue</Text>
          <Text style={styles.badgeText}>{videoAppts.length} Scheduled</Text>
        </View>

        {videoAppts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Video size={36} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.emptyText}>No video appointments in queue</Text>
          </View>
        ) : (
          <View style={styles.queueList}>
            {videoAppts.map((appt: any) => (
              <View key={appt.id} style={styles.apptCard}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{appt.patient || 'Patient'}</Text>
                    <Text style={styles.patientReason} numberOfLines={1}>
                      {appt.reason || 'General Consultation'}
                    </Text>
                  </View>
                  <StatusChip status={appt.status} />
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.timeRow}>
                    <Clock size={13} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.timeText}>{appt.time || '10:00 AM'}</Text>
                  </View>

                  <View style={styles.actionBtns}>
                    <Pressable
                      style={styles.chatIconBtn}
                      onPress={() =>
                        navigation.navigate('Chat', {
                          appointmentId: appt.id,
                          patientName: appt.patient,
                        })
                      }>
                      <MessageSquare size={16} color={colors.primary} strokeWidth={2} />
                    </Pressable>

                    <Pressable
                      style={styles.startBtn}
                      onPress={() =>
                        navigation.navigate('Video', {
                          appointmentId: appt.id,
                        })
                      }>
                      <Video size={14} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={styles.startBtnText}>Start</Text>
                      <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.2} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Telehealth Security Info */}
        <View style={styles.securityBanner}>
          <ShieldCheck size={18} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.securityText}>
            All video calls and chats are end-to-end encrypted with HIPAA and GDPR medical privacy standards.
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: TAB_BAR_CLEARANCE + 30,
    gap: 16,
  },
  launchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    ...shadows.cardElevated,
  },
  launchIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  launchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  launchSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 46,
    width: '100%',
    marginTop: 8,
    ...shadows.cardSoft,
  },
  launchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  patientReason: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  startBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
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
