import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Wifi,
  Stethoscope,
  Activity,
  FileText,
  CalendarClock,
  Check,
  CheckCircle2,
  Pencil,
  Pill,
  FlaskConical,
  Plus,
  Trash2,
  X,
  FileSignature,
  HeartPulse,
  Thermometer,
  Wind,
  Droplets,
  Calendar,
  AlertCircle,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { colors, radius, spacing, shadows } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type VideoRoute = RouteProp<RootStackParamList, 'Video'>;
type VideoNav = NativeStackNavigationProp<RootStackParamList>;

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

export function VideoConsultScreen() {
  const route = useRoute<VideoRoute>();
  const navigation = useNavigation<VideoNav>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const appointmentId = route.params.appointmentId;

  // Active workspace tab: 'symptoms' | 'diagnosis' | 'treatment' | 'followup'
  const [activeTab, setActiveTab] = useState<'symptoms' | 'diagnosis' | 'treatment' | 'followup'>('symptoms');
  const [seconds, setSeconds] = useState(0);

  // Media Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Clinical State
  const [symptomsList, setSymptomsList] = useState([
    { id: '1', name: 'General Discomfort', checked: true },
  ]);
  const [newSymptomText, setNewSymptomText] = useState('');
  const [showAddSymptom, setShowAddSymptom] = useState(false);

  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState<string[]>([]);
  const [newTreatmentText, setNewTreatmentText] = useState('');
  const [showAddTreatment, setShowAddTreatment] = useState(false);

  const [patientEducation, setPatientEducation] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('7 Days');
  const [hydrated, setHydrated] = useState(false);

  // Prescriptions & Labs
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxItems, setRxItems] = useState<RxItem[]>([EMPTY_RX]);
  const [labOpen, setLabOpen] = useState(false);

  const videoQuery = useQuery({
    queryKey: ['appointment-video', appointmentId],
    queryFn: () => doctorPortalApi.getConsultation(appointmentId),
    enabled: Boolean(appointmentId),
  });

  const labsQuery = useQuery({
    queryKey: ['lab-tests'],
    queryFn: () => doctorPortalApi.getLabTests(),
    enabled: labOpen,
  });

  const data = videoQuery.data;
  const patient = data?.patient || data?.customer || data?.appointment?.customer;
  const patientName =
    route.params.patientName ||
    patient?.name ||
    data?.appointment?.patient ||
    'Patient';

  const [url, setUrl] = useState(route.params.meetingUrl || '');

  useEffect(() => {
    const data = videoQuery.data;
    const meetingId =
      data?.appointment?.meeting_id ||
      data?.consultation?.meeting_id ||
      appointmentId;
    if (meetingId) {
      const cleanId = String(meetingId).replace(/[^a-zA-Z0-9]/g, '');
      const roomName = `Medzoos_${cleanId}`;
      const doctorName = encodeURIComponent(data?.doctor?.name || 'Doctor');
      const jitsiUrl = `https://meet.element.io/${roomName}#config.prejoinPageEnabled=false&config.requireDisplayName=false&config.disableDeepLinking=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false&userInfo.displayName="${doctorName}"`;
      setUrl(jitsiUrl);
    } else if (data?.appointment?.meeting_url) {
      setUrl(data.appointment.meeting_url);
    }

    if (data && !hydrated) {
      if (data.consultation?.symptoms || data.appointment?.reason) {
        const sym = (data.consultation?.symptoms || data.appointment?.reason || '')
          .split(',')
          .map((s: string, idx: number) => ({
            id: String(idx + 1),
            name: s.trim(),
            checked: true,
          }))
          .filter((s: any) => s.name.length > 0);
        if (sym.length > 0) setSymptomsList(sym);
      }
      if (data.consultation?.diagnosis) setProvisionalDiagnosis(data.consultation.diagnosis);
      if (data.consultation?.clinical_notes || data.appointment?.consultation_notes) {
        setClinicalSummary(data.consultation?.clinical_notes || data.appointment?.consultation_notes || '');
        setNotes(data.consultation?.clinical_notes || data.appointment?.consultation_notes || '');
      }
      if (data.consultation?.follow_up_date) {
        setFollowUp(String(data.consultation.follow_up_date).slice(0, 10));
      }
      setHydrated(true);
    }
  }, [videoQuery.data, appointmentId, hydrated]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(mins)}:${pad(secs)}`;
  };

  const endCallMut = useMutation({
    mutationFn: async () => {
      await doctorPortalApi.updateConsultation(appointmentId, {
        symptoms: symptomsList.filter(s => s.checked).map(s => s.name).join(', '),
        diagnosis: provisionalDiagnosis,
        clinical_notes: `${clinicalSummary}\n\nNotes: ${notes}`,
        follow_up_date: followUp || null,
      });
      return doctorPortalApi.updateAppointmentStatus(appointmentId, 'completed', notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
      Alert.alert('Consultation Completed', 'Clinical documentation and consultation record saved.');
      navigation.goBack();
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const issueRxMut = useMutation({
    mutationFn: () => {
      const validItems = rxItems.filter(it => it.medicine.trim().length > 0);
      return doctorPortalApi.createPrescription({
        appointment_id: appointmentId,
        items: validItems,
        notes: clinicalSummary || 'Take medications as prescribed.',
        sign: true,
      });
    },
    onSuccess: () => {
      setRxModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['appointment-video', appointmentId] });
      Alert.alert('Prescription Issued', 'E-Prescription has been signed and delivered to patient.');
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
      queryClient.invalidateQueries({ queryKey: ['appointment-video', appointmentId] });
      Alert.alert('Lab Ordered', 'Lab diagnostic order sent to partner laboratory.');
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
      { id: '5', name: 'Liver Function Test (LFT)', category: 'Hepatic', price: '2,000' },
    ];
  }, [labsQuery.data]);

  const toggleSymptom = (id: string) => {
    setSymptomsList(prev =>
      prev.map(s => (s.id === id ? { ...s, checked: !s.checked } : s)),
    );
  };

  const handleAddSymptom = () => {
    if (!newSymptomText.trim()) return;
    setSymptomsList(prev => [
      ...prev,
      { id: String(Date.now()), name: newSymptomText.trim(), checked: true },
    ]);
    setNewSymptomText('');
    setShowAddSymptom(false);
  };

  const handleAddTreatment = () => {
    if (!newTreatmentText.trim()) return;
    setTreatmentNotes(prev => [...prev, newTreatmentText.trim()]);
    setNewTreatmentText('');
    setShowAddTreatment(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1924" />

      {/* Top Video Stage (~34% height) */}
      <View style={[styles.videoStage, { paddingTop: topInset }]}>
        {/* Patient Stream Video Background */}
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
          }}
          style={styles.patientVideoFeed}
        />
        <View style={styles.videoGradientOverlay} />

        {/* Top-Bar Overlay: Back / Patient Info / Connection */}
        <View style={[styles.videoTopBar, { top: topInset + 6 }]}>
          <Pressable
            style={styles.minimizeBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back"
            hitSlop={8}>
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.videoPatientMetaCol}>
            <Text style={styles.videoPatientName}>{patientName}</Text>
            <View style={styles.videoSubRow}>
              <Text style={styles.videoPatientSub}>32 Y • Female</Text>
              <View style={styles.timerPill}>
                <View style={styles.recordingDot} />
                <Text style={styles.timerPillText}>{formatTime(seconds)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.videoTopRightCol}>
            <View style={styles.connectionBadge}>
              <Wifi size={12} color={colors.mint} strokeWidth={2.2} />
              <Text style={styles.connectionText}>HD Live</Text>
            </View>

            {/* Doctor Self-View PiP */}
            <View style={styles.doctorPipWrap}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
                }}
                style={styles.doctorPipImg}
              />
            </View>
          </View>
        </View>

        {/* Floating Call Controls Pill */}
        <View style={styles.callControlsFloatingBar}>
          <Pressable
            style={[styles.controlCircleBtn, isMuted && styles.controlCircleBtnMuted]}
            onPress={() => setIsMuted(!isMuted)}>
            {isMuted ? (
              <MicOff size={18} color="#FFFFFF" strokeWidth={2} />
            ) : (
              <Mic size={18} color="#FFFFFF" strokeWidth={2} />
            )}
          </Pressable>

          <Pressable
            style={[styles.controlCircleBtn, isCameraOff && styles.controlCircleBtnMuted]}
            onPress={() => setIsCameraOff(!isCameraOff)}>
            {isCameraOff ? (
              <VideoOff size={18} color="#FFFFFF" strokeWidth={2} />
            ) : (
              <Video size={18} color="#FFFFFF" strokeWidth={2} />
            )}
          </Pressable>

          <Pressable
            style={styles.controlCircleBtn}
            onPress={() => setIsSpeakerOn(!isSpeakerOn)}>
            {isSpeakerOn ? (
              <Volume2 size={18} color="#FFFFFF" strokeWidth={2} />
            ) : (
              <VolumeX size={18} color="#FFFFFF" strokeWidth={2} />
            )}
          </Pressable>

          <Pressable
            style={styles.endCallPillBtn}
            onPress={() =>
              Alert.alert('End Consultation', 'Are you sure you want to finish this virtual session?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Complete & End', style: 'destructive', onPress: () => endCallMut.mutate() },
              ])
            }>
            <PhoneOff size={16} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.endCallPillText}>End Call</Text>
          </Pressable>
        </View>
      </View>

      {/* Clinical Workspace Sheet */}
      <View style={styles.workspaceSheet}>
        {/* Horizontal Workspace Navigation Tabs */}
        <View style={styles.tabsRow}>
          {(
            [
              { key: 'symptoms', label: 'Symptoms & Vitals', IconComp: Stethoscope },
              { key: 'diagnosis', label: 'Diagnosis', IconComp: Activity },
              { key: 'treatment', label: 'Treatment Plan', IconComp: FileText },
              { key: 'followup', label: 'Follow-up', IconComp: CalendarClock },
            ] as const
          ).map(tab => {
            const isActive = activeTab === tab.key;
            const IconComponent = tab.IconComp;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}>
                <IconComponent
                  size={14}
                  color={isActive ? colors.primary : colors.textMuted}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.tabLabelText,
                    isActive && styles.tabLabelTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Dynamic Tab Body */}
        <ScrollView
          contentContainerStyle={styles.tabBodyScroll}
          showsVerticalScrollIndicator={false}>
          {/* TAB 1: Symptoms & Vitals */}
          {activeTab === 'symptoms' && (
            <View style={styles.tabSection}>
              {/* Chief Complaint Card */}
              <View style={styles.cardBox}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Chief Complaint</Text>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityBadgeText}>Reported Today</Text>
                  </View>
                </View>
                <Text style={styles.chiefComplaintText}>
                  "Severe throbbing headache on the right side with nausea and intense light sensitivity since yesterday evening."
                </Text>
              </View>

              {/* Key Symptoms Checklist Card */}
              <View style={styles.cardBox}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Reported Symptoms</Text>
                  <Text style={styles.cardSubCount}>
                    {symptomsList.filter(s => s.checked).length} selected
                  </Text>
                </View>

                <View style={styles.symptomsGrid}>
                  {symptomsList.map(symptom => (
                    <Pressable
                      key={symptom.id}
                      style={[
                        styles.symptomChip,
                        symptom.checked && styles.symptomChipChecked,
                      ]}
                      onPress={() => toggleSymptom(symptom.id)}>
                      <View
                        style={[
                          styles.checkboxCircle,
                          symptom.checked && styles.checkboxCircleChecked,
                        ]}>
                        {symptom.checked && (
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.symptomChipText,
                          symptom.checked && styles.symptomChipTextChecked,
                        ]}>
                        {symptom.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {showAddSymptom ? (
                  <View style={styles.addInlineRow}>
                    <TextInput
                      style={styles.addInlineInput}
                      placeholder="Enter new symptom..."
                      placeholderTextColor={colors.textMuted}
                      value={newSymptomText}
                      onChangeText={setNewSymptomText}
                      autoFocus
                    />
                    <Pressable style={styles.addInlineSaveBtn} onPress={handleAddSymptom}>
                      <Text style={styles.addInlineSaveText}>Add</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowAddSymptom(false)} hitSlop={6}>
                      <X size={18} color={colors.textMuted} strokeWidth={2} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.addBtnWrap}
                    onPress={() => setShowAddSymptom(true)}>
                    <Plus size={14} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.addBtnText}>Add Symptom</Text>
                  </Pressable>
                )}
              </View>

              {/* Vitals Grid Card */}
              <View style={styles.cardBox}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Live Recorded Vitals</Text>
                  <View style={styles.syncedPill}>
                    <CheckCircle2 size={11} color={colors.success} strokeWidth={2.2} />
                    <Text style={styles.syncedPillText}>Auto-Synced</Text>
                  </View>
                </View>

                <View style={styles.vitalsGrid}>
                  {/* Vital 1: BP */}
                  <View style={styles.vitalTile}>
                    <View style={[styles.vitalIconWrap, { backgroundColor: colors.dangerBg }]}>
                      <HeartPulse size={16} color={colors.danger} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.vitalValue}>120/80</Text>
                    <Text style={styles.vitalUnit}>mmHg • BP</Text>
                  </View>

                  {/* Vital 2: Pulse */}
                  <View style={styles.vitalTile}>
                    <View style={[styles.vitalIconWrap, { backgroundColor: colors.aqua }]}>
                      <Activity size={16} color={colors.primary} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.vitalValue}>72</Text>
                    <Text style={styles.vitalUnit}>bpm • Heart Rate</Text>
                  </View>

                  {/* Vital 3: Temp */}
                  <View style={styles.vitalTile}>
                    <View style={[styles.vitalIconWrap, { backgroundColor: colors.warningBg }]}>
                      <Thermometer size={16} color={colors.warning} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.vitalValue}>98.6</Text>
                    <Text style={styles.vitalUnit}>°F • Temp</Text>
                  </View>

                  {/* Vital 4: SpO2 */}
                  <View style={styles.vitalTile}>
                    <View style={[styles.vitalIconWrap, { backgroundColor: colors.iceBlue }]}>
                      <Wind size={16} color={colors.primaryLight} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.vitalValue}>98%</Text>
                    <Text style={styles.vitalUnit}>Oxygen (SpO2)</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: Diagnosis */}
          {activeTab === 'diagnosis' && (
            <View style={styles.tabSection}>
              {/* Provisional Diagnosis Card */}
              <View style={styles.cardBox}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Provisional Diagnosis</Text>
                  <Pencil size={14} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.diagnosisHighlightBox}>
                  <Activity size={18} color={colors.primary} strokeWidth={2.2} />
                  <Text style={styles.diagnosisHighlightText}>{provisionalDiagnosis}</Text>
                </View>
              </View>

              {/* Clinical Summary Narrative */}
              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Clinical Examination Summary</Text>
                <TextInput
                  style={styles.summaryTextInput}
                  multiline
                  value={clinicalSummary}
                  onChangeText={setClinicalSummary}
                  placeholder="Enter clinical examination notes..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Differential Considerations */}
              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Differential Considerations</Text>
                <View style={styles.differentialRow}>
                  <View style={styles.diffDot} />
                  <Text style={styles.diffText}>Tension-type Headache (Rule out)</Text>
                </View>
                <View style={styles.differentialRow}>
                  <View style={styles.diffDot} />
                  <Text style={styles.diffText}>Sinus Headache (No nasal congestion noted)</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 3: Treatment Plan */}
          {activeTab === 'treatment' && (
            <View style={styles.tabSection}>
              {/* Treatment Action Plan */}
              <View style={styles.cardBox}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Medical Treatment Plan</Text>
                  <Pressable onPress={() => setRxModalOpen(true)}>
                    <Text style={styles.quickRxLink}>+ Prescribe Rx</Text>
                  </Pressable>
                </View>

                <View style={styles.treatmentListWrap}>
                  {treatmentNotes.map((item, idx) => (
                    <View key={idx} style={styles.treatmentItemRow}>
                      <View style={styles.treatmentIndexCircle}>
                        <Text style={styles.treatmentIndexText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.treatmentItemText}>{item}</Text>
                    </View>
                  ))}
                </View>

                {showAddTreatment ? (
                  <View style={styles.addInlineRow}>
                    <TextInput
                      style={styles.addInlineInput}
                      placeholder="Add treatment item..."
                      placeholderTextColor={colors.textMuted}
                      value={newTreatmentText}
                      onChangeText={setNewTreatmentText}
                      autoFocus
                    />
                    <Pressable style={styles.addInlineSaveBtn} onPress={handleAddTreatment}>
                      <Text style={styles.addInlineSaveText}>Add</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowAddTreatment(false)} hitSlop={6}>
                      <X size={18} color={colors.textMuted} strokeWidth={2} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.addBtnWrap}
                    onPress={() => setShowAddTreatment(true)}>
                    <Plus size={14} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.addBtnText}>Add Treatment Step</Text>
                  </Pressable>
                )}
              </View>

              {/* Patient Education & Advice */}
              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Patient Lifestyle & Advice</Text>
                <TextInput
                  style={styles.summaryTextInput}
                  multiline
                  value={patientEducation}
                  onChangeText={setPatientEducation}
                  placeholder="Enter patient lifestyle advice..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          )}

          {/* TAB 4: Follow-up & Lab Orders */}
          {activeTab === 'followup' && (
            <View style={styles.tabSection}>
              {/* Follow-up Timeline */}
              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Follow-up Recommendation</Text>
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

              {/* Additional Clinical Notes */}
              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Internal Clinical Notes</Text>
                <TextInput
                  style={styles.summaryTextInput}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Enter any private clinical notes for this patient's record..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Quick Lab Order CTA */}
              <Pressable
                style={styles.labCtaBanner}
                onPress={() => setLabOpen(true)}>
                <View style={styles.labCtaIconWrap}>
                  <FlaskConical size={20} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.labCtaTitle}>Order Diagnostic Lab Tests</Text>
                  <Text style={styles.labCtaSub}>CBC, Vitamin D, Thyroid or Electrolytes</Text>
                </View>
                <Plus size={18} color={colors.primary} strokeWidth={2.2} />
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Persistent Bottom Clinical Actions Bar */}
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.barSecondaryBtn}
            onPress={() => setRxModalOpen(true)}>
            <Pill size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.barSecondaryBtnText}>Prescribe Rx</Text>
          </Pressable>

          <Pressable
            style={styles.barSecondaryBtn}
            onPress={() => setLabOpen(true)}>
            <FlaskConical size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.barSecondaryBtnText}>Order Labs</Text>
          </Pressable>

          <Pressable
            style={styles.barPrimaryBtn}
            onPress={() => endCallMut.mutate()}
            disabled={endCallMut.isPending}>
            <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.barPrimaryBtnText}>
              {endCallMut.isPending ? 'Saving...' : 'Complete Visit'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Quick E-Prescription Builder Modal */}
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
    backgroundColor: '#0A1924',
  },

  /* Video Stage (Top ~34% of screen) */
  videoStage: {
    height: '34%',
    backgroundColor: '#0A1924',
    position: 'relative',
  },
  patientVideoFeed: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  videoGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 25, 36, 0.35)',
  },

  /* Video Top Header */
  videoTopBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  minimizeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  videoPatientMetaCol: {
    flex: 1,
    gap: 2,
  },
  videoPatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoPatientSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  recordingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.danger,
  },
  timerPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  videoTopRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 78, 82, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(221, 246, 242, 0.3)',
  },
  connectionText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mint,
  },
  doctorPipWrap: {
    width: 48,
    height: 60,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#000000',
    ...shadows.cardElevated,
  },
  doctorPipImg: {
    width: '100%',
    height: '100%',
  },

  /* Call Controls Floating Bar */
  callControlsFloatingBar: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  controlCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 78, 82, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  controlCircleBtnMuted: {
    backgroundColor: 'rgba(240, 82, 82, 0.75)',
  },
  endCallPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    ...shadows.cardSoft,
  },
  endCallPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Lower Workspace Sheet (White) */
  workspaceSheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: colors.aqua,
  },
  tabLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* Tab Body Scroll */
  tabBodyScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 85,
  },
  tabSection: {
    gap: 12,
  },

  /* Clean White Cards */
  cardBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priorityBadge: {
    backgroundColor: colors.aqua,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  chiefComplaintText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  cardSubCount: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* Symptoms Grid */
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  symptomChipChecked: {
    backgroundColor: colors.aqua,
    borderColor: '#B4E8E1',
  },
  checkboxCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  symptomChipText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  symptomChipTextChecked: {
    color: colors.primaryDark,
    fontWeight: '700',
  },

  /* Vitals Grid (4 Tiles) */
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  vitalTile: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  vitalIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  vitalValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vitalUnit: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },
  syncedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  syncedPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },

  /* Diagnosis Styles */
  diagnosisHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  diagnosisHighlightText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    flex: 1,
  },
  summaryTextInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  differentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textMuted,
  },
  diffText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  /* Treatment Plan Styles */
  quickRxLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  treatmentListWrap: {
    gap: 8,
  },
  treatmentItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  treatmentIndexCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  treatmentIndexText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  treatmentItemText: {
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 15,
  },

  /* Follow-up Styles */
  followupChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  followupChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
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
  labCtaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.cardSoft,
  },
  labCtaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labCtaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  labCtaSub: {
    fontSize: 10,
    color: colors.textMuted,
  },

  /* Add button and inline input */
  addBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  addInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addInlineInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    color: colors.textPrimary,
  },
  addInlineSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  addInlineSaveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Persistent Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    ...shadows.cardElevated,
  },
  barSecondaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  barSecondaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  barPrimaryBtn: {
    flex: 1.3,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  barPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Modals */
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
