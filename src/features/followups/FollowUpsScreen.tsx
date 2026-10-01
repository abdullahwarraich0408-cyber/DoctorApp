import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  XCircle,
  User,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { formatDate } from '../../lib/mappers/doctorPortal';
import TabScreenHeader from '../../components/TabScreenHeader';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'booked', label: 'Booked' },
];

function statusColor(status: string) {
  if (status === 'overdue') return colors.danger;
  if (status === 'booked' || status === 'completed') return colors.success;
  return colors.primary;
}

export function FollowUpsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const [tab, setTab] = useState('upcoming');

  const query = useQuery({
    queryKey: ['doctor-follow-ups', tab],
    queryFn: () => doctorPortalApi.getFollowUps({ status: tab }),
  });

  const remindMut = useMutation({
    mutationFn: (id: string) => doctorPortalApi.remindFollowUp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-follow-ups'] });
      Alert.alert('Reminder sent', 'The patient has been notified.');
    },
    onError: (err: Error) => Alert.alert('Could not remind', err.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => doctorPortalApi.cancelFollowUp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-follow-ups'] });
      Alert.alert('Follow-up cancelled');
    },
    onError: (err: Error) => Alert.alert('Could not cancel', err.message),
  });

  const items = useMemo(() => {
    const rows = query.data?.followUps || query.data?.follow_ups || [];
    return Array.isArray(rows) ? rows : [];
  }, [query.data]);

  return (
    <View style={styles.root}>
      <TabScreenHeader
        showBack
        title="Follow-ups"
        subtitle="Recommendations awaiting booking, overdue, or already booked"
      />

      <View style={styles.tabs}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: TAB_BAR_CLEARANCE + spacing.lg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }>
        {query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <CalendarClock size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No {tab} follow-ups</Text>
            <Text style={styles.emptySub}>
              Follow-ups appear here after you recommend one at visit completion.
            </Text>
          </View>
        ) : (
          items.map((fu: any) => {
            const patientName = fu.patient?.name || 'Patient';
            const bookedId = fu.booked_appointment_id;
            return (
              <View key={fu.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.patientRow}>
                    <View style={styles.avatar}>
                      <User size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{patientName}</Text>
                      <Text style={styles.meta}>
                        Recommended {formatDate(fu.recommended_date)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: `${statusColor(fu.status)}18` },
                      ]}>
                      <Text
                        style={[styles.statusText, { color: statusColor(fu.status) }]}>
                        {fu.status}
                      </Text>
                    </View>
                  </View>
                  {(fu.reason || fu.notes) && (
                    <Text style={styles.reason} numberOfLines={2}>
                      {fu.reason || fu.notes}
                    </Text>
                  )}
                  {fu.booking_window?.from && fu.booking_window?.to && (
                    <Text style={styles.window}>
                      Window {fu.booking_window.from} → {fu.booking_window.to}
                    </Text>
                  )}
                </View>

                <View style={styles.actions}>
                  {bookedId ? (
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() =>
                        navigation.navigate('AppointmentDetail', {
                          appointmentId: bookedId,
                        })
                      }>
                      <CheckCircle2 size={14} color="#fff" />
                      <Text style={styles.primaryBtnText}>Open appointment</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => remindMut.mutate(fu.id)}
                        disabled={remindMut.isPending}>
                        <Bell size={14} color={colors.primary} />
                        <Text style={styles.secondaryBtnText}>Remind</Text>
                      </Pressable>
                      <Pressable
                        style={styles.dangerBtn}
                        onPress={() =>
                          Alert.alert(
                            'Cancel follow-up?',
                            'Patient will no longer see this recommendation.',
                            [
                              { text: 'Keep', style: 'cancel' },
                              {
                                text: 'Cancel',
                                style: 'destructive',
                                onPress: () => cancelMut.mutate(fu.id),
                              },
                            ],
                          )
                        }>
                        <XCircle size={14} color={colors.danger} />
                        <Text style={styles.dangerBtnText}>End</Text>
                      </Pressable>
                    </>
                  )}
                  {fu.patient_id && (
                    <Pressable
                      style={styles.linkBtn}
                      onPress={() =>
                        navigation.navigate('PatientDetail', {
                          patientId: fu.patient_id,
                        })
                      }>
                      <Text style={styles.linkBtnText}>Patient</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mist },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardTop: { marginBottom: 12 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientName: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  reason: { marginTop: 10, fontSize: 13, color: colors.textMuted },
  window: { marginTop: 6, fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  secondaryBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.danger}12`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  dangerBtnText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  linkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  linkBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
});
