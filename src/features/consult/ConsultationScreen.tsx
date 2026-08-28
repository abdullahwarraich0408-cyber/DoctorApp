import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Pressable,
  Modal,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Image,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Video,
  FileText,
  Activity,
  Stethoscope,
  HeartPulse,
  Thermometer,
  Wind,
  Pill,
  FlaskConical,
  Calendar,
  CheckCircle2,
  Bookmark,
  Plus,
  Trash2,
  X,
  ChevronRight,
  ShieldCheck,
  FileSignature,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

interface RxItem {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const EMPTY_RX: RxItem = {
  medicine: '',
  dosage: '1 Tablet',
  frequency: 'Once daily',
  duration: '3 Days',
  instructions: 'Take after meals',
};

export function ConsultationScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Consultation'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const appointmentId = route.params.appointmentId;

  // Active sub-section tab: 'assessment' | 'vitals' | 'orders' | 'followup'
  const [activeTab, setActiveTab] = useState<'assessment' | 'vitals' | 'orders' | 'followup'>('assessment');

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('7 Days');
  const [hydrated, setHydrated] = useState(false);

  // Modals
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [rxItems, setRxItems] = useState<RxItem[]>([EMPTY_RX]);

  const query = useQuery({
    queryKey: ['doctor-consultation', appointmentId],
    queryFn: () => doctorPortalApi.getConsultation(appointmentId),
  });

  const labsQuery = useQuery({
    queryKey: ['lab-tests'],
    queryFn: () => doctorPortalApi.getLabTests(),
    enabled: labOpen,
  });

  const consultation = query.data?.consultation;
  const patient = query.data?.patient || query.data?.customer;
  const appointment = query.data?.appointment;

  const patientName =
    route.params.patientName ||
    patient?.name ||
    appointment?.patient ||
    'Patient';

  useEffect(() => {
    if (!query.data || hydrated) return;
    if (consultation?.symptoms || appointment?.reason) {
      setSymptoms(consultation?.symptoms || appointment?.reason || '');
    }
    if (consultation?.diagnosis) setDiagnosis(consultation.diagnosis);
    if (consultation?.clinical_notes || appointment?.consultation_notes) {
      setNotes(consultation?.clinical_notes || appointment?.consultation_notes || '');
    }
    if (consultation?.follow_up_date) {
      setFollowUp(String(consultation.follow_up_date).slice(0, 10));
    }
    setHydrated(true);
  }, [query.data, consultation, appointment, hydrated]);

