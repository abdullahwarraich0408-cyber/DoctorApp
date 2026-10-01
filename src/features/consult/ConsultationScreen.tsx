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
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Video,
  Activity,
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
  ChevronRight,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { resolveFollowUpDate } from '../../lib/mappers/doctorPortal';
import { colors, radius, shadows } from '../../theme';
import TabScreenHeader from '../../components/TabScreenHeader';
import type { RootStackParamList } from '../../navigation/types';
import EndConsultationModal from '../../components/EndConsultationModal';

const MODAL_SCROLL_MAX = Dimensions.get('window').height * 0.55;

const WORKSPACE_TABS = [
  { key: 'assessment' as const, label: 'Diagnosis', IconComp: Activity },
  { key: 'orders' as const, label: 'Rx & Labs', IconComp: Pill },
  { key: 'followup' as const, label: 'Follow-up', IconComp: Calendar },
];

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

function normalizeRxItems(raw: unknown): RxItem[] {
  const list = Array.isArray(raw) ? raw : [];
  const mapped = list
    .map((item: Record<string, unknown>) => ({
      medicine: String(item?.medicine || item?.name || '').trim(),
      dosage: String(item?.dosage || item?.dose || '1 Tablet'),
      frequency: String(item?.frequency || 'Once daily'),
      duration: String(item?.duration || '3 Days'),
      instructions: String(item?.instructions || 'Take after meals'),
    }))
    .filter(item => item.medicine.length > 0);
  return mapped.length > 0 ? mapped : [{ ...EMPTY_RX }];
}

function toPrescriptionPayloadItems(items: RxItem[]) {
  return items
    .filter(it => it.medicine.trim().length > 0)
    .map(it => ({
      name: it.medicine.trim(),
      medicine: it.medicine.trim(),
      dosage: it.dosage.trim() || '1 Tablet',
      frequency: it.frequency.trim() || 'Once daily',
      duration: it.duration.trim() || '3 Days',
      instructions: it.instructions.trim() || 'Take after meals',
    }));
}

