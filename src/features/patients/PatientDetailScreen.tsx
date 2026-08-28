import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MoreVertical,
  Droplet,
  Phone,
  AlertTriangle,
  ChevronRight,
  Stethoscope,
  Calendar,
  Pill,
  FlaskConical,
  FileText,
  Send,
  MessageSquare,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { formatDate } from '../../lib/mappers/doctorPortal';
import { colors, radius, spacing, shadows } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

export function PatientDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PatientDetail'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'prescriptions' | 'labs'>('overview');

  const query = useQuery({
    queryKey: ['doctor-patient', route.params.patientId],
    queryFn: () => doctorPortalApi.getPatient(route.params.patientId),
  });

  const data = query.data;
  const patient = data?.patient || data?.customer;

  const patientName = patient?.name || 'Ayesha Malik';
  const patientPhone = patient?.phone || '+92 300 1234567';
  const patientEmail = patient?.email || 'ayesha.malik@example.com';
  const bloodGroup = patient?.blood_group || patient?.profile_data?.blood_group || 'B+ (Positive)';
  const ageGender = `${patient?.age || 32} Years • ${patient?.gender || 'Female'}`;

  const consultationsList = useMemo(() => {
    const raw = data?.consultations || data?.appointments || [];
    if (raw.length > 0) {
      return raw.map((c: any) => ({
        id: c.id,
        date: formatDate(c.appointment_date || c.created_at || c.date),
        time: c.slot || c.time || '10:00 AM',
        title: c.reason || c.diagnosis || 'Consultation Visit',
        doctor: c.doctor?.name ? `Dr. ${c.doctor.name}` : 'Dr. Sara Khan',
        notes: c.clinical_notes || c.consultation_notes || 'Patient reviewed and prescribed necessary care plan.',
        status: c.status || 'completed',
      }));
    }
    return [
      {
        id: 'c1',
        date: '20 May 2024',
        time: '10:00 AM',
        title: 'Migraine Follow-up',
        doctor: 'Dr. Sara Khan • Neurology',
        notes: 'Patient reports reduced frequency of migraines. Continue current medication and avoid known triggers.',
        status: 'completed',
      },
      {
        id: 'c2',
        date: '05 Apr 2024',
        time: '11:30 AM',
        title: 'Acute Migraine',
        doctor: 'Dr. Sara Khan • Neurology',
        notes: 'Severe headache with nausea. Prescribed medication and rest advised.',
        status: 'in_progress',
      },
    ];
  }, [data]);

  const prescriptionsList = useMemo(() => {
    const raw = data?.prescriptions || [];
    if (raw.length > 0) {
      return raw;
    }
    return [
      {
        id: 'p1',
        date: '20 May 2024',
        doctor: 'Dr. Sara Khan',
        items: [
          { name: 'Tab. Sumatriptan 50mg', freq: 'As needed' },
          { name: 'Tab. Naproxen 250mg', freq: 'After food, twice daily' },
        ],
      },
    ];
  }, [data]);

  const labsList = useMemo(() => {
    const raw = data?.lab_orders || data?.labOrders || [];
    if (raw.length > 0) {
      return raw.map((l: any) => ({
        id: l.id,
        name: l.lab_test?.name || l.name || 'Diagnostic Panel',
        date: formatDate(l.created_at || l.date),
        status: l.status || 'Normal',
      }));
    }
    return [
      { id: 'l1', name: 'CBC (Complete Blood Count)', date: '18 May 2024', status: 'Normal' },
      { id: 'l2', name: 'Vitamin D', date: '18 May 2024', status: 'Low' },
      { id: 'l3', name: 'Thyroid Profile', date: '10 Mar 2024', status: 'Normal' },
    ];
  }, [data]);

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

          <Text style={styles.headerTitle}>Patient Record</Text>

          <Pressable
            style={styles.headerIconBtn}
            accessibilityLabel="Options"
            hitSlop={8}>
            <MoreVertical size={22} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Patient Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
              }}
              style={styles.avatarImg}
            />
            <View style={styles.onlineBadgeDot} />
          </View>

          <View style={styles.profileMetaCol}>
            <Text style={styles.patientNameText}>{patientName}</Text>
            <Text style={styles.demographicsText}>{ageGender}</Text>

            <View style={styles.bloodGroupRow}>
              <Droplet size={13} color={colors.danger} strokeWidth={2.2} />
              <Text style={styles.bloodGroupText}>{bloodGroup}</Text>
            </View>

            <Text style={styles.patientIdText}>ID: {route.params.patientId?.slice(-8) || 'MD-07123'}</Text>
          </View>

          <Pressable
            style={styles.contactBtnWrap}
            onPress={() =>
              Alert.alert(
                'Contact Patient',
                `Reach out to ${patientName} at ${patientPhone}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call Now', onPress: () => {} },
                ],
              )
            }>
            <View style={styles.contactIconCircle}>
              <Phone size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.contactBtnLabel}>Contact</Text>
          </Pressable>
        </View>

        {/* Clinical Allergies & Warnings Banner */}
        <Pressable
          style={styles.alertBanner}
          onPress={() =>
            Alert.alert(
              'Allergies & Clinical Warnings',
              'Patient has severe allergic reactions to Penicillin and Pollen.\n\nKnown migraine triggers: Bright light, stress, lack of sleep.',
            )
          }>
          <AlertTriangle size={18} color={colors.danger} strokeWidth={2.2} />
          <View style={styles.alertTextCol}>
            <Text style={styles.alertTitle}>Allergies & Warnings</Text>
            <Text style={styles.alertSub} numberOfLines={1}>
              Allergic to Penicillin, Pollen • Triggers: Bright light, stress
            </Text>
          </View>
          <ChevronRight size={18} color={colors.danger} strokeWidth={2} />
        </Pressable>

        {/* Horizontal Segmented Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}>
            {(
              [
                { key: 'overview', label: 'Overview', IconComp: Stethoscope },
                { key: 'consultations', label: 'Consultations', IconComp: Calendar },
                { key: 'prescriptions', label: 'Prescriptions', IconComp: Pill },
                { key: 'labs', label: 'Lab Results', IconComp: FlaskConical },
              ] as const
            ).map(tab => {
              const isActive = activeTab === tab.key;
              const IconComponent = tab.IconComp;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tabChip, isActive && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab.key)}>
                  <IconComponent
                    size={14}
                    color={isActive ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.tabChipText,
                      isActive && styles.tabChipTextActive,
                    ]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Consultation Timeline Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Consultation Timeline ({consultationsList.length})</Text>
          <Pressable
            onPress={() =>
              (navigation as any).navigate('Appointments')
            }>
            <Text style={styles.viewHistoryLink}>View All &gt;</Text>
          </Pressable>
        </View>

        <View style={styles.timelineCard}>
          {consultationsList.map((item: any, idx: number) => {
            const isLast = idx === consultationsList.length - 1;
            const isCompleted = item.status === 'completed';

            return (
              <View key={item.id} style={[styles.timelineEventRow, isLast && { paddingBottom: 0 }]}>
                <View style={styles.timelineColLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: isCompleted ? colors.success : colors.warning },
                    ]}
                  />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineContent}>
                  <View style={styles.eventDateRow}>
                    <Text style={styles.eventDateText}>{item.date}</Text>
                    <Text style={styles.eventTimeText}>{item.time}</Text>
                    <View
                      style={
                        isCompleted
                          ? styles.statusPillCompleted
                          : styles.statusPillProgress
                      }>
                      <Text
                        style={
                          isCompleted
                            ? styles.statusPillTextCompleted
                            : styles.statusPillTextProgress
                        }>
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventDoctor}>{item.doctor}</Text>
                  <Text style={styles.eventNotes}>{item.notes}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Side-by-Side Summary Cards: Latest Prescription & Recent Lab Results */}
        <View style={styles.twoColumnRow}>
          {/* Left Card: Latest Prescription */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeaderRow}>
              <Text style={styles.summaryTitle}>Prescription</Text>
              <Pressable
                onPress={() =>
                  navigation.navigate('Prescription', {
                    appointmentId: route.params.patientId,
                    patientName,
                  })
                }>
                <Text style={styles.summaryLink}>+ Create</Text>
              </Pressable>
            </View>

            <View style={styles.rxInnerCard}>
              <View style={styles.rxIconWrap}>
                <FileText size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={{ gap: 1 }}>
                <Text style={styles.rxDateText}>Latest Rx</Text>
                <Text style={styles.rxDoctorText}>Dr. Sara Khan</Text>
              </View>
            </View>

            <View style={styles.medBulletList}>
              <Text style={styles.medBulletText}>• Sumatriptan 50mg</Text>
              <Text style={styles.medSubText}>As needed</Text>
              <Text style={styles.medBulletText}>• Domperidone 10mg</Text>
              <Text style={styles.medSubText}>Twice daily</Text>
            </View>

            <Pressable
              style={styles.sendRxMiniBtn}
              onPress={() =>
                navigation.navigate('Prescription', {
                  appointmentId: route.params.patientId,
                  patientName,
                })
              }>
              <Send size={12} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sendRxMiniBtnText}>Send Rx</Text>
            </Pressable>
          </View>

          {/* Right Card: Recent Lab Results */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeaderRow}>
              <Text style={styles.summaryTitle}>Lab Results</Text>
              <Pressable onPress={() => setActiveTab('labs')}>
                <Text style={styles.summaryLink}>View All</Text>
              </Pressable>
            </View>

            <View style={styles.labResultsList}>
              {labsList.map((lab: any) => (
                <View key={lab.id} style={styles.labRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.labNameText}>{lab.name}</Text>
                    <Text style={styles.labDateText}>{lab.date}</Text>
                  </View>
                  <View
                    style={
                      lab.status === 'Normal'
                        ? styles.labPillNormal
                        : styles.labPillLow
                    }>
                    <Text
                      style={
                        lab.status === 'Normal'
                          ? styles.labPillTextNormal
                          : styles.labPillTextLow
                      }>
                      {lab.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.barOutlineBtn}
          onPress={() =>
            navigation.navigate('Consultation', {
              appointmentId: route.params.patientId,
              patientName,
            })
          }>
          <FileText size={14} color={colors.primary} strokeWidth={2} />
          <Text style={styles.barOutlineBtnText}>Case Sheet</Text>
        </Pressable>

        <Pressable
          style={styles.barOutlineBtn}
          onPress={() =>
            navigation.navigate('Chat', {
              appointmentId: route.params.patientId,
              patientName,
            })
          }>
          <MessageSquare size={14} color={colors.primary} strokeWidth={2} />
          <Text style={styles.barOutlineBtnText}>Start Chat</Text>
        </Pressable>

        <Pressable
          style={styles.barSolidBtn}
          onPress={() =>
            navigation.navigate('Prescription', {
              appointmentId: route.params.patientId,
              patientName,
            })
          }>
          <Send size={14} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.barSolidBtnText}>Send Rx</Text>
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
    paddingBottom: 96,
    gap: 14,
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
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Profile Demographics Card */
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileMetaCol: {
    flex: 1,
    gap: 2,
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  demographicsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bloodGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  bloodGroupText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  patientIdText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  contactBtnWrap: {
    alignItems: 'center',
    gap: 2,
  },
  contactIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },

  /* Allergies Banner */
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  alertTextCol: {
    flex: 1,
    gap: 1,
  },
  alertTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  alertSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  /* Tabs Bar */
  tabsContainer: {
    marginVertical: -2,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: {
    backgroundColor: colors.aqua,
    borderColor: '#C8EDE9',
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* Consultation Timeline */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewHistoryLink: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.cardSoft,
  },
  timelineEventRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 14,
  },
  timelineColLeft: {
    alignItems: 'center',
    width: 14,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    gap: 3,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  eventTimeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  statusPillCompleted: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.xs,
    marginLeft: 'auto',
  },
  statusPillTextCompleted: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  statusPillProgress: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.xs,
    marginLeft: 'auto',
  },
  statusPillTextProgress: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.warning,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  eventDoctor: {
    fontSize: 10,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  eventNotes: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
    marginTop: 2,
  },

  /* Side-by-Side Summary Row */
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    ...shadows.cardSoft,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryLink: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  rxInnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    padding: 6,
    borderRadius: radius.sm,
  },
  rxIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rxDoctorText: {
    fontSize: 9,
    color: colors.textMuted,
  },
  medBulletList: {
    gap: 2,
  },
  medBulletText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  medSubText: {
    fontSize: 9,
    color: colors.textMuted,
    marginLeft: 8,
    marginBottom: 2,
  },
  sendRxMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#C8EDE9',
    borderRadius: radius.xs,
    paddingVertical: 5,
    marginTop: 2,
  },
  sendRxMiniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Lab Results */
  labResultsList: {
    gap: 6,
  },
  labRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labNameText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labDateText: {
    fontSize: 9,
    color: colors.textMuted,
  },
  labPillNormal: {
    backgroundColor: colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  labPillTextNormal: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  labPillLow: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  labPillTextLow: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.warning,
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    flexDirection: 'row',
    gap: 8,
    ...shadows.cardElevated,
  },
  barOutlineBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  barOutlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  barSolidBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    ...shadows.cardSoft,
  },
  barSolidBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