  const saveMut = useMutation({
    mutationFn: () =>
      doctorPortalApi.updateConsultation(appointmentId, {
        symptoms,
        diagnosis,
        clinical_notes: notes,
        follow_up_date: followUp || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-consultation', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      Alert.alert('Draft Saved', 'Clinical documentation has been saved to patient case sheet.');
    },
    onError: (err: Error) => Alert.alert('Could not save', err.message),
  });

  const completeMut = useMutation({
    mutationFn: async () => {
      await doctorPortalApi.updateConsultation(appointmentId, {
        symptoms,
        diagnosis,
        clinical_notes: notes,
        follow_up_date: followUp || null,
      });
      return doctorPortalApi.updateAppointmentStatus(appointmentId, 'completed', notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-consultation', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
      Alert.alert('Consultation Completed', 'Visit completed and clinical notes archived successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: Error) => Alert.alert('Error completing visit', err.message),
  });

  const issueRxMut = useMutation({
    mutationFn: () => {
      const validItems = rxItems.filter(it => it.medicine.trim().length > 0);
      return doctorPortalApi.createPrescription({
        appointment_id: appointmentId,
        items: validItems,
        notes: notes || 'Take medications as prescribed.',
        sign: true,
      });
    },
    onSuccess: () => {
      setRxModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['doctor-consultation', appointmentId] });
      Alert.alert('Prescription Signed & Issued', 'E-Prescription delivered to patient vault.');
    },
    onError: (err: Error) => Alert.alert('Could not issue prescription', err.message),
  });

  const labMut = useMutation({
    mutationFn: (labTestId: string) =>
      doctorPortalApi.orderLabTest({
        appointment_id: appointmentId,
        lab_test_id: labTestId,
      }),
    onSuccess: () => {
      setLabOpen(false);
      queryClient.invalidateQueries({ queryKey: ['doctor-consultation', appointmentId] });
      Alert.alert('Lab Test Ordered', 'Diagnostic requisition submitted.');
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const labTests = useMemo(() => {
    const raw = labsQuery.data;
    return Array.isArray(raw) ? raw : raw?.tests || [
      { id: '1', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: '1,200' },
      { id: '2', name: 'HbA1c (Glycated Hemoglobin)', category: 'Diabetes', price: '1,800' },
      { id: '3', name: 'Lipid Profile', category: 'Cardiology', price: '2,200' },
      { id: '4', name: 'Serum Electrolytes', category: 'Biochemistry', price: '1,500' },
    ];
  }, [labsQuery.data]);

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

          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Clinical Case Sheet</Text>
            <Text style={styles.headerSub}>Consultation Workspace • ID: {appointmentId?.slice(-6) || '2024'}</Text>
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>In Session</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Patient Hero Card with 1-Tap Video Call Launch */}
          <View style={styles.patientHeroCard}>
            <View style={styles.patientHeroTop}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
                }}
                style={styles.patientAvatar}
              />
              <View style={styles.patientHeroMeta}>
                <Text style={styles.patientHeroName}>{patientName}</Text>
                <Text style={styles.patientHeroSub}>32 Years • Female • Blood Group B+</Text>
                <Text style={styles.patientVisitType}>Virtual Telehealth Consultation</Text>
              </View>
            </View>

            {/* Launch Live Video Call Banner Button */}
            <Pressable
              style={styles.videoLaunchBtn}
              onPress={() =>
                navigation.navigate('Video', {
                  appointmentId,
                  patientName,
                })
              }>
              <View style={styles.videoLaunchIconWrap}>
                <Video size={18} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.videoLaunchTitle}>Launch Live Video Call Stream</Text>
                <Text style={styles.videoLaunchSub}>Connect camera and microphone with patient</Text>
              </View>
              <View style={styles.videoLaunchPill}>
                <Text style={styles.videoLaunchPillText}>Open Call &gt;</Text>
              </View>
            </Pressable>
          </View>

          {/* Segmented Workspace Tabs */}
          <View style={styles.workspaceTabsRow}>
            {(
              [
                { key: 'assessment', label: 'Diagnosis & Notes', IconComp: Activity },
                { key: 'vitals', label: 'Recorded Vitals', IconComp: Stethoscope },
                { key: 'orders', label: 'Rx & Lab Orders', IconComp: Pill },
                { key: 'followup', label: 'Follow-up Plan', IconComp: Calendar },
              ] as const
            ).map(tab => {
              const isActive = activeTab === tab.key;
              const IconComp = tab.IconComp;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.workspaceTabPill, isActive && styles.workspaceTabPillActive]}
                  onPress={() => setActiveTab(tab.key)}>
                  <IconComp
                    size={13}
                    color={isActive ? colors.primary : colors.textMuted}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.workspaceTabText,
                      isActive && styles.workspaceTabTextActive,
                    ]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* TAB 1: Diagnosis & Notes */}
          {activeTab === 'assessment' && (
            <View style={styles.sectionContainer}>
              {/* Symptoms Field */}
              <View style={styles.formCard}>
                <Text style={styles.formCardLabel}>Symptoms & Chief Complaints</Text>
                <TextInput
                  style={styles.formCardInput}
                  value={symptoms}
                  onChangeText={setSymptoms}
                  placeholder="e.g. Severe headache, nausea, fever..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Provisional Diagnosis Field */}
              <View style={styles.formCard}>
                <Text style={styles.formCardLabel}>Clinical Diagnosis</Text>
                <TextInput
                  style={styles.formCardInput}
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  placeholder="e.g. Acute Migraine without aura (ICD-10: G43.0)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Clinical Notes & Treatment Plan */}
              <View style={styles.formCard}>
                <Text style={styles.formCardLabel}>Clinical Examination & Treatment Plan</Text>
                <TextInput
                  style={[styles.formCardInput, styles.notesAreaInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Record findings, examination notes, treatment steps and medical advice..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
            </View>
          )}

          {/* TAB 2: Recorded Vitals */}
          {activeTab === 'vitals' && (
            <View style={styles.sectionContainer}>
              <View style={styles.formCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.formCardLabel}>Patient Vitals Overview</Text>
                  <View style={styles.syncedBadge}>
                    <CheckCircle2 size={11} color={colors.success} strokeWidth={2.2} />
                    <Text style={styles.syncedBadgeText}>Synced</Text>
                  </View>
                </View>

                <View style={styles.vitalsGrid}>
                  <View style={styles.vitalTile}>
                    <HeartPulse size={18} color={colors.danger} strokeWidth={2.2} />
                    <Text style={styles.vitalValue}>120/80</Text>
                    <Text style={styles.vitalLabel}>mmHg • BP</Text>
                  </View>

                  <View style={styles.vitalTile}>
                    <Activity size={18} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.vitalValue}>72</Text>
                    <Text style={styles.vitalLabel}>bpm • Pulse</Text>
                  </View>

                  <View style={styles.vitalTile}>
                    <Thermometer size={18} color={colors.warning} strokeWidth={2.2} />
                    <Text style={styles.vitalValue}>98.6</Text>
                    <Text style={styles.vitalLabel}>°F • Temp</Text>
                  </View>

                  <View style={styles.vitalTile}>
                    <Wind size={18} color={colors.primaryLight} strokeWidth={2.2} />
                    <Text style={styles.vitalValue}>98%</Text>
                    <Text style={styles.vitalLabel}>SpO2 • Oxygen</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 3: Rx & Lab Orders */}
          {activeTab === 'orders' && (
            <View style={styles.sectionContainer}>
              {/* Prescribed Medications Card */}
              <View style={styles.formCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.formCardLabel}>Prescribed Medications ({rxItems.length})</Text>
                  <Pressable onPress={() => setRxModalOpen(true)}>
                    <Text style={styles.addOrderLink}>+ Edit Prescription</Text>
                  </Pressable>
                </View>

                {rxItems.map((med, idx) => (
                  <View key={idx} style={styles.medItemRow}>
                    <Pill size={16} color={colors.primary} strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.medItemName}>{med.medicine || 'Medicine Name'}</Text>
                      <Text style={styles.medItemDetails}>{med.dosage} • {med.frequency} • {med.duration}</Text>
                    </View>
                  </View>
                ))}

                <Pressable
                  style={styles.orderCtaBtn}
                  onPress={() => setRxModalOpen(true)}>
                  <Pill size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.orderCtaBtnText}>Open E-Prescription Builder</Text>
                </Pressable>
              </View>

              {/* Lab Tests Card */}
              <View style={styles.formCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.formCardLabel}>Diagnostic Lab Requisitions</Text>
                  <Pressable onPress={() => setLabOpen(true)}>
                    <Text style={styles.addOrderLink}>+ Add Test</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={styles.orderCtaBtn}
                  onPress={() => setLabOpen(true)}>
                  <FlaskConical size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.orderCtaBtnText}>Order Diagnostic Lab Tests</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* TAB 4: Follow-up Plan */}
          {activeTab === 'followup' && (
            <View style={styles.sectionContainer}>
              <View style={styles.formCard}>
                <Text style={styles.formCardLabel}>Recommended Follow-up Timeline</Text>
                <View style={styles.followupChipsRow}>
                  {['3 Days', '7 Days', '2 Weeks', '1 Month'].map(dur => (
                    <Pressable
                      key={dur}
                      style={[
                        styles.followupChip,
                        followUp === dur && styles.followupChipActive,
                      ]}
                      onPress={() => setFollowUp(dur)}>
                      <Text
                        style={[
                          styles.followupChipText,
                          followUp === dur && styles.followupChipTextActive,
                        ]}>
                        {dur}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Compliance Banner */}
          <View style={styles.complianceRow}>
            <ShieldCheck size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.complianceText}>All clinical records comply with medical documentation standards</Text>
          </View>
        </ScrollView>

        {/* Persistent Bottom Actions Bar */}
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.saveDraftBtn}
            onPress={() => saveMut.mutate()}
            disabled={saveMut.isPending}>
            <Bookmark size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.saveDraftBtnText}>Save Notes</Text>
          </Pressable>

          <Pressable
            style={styles.completeBtn}
            onPress={() =>
              Alert.alert(
                'Complete Consultation',
                'Are you sure you want to finalize and close this consultation case sheet?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'End & Complete', style: 'default', onPress: () => completeMut.mutate() },
                ],
              )
            }
            disabled={completeMut.isPending}>
            <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.completeBtnText}>
              {completeMut.isPending ? 'Completing...' : 'Complete Consultation'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Prescription Builder Modal */}
      <Modal
        visible={rxModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRxModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pill size={20} color={colors.primary} strokeWidth={2} />
                <Text style={styles.modalTitle}>Prescribe Medications</Text>
              </View>
              <Pressable onPress={() => setRxModalOpen(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {rxItems.map((item, idx) => (
                <View key={idx} style={styles.modalRxCard}>
                  <View style={styles.modalRxTop}>
                    <Text style={styles.modalRxNum}>Medicine #{idx + 1}</Text>
                    {rxItems.length > 1 && (
                      <Pressable
                        onPress={() =>
                          setRxItems(prev => prev.filter((_, i) => i !== idx))
                        }>
                        <Trash2 size={16} color={colors.danger} strokeWidth={2} />
                      </Pressable>
                    )}
                  </View>

                  <TextInput
                    style={styles.modalInput}
                    value={item.medicine}
                    onChangeText={val =>
                      setRxItems(prev =>
                        prev.map((it, i) => (i === idx ? { ...it, medicine: val } : it)),
                      )
                    }
                    placeholder="Medicine Name (e.g. Sumatriptan 50mg)"
                    placeholderTextColor={colors.textMuted}
                  />

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      value={item.dosage}
                      onChangeText={val =>
                        setRxItems(prev =>
                          prev.map((it, i) => (i === idx ? { ...it, dosage: val } : it)),
                        )
                      }
                      placeholder="Dose (1 tab)"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      value={item.frequency}
                      onChangeText={val =>
                        setRxItems(prev =>
                          prev.map((it, i) => (i === idx ? { ...it, frequency: val } : it)),
                        )
                      }
                      placeholder="Freq (1-0-1)"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      value={item.duration}
                      onChangeText={val =>
                        setRxItems(prev =>
                          prev.map((it, i) => (i === idx ? { ...it, duration: val } : it)),
                        )
                      }
                      placeholder="Duration"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              ))}

              <Pressable
                style={styles.addMedRowBtn}
                onPress={() => setRxItems(prev => [...prev, { ...EMPTY_RX }])}>
                <Plus size={16} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.addMedRowText}>+ Add Another Medicine</Text>
              </Pressable>
            </ScrollView>

            <Pressable
              style={styles.modalIssueBtn}
              onPress={() => issueRxMut.mutate()}
              disabled={issueRxMut.isPending}>
              <FileSignature size={18} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.modalIssueBtnText}>
                {issueRxMut.isPending ? 'Signing...' : 'Sign & Issue E-Prescription'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Lab Order Modal */}
      <Modal
        visible={labOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLabOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={20} color={colors.primary} strokeWidth={2} />
                <Text style={styles.modalTitle}>Order Diagnostic Lab Test</Text>
              </View>
              <Pressable onPress={() => setLabOpen(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <FlatList
              data={labTests}
              keyExtractor={(item: any) => item.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  style={styles.labRowItem}
                  onPress={() => labMut.mutate(item.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.labTestName}>{item.name}</Text>
                    <Text style={styles.labTestCat}>{item.category || 'General Diagnostic'}</Text>
                  </View>
                  <View style={styles.labOrderBtnBadge}>
                    <Text style={styles.labOrderBtnText}>+ Order</Text>
                  </View>
                </Pressable>
              )}
            />
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
  headerTitleCol: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statusPill: {
    backgroundColor: colors.mint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 100,
    gap: 14,
  },

  /* Patient Hero Card */
  patientHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadows.card,
  },
  patientHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientHeroMeta: {
    flex: 1,
    gap: 2,
  },
  patientHeroName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  patientHeroSub: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  patientVisitType: {
    fontSize: 10,
    color: colors.primaryLight,
    fontWeight: '600',
  },

  /* Video Call Hero Button */
  videoLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#C8EDE9',
  },
  videoLaunchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLaunchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  videoLaunchSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  videoLaunchPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  videoLaunchPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Workspace Segmented Tabs */
  workspaceTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  workspaceTabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  workspaceTabPillActive: {
    backgroundColor: colors.aqua,
  },
  workspaceTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  workspaceTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  /* Form Cards */
  sectionContainer: {
    gap: 12,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    ...shadows.cardSoft,
  },
  formCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  formCardInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
  },
  notesAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 17,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  syncedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },

  /* Vitals Grid */
  vitalsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  vitalTile: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  vitalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vitalLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },

  /* Orders Styles */
  addOrderLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  medItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  medItemDetails: {
    fontSize: 10,
    color: colors.textMuted,
  },
  orderCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#C8EDE9',
    marginTop: 4,
  },
  orderCtaBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Followup Chips */
  followupChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  followupChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  followupChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followupChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  followupChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  complianceText: {
    fontSize: 10,
    color: colors.textMuted,
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    gap: 10,
    ...shadows.cardElevated,
  },
  saveDraftBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveDraftBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  completeBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 63, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalRxCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    gap: 8,
    marginBottom: 8,
  },
  modalRxTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalRxNum: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.textPrimary,
  },
  addMedRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  addMedRowText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modalIssueBtn: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  modalIssueBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  labRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labTestName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labTestCat: {
    fontSize: 11,
    color: colors.textMuted,
  },
  labOrderBtnBadge: {
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  labOrderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