export function ConsultationScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Consultation'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 380;
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const appointmentId = route.params.appointmentId;
  const bottomPad = Math.max(insets.bottom, 10);

  const [activeTab, setActiveTab] = useState<'assessment' | 'orders' | 'followup'>(
    'assessment',
  );

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('7 Days');
  const [hydrated, setHydrated] = useState(false);

  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [rxItems, setRxItems] = useState<RxItem[]>([EMPTY_RX]);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);

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
    const existingRx =
      appointment?.prescription?.items ||
      query.data?.appointment?.prescription?.items ||
      query.data?.prescription?.items;
    if (existingRx) {
      setRxItems(normalizeRxItems(existingRx));
    }
    setHydrated(true);
  }, [query.data, consultation, appointment, hydrated]);

  const filledRxItems = useMemo(
    () => rxItems.filter(item => item.medicine.trim().length > 0),
    [rxItems],
  );

  const saveMut = useMutation({
    mutationFn: () =>
      doctorPortalApi.updateConsultation(appointmentId, {
        symptoms,
        diagnosis,
        clinical_notes: notes,
        follow_up_date: resolveFollowUpDate(followUp),
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
        follow_up_date: resolveFollowUpDate(followUp),
      });
      const currentStatus = String(appointment?.status || '').toLowerCase();
      if (currentStatus === 'completed') {
        return { alreadyCompleted: true };
      }
      if (
        !currentStatus ||
        currentStatus === 'confirmed' ||
        currentStatus === 'checked_in'
      ) {
        try {
          await doctorPortalApi.updateAppointmentStatus(appointmentId, 'in_progress');
        } catch {
          // Already in progress — continue to complete
        }
      }
      return doctorPortalApi.updateAppointmentStatus(appointmentId, 'completed', notes);
    },
    onSuccess: (result) => {
      setShowEndConfirmModal(false);
      queryClient.invalidateQueries({ queryKey: ['doctor-consultation', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-follow-ups'] });
      if ((result as any)?.alreadyCompleted) {
        Alert.alert('Saved', 'Clinical notes and follow-up were updated. This visit was already completed.');
        return;
      }
      Alert.alert('Consultation Completed', 'Visit completed and clinical notes archived successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: Error) => {
      setShowEndConfirmModal(false);
      Alert.alert('Error completing visit', err.message);
    },
  });

  const issueRxMut = useMutation({
    mutationFn: () => {
      const validItems = toPrescriptionPayloadItems(rxItems);
      if (validItems.length === 0) {
        throw new Error('Enter at least one medicine name before signing.');
      }
      return doctorPortalApi.createPrescription({
        appointment_id: appointmentId,
        items: validItems,
        notes: notes || 'Take medications as prescribed.',
        sign: true,
      });
    },
    onSuccess: () => {
      const saved = toPrescriptionPayloadItems(rxItems).map(item => ({
        medicine: item.medicine,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
      }));
      setRxItems(saved.length ? saved : [{ ...EMPTY_RX }]);
      setRxModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['doctor-consultation', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({
        queryKey: ['doctor-prescription', appointmentId],
      });
      Alert.alert(
        'Prescription Signed & Issued',
        'E-Prescription delivered to the patient vault.',
      );
    },
    onError: (err: Error) => Alert.alert('Could not issue prescription', err.message),
  });

  const handleIssuePrescription = () => {
    const validItems = toPrescriptionPayloadItems(rxItems);
    if (validItems.length === 0) {
      Alert.alert(
        'Medicine required',
        'Please enter a medicine name before signing the prescription.',
      );
      return;
    }
    issueRxMut.mutate();
  };

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
    return Array.isArray(raw)
      ? raw
      : raw?.tests || [
          { id: '1', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: '1,200' },
          { id: '2', name: 'HbA1c (Glycated Hemoglobin)', category: 'Diabetes', price: '1,800' },
          { id: '3', name: 'Lipid Profile', category: 'Cardiology', price: '2,200' },
          { id: '4', name: 'Serum Electrolytes', category: 'Biochemistry', price: '1,500' },
        ];
  }, [labsQuery.data]);

  const caseId = String(appointmentId || '2024').slice(-6).toUpperCase();
  const appointmentStatus = String(appointment?.status || '').toLowerCase();
  const isAlreadyCompleted = appointmentStatus === 'completed';
  const consultMode = String(
    appointment?.consultation_mode ||
      appointment?.preferred_consultation_mode ||
      '',
  ).toLowerCase();
  const isOnlineVisit =
    consultMode === 'online' ||
    (!consultMode.includes('in_person') &&
      !consultMode.includes('in_clinic') &&
      Boolean(appointment?.meeting_id));
  const showVideoSession = isOnlineVisit && !isAlreadyCompleted;

  return (
    <View style={styles.root}>
      <TabScreenHeader
        showBack
        title="Clinical Case Sheet"
        subtitle={`Case #${caseId}`}
        right={
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>
              {isAlreadyCompleted ? 'Completed' : 'In Session'}
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? topInset + 8 : 0}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + bottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={true}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic">
          {/* Patient hero — Next Patient card language */}
          <View style={styles.patientHeroCard}>
            <View style={styles.patientHeroTop}>
              <View style={[styles.patientAvatar, styles.patientAvatarFallback]}>
                <Text style={styles.patientAvatarInitial}>
                  {(patientName || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.patientHeroMeta}>
                <Text style={styles.patientHeroName} numberOfLines={1}>
                  {patientName}
                </Text>
                <Text style={styles.patientHeroSub}>
                  {isAlreadyCompleted
                    ? 'Completed visit'
                    : isOnlineVisit
                      ? 'Active consultation'
                      : 'In-clinic visit'}
                </Text>
                <View style={styles.patientTagRow}>
                  <View style={styles.patientTag}>
                    <Text style={styles.patientTagText}>
                      {isAlreadyCompleted
                        ? 'Completed'
                        : isOnlineVisit
                          ? 'Online consult'
                          : 'Clinic visit'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {showVideoSession ? (
              <Pressable
                style={styles.videoLaunchBtn}
                onPress={() =>
                  navigation.navigate('Video', {
                    appointmentId,
                    patientName,
                  })
                }>
                <View style={styles.videoLaunchIconWrap}>
                  <Video size={16} color="#FFFFFF" strokeWidth={2.2} />
                </View>
                <View style={styles.videoLaunchTextCol}>
                  <Text style={styles.videoLaunchTitle}>Start Video Session</Text>
                  <Text style={styles.videoLaunchSub}>Secure teleconsult room</Text>
                </View>
                <ChevronRight size={18} color={colors.primary} strokeWidth={2.2} />
              </Pressable>
            ) : null}
          </View>

          {/* Horizontal workspace tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.tabsRow}
            style={styles.tabsScroll}>
            {WORKSPACE_TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const IconComp = tab.IconComp;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tabPill, isActive && styles.tabPillActive]}
                  onPress={() => setActiveTab(tab.key)}>
                  <IconComp
                    size={14}
                    color={isActive ? colors.primary : colors.textMuted}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[styles.tabText, isActive && styles.tabTextActive]}
                    numberOfLines={1}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* TAB: Diagnosis */}
          {activeTab === 'assessment' && (
            <View style={styles.sectionContainer}>
              <View style={styles.formCard}>
                <Text style={styles.formCardLabel}>Symptoms & Chief Complaint</Text>
                <TextInput
                  style={styles.formCardInput}
                  value={symptoms}
                  onChangeText={setSymptoms}
                  placeholder="e.g. Severe headache, nausea, fever…"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formCardLabel}>Clinical Diagnosis</Text>
                <View style={styles.diagnosisBox}>
                  <Activity size={16} color={colors.primary} strokeWidth={2.2} />
                  <TextInput
                    style={styles.diagnosisInput}
                    value={diagnosis}
                    onChangeText={setDiagnosis}
                    placeholder="e.g. Acute Migraine (ICD-10: G43.0)"
                    placeholderTextColor={colors.primaryLight}
                    multiline
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formCardLabel}>Examination & Treatment Plan</Text>
                <TextInput
                  style={[styles.formCardInput, styles.notesAreaInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Findings, exam notes, treatment steps, advice…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  scrollEnabled={false}
                  blurOnSubmit={false}
                />
              </View>
            </View>
          )}

          {/* TAB: Orders */}
          {activeTab === 'orders' && (
            <View style={styles.sectionContainer}>
              <View style={styles.formCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.formCardLabel}>
                    Prescriptions ({filledRxItems.length})
                  </Text>
                  <Pressable onPress={() => setRxModalOpen(true)} hitSlop={6}>
                    <Text style={styles.addOrderLink}>
                      {filledRxItems.length ? '+ Edit Rx' : '+ Add Rx'}
                    </Text>
                  </Pressable>
                </View>

                {filledRxItems.length === 0 ? (
                  <Text style={styles.emptyRxText}>
                    No medicines added yet. Open the prescription builder to issue Rx.
                  </Text>
                ) : (
                  filledRxItems.map((med, idx) => (
                    <View key={`${med.medicine}-${idx}`} style={styles.medItemRow}>
                      <View style={styles.medIconWrap}>
                        <Pill size={14} color={colors.primary} strokeWidth={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medItemName}>{med.medicine}</Text>
                        <Text style={styles.medItemDetails}>
                          {med.dosage} · {med.frequency} · {med.duration}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                <Pressable
                  style={styles.orderCtaBtn}
                  onPress={() => setRxModalOpen(true)}>
                  <Pill size={15} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.orderCtaBtnText}>
                    {filledRxItems.length
                      ? 'Open Prescription Builder'
                      : 'Create Prescription'}
                  </Text>
                </Pressable>
              </View>

              <Pressable style={styles.labBanner} onPress={() => setLabOpen(true)}>
                <View style={styles.labBannerIcon}>
                  <FlaskConical size={18} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.labBannerTitle}>Order Lab Tests</Text>
                  <Text style={styles.labBannerSub}>CBC · Thyroid · Electrolytes</Text>
                </View>
                <Plus size={16} color={colors.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
          )}

          {/* TAB: Follow-up */}
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
                        {isCompact
                          ? dur
                              .replace(' Days', 'd')
                              .replace(' Weeks', 'w')
                              .replace(' Month', 'mo')
                          : dur}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.complianceCard}>
                <ShieldCheck size={16} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.complianceCardText}>
                  Confidential medical record · HIPAA compliant documentation
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Sticky clinical actions */}
        <View style={[styles.bottomBar, { paddingBottom: bottomPad }]}>
          <Pressable
            style={styles.saveDraftBtn}
            onPress={() => saveMut.mutate()}
            disabled={saveMut.isPending}>
            {saveMut.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Bookmark size={16} color={colors.primary} strokeWidth={2.2} />
            )}
            <Text style={styles.saveDraftBtnText}>
              {saveMut.isPending ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.completeBtn, isAlreadyCompleted && { opacity: 0.85 }]}
            onPress={() => {
              if (isAlreadyCompleted) {
                completeMut.mutate();
                return;
              }
              setShowEndConfirmModal(true);
            }}
            disabled={completeMut.isPending}>
            {completeMut.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.2} />
            )}
            <Text style={styles.completeBtnText}>
              {completeMut.isPending
                ? isAlreadyCompleted
                  ? 'Saving…'
                  : 'Completing…'
                : isAlreadyCompleted
                  ? 'Update Notes'
                  : 'Complete Visit'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Custom Confirmation Prompted Modal: Complete Consultation */}
      <EndConsultationModal
        visible={showEndConfirmModal}
        onClose={() => setShowEndConfirmModal(false)}
        onConfirm={() => completeMut.mutate()}
        isLoading={completeMut.isPending}
        patientName={patientName}
        isTeleconsult={false}
      />

      {/* Prescription Builder Modal */}
      <Modal
        visible={rxModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRxModalOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
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
              automaticallyAdjustKeyboardInsets
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
                    autoFocus={idx === 0 && !item.medicine}
                    returnKeyType="next"
                  />

                  <View style={styles.modalInputRow}>
                    <TextInput
                      style={[styles.modalInput, styles.flex]}
                      value={item.dosage}
                      onChangeText={val =>
                        setRxItems(prev =>
                          prev.map((it, i) => (i === idx ? { ...it, dosage: val } : it)),
                        )
                      }
                      placeholder="Dose"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.modalInput, styles.flex]}
                      value={item.frequency}
                      onChangeText={val =>
                        setRxItems(prev =>
                          prev.map((it, i) => (i === idx ? { ...it, frequency: val } : it)),
                        )
                      }
                      placeholder="Freq"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.modalInput, styles.flex]}
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

                  <TextInput
                    style={styles.modalInput}
                    value={item.instructions}
                    onChangeText={val =>
                      setRxItems(prev =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, instructions: val } : it,
                        ),
                      )
                    }
                    placeholder="Instructions (e.g. After meals)"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ))}

              <Pressable
                style={styles.addMedRowBtn}
                onPress={() => setRxItems(prev => [...prev, { ...EMPTY_RX }])}>
                <Plus size={15} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.addMedRowText}>+ Add Another Medicine</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalIssueBtn,
                  (issueRxMut.isPending || filledRxItems.length === 0) && {
                    opacity: 0.7,
                  },
                ]}
                onPress={handleIssuePrescription}
                disabled={issueRxMut.isPending}>
                <FileSignature size={18} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.modalIssueBtnText}>
                  {issueRxMut.isPending ? 'Signing…' : 'Sign & Issue E-Prescription'}
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
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
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
                    <Text style={styles.labTestCat}>
                      {item.category || 'General Diagnostic'}
                    </Text>
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
  flex: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
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
    gap: 12,
  },

  patientHeroCard: {
    backgroundColor: colors.aqua,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: 12,
    ...shadows.cardElevated,
  },
  patientHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  patientAvatarFallback: {
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  patientHeroMeta: {
    flex: 1,
    gap: 3,
  },
  patientHeroName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  patientHeroSub: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  patientTagRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  patientTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  patientTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  videoLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  videoLaunchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLaunchTextCol: {
    flex: 1,
    gap: 1,
  },
  videoLaunchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  videoLaunchSub: {
    fontSize: 11,
    color: colors.textMuted,
  },

  tabsScroll: {
    maxHeight: 48,
    marginHorizontal: -16,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActive: {
    backgroundColor: colors.aqua,
    borderColor: '#B4E8E1',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  sectionContainer: {
    gap: 10,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
  },
  formCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formCardInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  notesAreaInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    lineHeight: 19,
  },
  diagnosisBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  diagnosisInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    padding: 0,
    minHeight: 36,
    textAlignVertical: 'top',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  addOrderLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  medItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  medItemDetails: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  emptyRxText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  orderCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  orderCtaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  labBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.cardSoft,
  },
  labBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  labBannerSub: {
    fontSize: 11,
    color: colors.textMuted,
  },

  followupChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  followupChip: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  followupChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followupChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  followupChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  complianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.aqua,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  complianceCardText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '500',
    lineHeight: 17,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.cardElevated,
  },
  saveDraftBtn: {
    height: 46,
    minWidth: 88,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#B4E8E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveDraftBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  completeBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

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
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
  },
  modalInputRow: {
    flexDirection: 'row',
    gap: 8,
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
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
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
    marginTop: 2,
  },
  labOrderBtnBadge: {
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  labOrderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
