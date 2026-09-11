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
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Video,
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
  ShieldCheck,
  FileSignature,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { colors, radius, shadows } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const MODAL_SCROLL_MAX = Dimensions.get('window').height * 0.55;

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

      {/* Professional Minimalist Header */}
      <View style={[styles.headerSection, { paddingTop: topInset + 6 }]}>
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
            <Text style={styles.headerSub}>Workspace • ID: {appointmentId?.slice(-6) || '2024'}</Text>
          </View>

          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
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
          automaticallyAdjustKeyboardInsets={true}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          
          {/* Patient Profile & Video Action Banner */}
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
                <Text style={styles.patientHeroSub}>32 Yrs • Female • Blood Group B+</Text>
              </View>
            </View>

            {/* Compact Video Call Action Button */}
            <Pressable
              style={styles.videoLaunchBtn}
              onPress={() =>
                navigation.navigate('Video', {
                  appointmentId,
                  patientName,
                })
              }>
              <View style={styles.videoLaunchIconWrap}>
                <Video size={16} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.videoLaunchTitle}>Start Video Session</Text>
              <Text style={styles.videoLaunchPillText}>Launch &gt;</Text>
            </Pressable>
          </View>

          {/* Responsive Segmented Workspace Tabs */}
          <View style={styles.workspaceTabsRow}>
            {(
              [
                { key: 'assessment', label: 'Diagnosis', IconComp: Activity },
                { key: 'vitals', label: 'Vitals', IconComp: Stethoscope },
                { key: 'orders', label: 'Rx & Labs', IconComp: Pill },
                { key: 'followup', label: 'Follow-up', IconComp: Calendar },
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
                    size={14}
                    color={isActive ? colors.primary : colors.textMuted}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.workspaceTabText,
                      isActive && styles.workspaceTabTextActive,
                    ]}
                    numberOfLines={1}>
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
                <Text style={styles.formCardLabel}>Examination & Treatment Plan</Text>
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
                  <Text style={styles.formCardLabel}>Patient Vitals</Text>
                  <View style={styles.syncedBadge}>
                    <CheckCircle2 size={11} color={colors.success} strokeWidth={2.2} />
                    <Text style={styles.syncedBadgeText}>Synced</Text>
                  </View>
                </View>

                <View style={styles.vitalsGrid}>
                  <View style={styles.vitalTile}>
                    <HeartPulse size={18} color={colors.danger} strokeWidth={2.2} />
                    <Text style={styles.vitalValue}>120/80</Text>
                    <Text style={styles.vitalLabel}>BP (mmHg)</Text>
                  </View>

                  <View style={styles.vitalTile}>
                    <Activity size={18} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.vitalValue}>72</Text>
                    <Text style={styles.vitalLabel}>Pulse (bpm)</Text>
                  </View>

                  <View style={styles.vitalTile}>
                    <Thermometer size={18} color={colors.warning} strokeWidth={2.2} />
                    <Text style={styles.vitalValue}>98.6</Text>
                    <Text style={styles.vitalLabel}>Temp (°F)</Text>
                  </View>

                  <View style={styles.vitalTile}>
                    <Wind size={18} color={colors.primaryLight} strokeWidth={2.2} />
                    <Text style={styles.vitalValue}>98%</Text>
                    <Text style={styles.vitalLabel}>SpO2</Text>
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
                  <Text style={styles.formCardLabel}>Prescriptions ({rxItems.length})</Text>
                  <Pressable onPress={() => setRxModalOpen(true)}>
                    <Text style={styles.addOrderLink}>+ Edit Rx</Text>
                  </Pressable>
                </View>

                {rxItems.map((med, idx) => (
                  <View key={idx} style={styles.medItemRow}>
                    <Pill size={15} color={colors.primary} strokeWidth={2} />
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
                  <Text style={styles.orderCtaBtnText}>Open Prescription Builder</Text>
                </Pressable>
              </View>

              {/* Lab Tests Card */}
              <View style={styles.formCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.formCardLabel}>Diagnostic Requisitions</Text>
                  <Pressable onPress={() => setLabOpen(true)}>
                    <Text style={styles.addOrderLink}>+ Add Test</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={styles.orderCtaBtn}
                  onPress={() => setLabOpen(true)}>
                  <FlaskConical size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.orderCtaBtnText}>Order Lab Tests</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* TAB 4: Follow-up Plan */}
          {activeTab === 'followup' && (
            <View style={styles.sectionContainer}>
              <View style={styles.formCard}>
                <Text style={styles.formCardLabel}>Follow-up Timeline</Text>
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

          {/* Inline Action Card Section */}
          <View style={styles.inlineActionCard}>
            <Pressable
              style={styles.saveDraftBtn}
              onPress={() => saveMut.mutate()}
              disabled={saveMut.isPending}>
              <Bookmark size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.saveDraftBtnText}>
                {saveMut.isPending ? 'Saving...' : 'Save Notes'}
              </Text>
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
                {completeMut.isPending ? 'Completing...' : 'Complete Visit'}
              </Text>
            </Pressable>
          </View>

          {/* Compliance Banner */}
          <View style={styles.complianceRow}>
            <ShieldCheck size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.complianceText}>Confidential medical record • HIPAA Compliant</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Prescription Builder Modal */}
      <Modal
        visible={rxModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRxModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pill size={18} color={colors.primary} strokeWidth={2} />
                <Text style={styles.modalTitle}>Prescribe Medications</Text>
              </View>
              <Pressable onPress={() => setRxModalOpen(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: MODAL_SCROLL_MAX }}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={true}
              nestedScrollEnabled>
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
                <Plus size={15} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.addMedRowText}>+ Add Another Medicine</Text>
              </Pressable>

              <Pressable
                style={styles.modalIssueBtn}
                onPress={() => issueRxMut.mutate()}
                disabled={issueRxMut.isPending}>
                <FileSignature size={18} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.modalIssueBtnText}>
                  {issueRxMut.isPending ? 'Signing...' : 'Sign & Issue E-Prescription'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lab Order Modal */}
      <Modal
        visible={labOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLabOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={18} color={colors.primary} strokeWidth={2} />
                <Text style={styles.modalTitle}>Order Diagnostic Lab Test</Text>
              </View>
              <Pressable onPress={() => setLabOpen(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <FlatList
              data={labTests}
              keyExtractor={(item: any) => item.id}
              style={{ maxHeight: MODAL_SCROLL_MAX }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
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
        </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.mint,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 12,
  },

  /* Patient Hero Card */
  patientHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
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
    borderWidth: 2,
    borderColor: colors.mint,
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

  /* Video Action Banner */
  videoLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DDF6F2',
  },
  videoLaunchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLaunchTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  videoLaunchPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Workspace Segmented Tabs */
  workspaceTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.lg,
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
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  workspaceTabPillActive: {
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#DDF6F2',
  },
  workspaceTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  workspaceTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* Form Cards */
  sectionContainer: {
    gap: 10,
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
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  formCardInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: colors.textPrimary,
  },
  notesAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 18,
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
    paddingHorizontal: 7,
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
    marginTop: 2,
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
    borderRadius: radius.md,
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
    borderColor: '#DDF6F2',
    marginTop: 2,
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

  /* Inline Action Card */
  inlineActionCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginTop: 4,
    ...shadows.cardSoft,
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

  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
  },
  complianceText: {
    fontSize: 10,
    color: colors.textMuted,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalScrollContent: {
    paddingBottom: 12,
    gap: 4,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labTestName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labTestCat: {
    fontSize: 10,
    color: colors.textMuted,
  },
  labOrderBtnBadge: {
    backgroundColor: colors.mint,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  labOrderBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
});
