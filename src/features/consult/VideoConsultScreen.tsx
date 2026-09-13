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
  KeyboardAvoidingView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
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
  ShieldCheck,
} from 'lucide-react-native';
import { doctorPortalApi, telehealthApi } from '../../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';
import { resolveFollowUpDate } from '../../lib/mappers/doctorPortal';
import { TelehealthVideoWebView } from '../../lib/telehealth/TelehealthVideoWebView';
import {
  buildJitsiMeetUrl,
  isDirectMeetUrl,
  resolveVideoRoomFromAccess,
} from '../../lib/telehealth/videoRoom';
import { colors, radius, shadows } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const MODAL_SCROLL_MAX = Dimensions.get('window').height * 0.55;

const WORKSPACE_TABS = [
  { key: 'symptoms' as const, label: 'Symptoms', IconComp: Stethoscope },
  { key: 'diagnosis' as const, label: 'Diagnosis', IconComp: Activity },
  { key: 'treatment' as const, label: 'Treatment', IconComp: FileText },
  { key: 'followup' as const, label: 'Follow-up', IconComp: CalendarClock },
];

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
  const { partner } = useAuth();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isCompact = windowWidth < 380;
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const appointmentId = route.params.appointmentId;

  // Responsive video stage: give Jitsi enough height to render toolbar + tiles
  const videoStageHeight = Math.round(
    Math.min(Math.max(windowHeight * 0.42, 260), windowHeight * 0.48),
  );

  // Active workspace tab: 'symptoms' | 'diagnosis' | 'treatment' | 'followup'
  const [activeTab, setActiveTab] = useState<'symptoms' | 'diagnosis' | 'treatment' | 'followup'>('symptoms');
  const [seconds, setSeconds] = useState(0);
  const [webViewReady, setWebViewReady] = useState(false);

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
    queryKey: ['appointment-consultation', appointmentId],
    queryFn: () => doctorPortalApi.getConsultation(appointmentId),
    enabled: Boolean(appointmentId),
  });

  const videoAccessQuery = useQuery({
    queryKey: ['appointment-video', appointmentId],
    queryFn: () => telehealthApi.getVideoAccess(appointmentId),
    enabled: Boolean(appointmentId),
    refetchInterval: 12_000,
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
  const appointmentStatus = String(
    data?.appointment?.status || data?.status || '',
  ).toLowerCase();

  const resolvedVideo = useMemo(
    () => resolveVideoRoomFromAccess(videoAccessQuery.data),
    [videoAccessQuery.data],
  );

  // Prefer Medzoos logged-in doctor profile — never a separate Jitsi account
  const doctorDisplayName =
    partner?.name ||
    resolvedVideo.displayName ||
    data?.doctor?.name ||
    data?.appointment?.doctor?.name ||
    'Doctor';

  const [url, setUrl] = useState(
    isDirectMeetUrl(route.params.meetingUrl) ? route.params.meetingUrl! : '',
  );
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    const { jitsiRoom, embedUrl, host, allowed, reason } = resolvedVideo;
    if (!allowed) {
      setUrl('');
      setWebViewReady(false);
      setVideoError(reason || 'Video is not available yet.');
      return;
    }
    if (embedUrl && isDirectMeetUrl(embedUrl)) {
      setVideoError(null);
      setUrl(embedUrl);
      return;
    }
    if (jitsiRoom) {
      setVideoError(null);
      setUrl(buildJitsiMeetUrl(jitsiRoom, doctorDisplayName, host || undefined));
      return;
    }
    if (isDirectMeetUrl(route.params.meetingUrl)) {
      setVideoError(null);
      setUrl(route.params.meetingUrl!);
      return;
    }
    setUrl('');
    setWebViewReady(false);
    if (!videoAccessQuery.isLoading) {
      setVideoError('Video room is not ready yet. Confirm the visit first.');
    }
  }, [
    resolvedVideo,
    doctorDisplayName,
    route.params.meetingUrl,
    videoAccessQuery.isLoading,
  ]);

  useEffect(() => {
    const data = videoQuery.data;
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
      const existingRx =
        data.appointment?.prescription?.items ||
        data.prescription?.items;
      if (Array.isArray(existingRx) && existingRx.length > 0) {
        setRxItems(
          existingRx.map((item: any) => ({
            medicine: String(item?.medicine || item?.name || ''),
            dosage: String(item?.dosage || item?.dose || '1 Tablet'),
            frequency: String(item?.frequency || 'Once daily'),
            duration: String(item?.duration || '3 Days'),
            instructions: String(item?.instructions || 'Take after meals'),
          })),
        );
      }
      setHydrated(true);
    }
  }, [videoQuery.data, hydrated]);

  const startConsultMut = useMutation({
    mutationFn: () =>
      doctorPortalApi.updateAppointmentStatus(appointmentId, 'in_progress'),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({
        queryKey: ['appointment-consultation', appointmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['appointment-video', appointmentId],
      });
      await Promise.all([videoQuery.refetch(), videoAccessQuery.refetch()]);
    },
    onError: (error: Error) => {
      Alert.alert(
        'Could not start',
        error.message || 'Unable to start consultation.',
      );
    },
  });

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
        follow_up_date: resolveFollowUpDate(followUp),
      });
      const currentStatus = String(
        videoQuery.data?.appointment?.status || '',
      ).toLowerCase();
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
          // Already in progress / completed — continue to complete
        }
      }
      return doctorPortalApi.updateAppointmentStatus(appointmentId, 'completed', notes);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-stats'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-follow-ups'] });
      if (result?.alreadyCompleted) {
        Alert.alert('Saved', 'Notes updated. This consultation was already completed.');
        return;
      }
      Alert.alert('Consultation Completed', 'Clinical documentation and consultation record saved.');
      navigation.goBack();
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const issueRxMut = useMutation({
    mutationFn: () => {
      const validItems = rxItems
        .filter(it => it.medicine.trim().length > 0)
        .map(it => ({
          name: it.medicine.trim(),
          medicine: it.medicine.trim(),
          dosage: it.dosage,
          frequency: it.frequency,
          duration: it.duration,
          instructions: it.instructions,
        }));
      if (validItems.length === 0) {
        throw new Error('Enter at least one medicine name before signing.');
      }
      return doctorPortalApi.createPrescription({
        appointment_id: appointmentId,
        items: validItems,
        notes: clinicalSummary || 'Take medications as prescribed.',
        sign: true,
      });
    },
    onSuccess: () => {
      setRxItems(prev => {
        const filled = prev.filter(it => it.medicine.trim());
        return filled.length ? filled : [EMPTY_RX];
      });
      setRxModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['appointment-consultation', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment-video', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
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
      <StatusBar barStyle="light-content" backgroundColor="#07141C" />

      {/* Cinematic Video Stage */}
      <View
        style={[styles.videoStage, { height: videoStageHeight, paddingTop: topInset }]}
        pointerEvents="box-none">
        {url ? (
          <TelehealthVideoWebView
            url={url}
            style={styles.patientVideoFeed}
            muted={isMuted}
            cameraOff={isCameraOff}
            onReadyChange={setWebViewReady}
            loadingLabel="Connecting secure session…"
          />
        ) : (
          <>
            <View style={[styles.patientVideoFeed, styles.videoPlaceholder]}>
              <Text style={styles.videoPlaceholderInitial}>
                {(patientName || 'P').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.videoConnectingCard}>
              {videoAccessQuery.isLoading || videoQuery.isLoading ? (
                <ActivityIndicator color={colors.mint} />
              ) : (
                <Video size={22} color={colors.mint} strokeWidth={2} />
              )}
              <Text style={styles.videoConnectingTitle}>
                {videoAccessQuery.isLoading || videoQuery.isLoading
                  ? 'Preparing room'
                  : videoError || 'Waiting for video link'}
              </Text>
              <Text style={styles.videoConnectingSub}>
                Same secure Jitsi room as the patient app & website
              </Text>
              {appointmentStatus === 'confirmed' || appointmentStatus === 'pending' ? (
                <Pressable
                  style={styles.startConsultBtn}
                  disabled={startConsultMut.isPending}
                  onPress={() => startConsultMut.mutate()}>
                  {startConsultMut.isPending ? (
                    <ActivityIndicator color="#041016" />
                  ) : (
                    <Text style={styles.startConsultBtnText}>
                      Start consultation & admit patient
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </>
        )}

        {/* Gradient scrims only while waiting — hide when live so Jitsi UI stays visible */}
        {!webViewReady ? (
          <>
            <View style={styles.videoTopScrim} pointerEvents="none" />
            <View style={styles.videoBottomScrim} pointerEvents="none" />
          </>
        ) : null}

        {/* Top overlay */}
        <View style={[styles.videoTopBar, { top: topInset + 8 }]} pointerEvents="box-none">
          <Pressable
            style={styles.glassIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back"
            hitSlop={8}>
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.videoPatientMetaCol} pointerEvents="none">
            <Text style={styles.videoPatientName} numberOfLines={1}>
              {patientName}
            </Text>
            <View style={styles.videoSubRow}>
              <Text style={styles.videoPatientSub}>Teleconsult</Text>
              <View style={styles.timerPill}>
                <View style={styles.recordingDot} />
                <Text style={styles.timerPillText}>{formatTime(seconds)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.videoTopRightCol} pointerEvents="none">
            <View style={styles.connectionBadge}>
              <Wifi size={11} color={colors.mint} strokeWidth={2.4} />
              <Text style={styles.connectionText}>
                {url && webViewReady ? 'Live' : 'Standby'}
              </Text>
            </View>
            {/* Decorative PiP covers Jitsi local video — only show while connecting */}
            {!webViewReady ? (
              <View style={styles.doctorPipWrap}>
                <View style={[styles.doctorPipImg, styles.doctorPipFallback]}>
                  <Text style={styles.doctorPipInitial}>Dr</Text>
                </View>
                {isCameraOff && (
                  <View style={styles.pipCameraOff}>
                    <VideoOff size={14} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </View>

        {/* Floating call controls — sit above Jitsi toolbar area */}
        <View style={styles.callControlsFloatingBar} pointerEvents="box-none">
          <View style={styles.callControlsGlass}>
            <Pressable
              style={[styles.controlCircleBtn, isMuted && styles.controlCircleBtnMuted]}
              onPress={() => setIsMuted(!isMuted)}
              accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? (
                <MicOff size={18} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <Mic size={18} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </Pressable>

            <Pressable
              style={[styles.controlCircleBtn, isCameraOff && styles.controlCircleBtnMuted]}
              onPress={() => setIsCameraOff(!isCameraOff)}
              accessibilityLabel={isCameraOff ? 'Camera on' : 'Camera off'}>
              {isCameraOff ? (
                <VideoOff size={18} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <Video size={18} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </Pressable>

            <Pressable
              style={[styles.controlCircleBtn, !isSpeakerOn && styles.controlCircleBtnMuted]}
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
              accessibilityLabel={isSpeakerOn ? 'Speaker off' : 'Speaker on'}>
              {isSpeakerOn ? (
                <Volume2 size={18} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <VolumeX size={18} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </Pressable>

            <Pressable
              style={styles.endCallPillBtn}
              onPress={() =>
                Alert.alert(
                  'End Consultation',
                  'Finish this virtual session and save clinical notes?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Complete & End',
                      style: 'destructive',
                      onPress: () => endCallMut.mutate(),
                    },
                  ],
                )
              }>
              <PhoneOff size={15} color="#FFFFFF" strokeWidth={2.4} />
              {!isCompact && <Text style={styles.endCallPillText}>End</Text>}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Clinical Workspace Sheet */}
      <KeyboardAvoidingView
        style={styles.workspaceSheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <View style={styles.sheetHandleRow}>
          <View style={styles.sheetHandle} />
        </View>

        <View style={styles.sessionStrip}>
          <View style={styles.sessionStripLeft}>
            <View style={styles.sessionLiveDot} />
            <Text style={styles.sessionStripTitle}>Clinical Workspace</Text>
          </View>
          <View style={styles.sessionIdPill}>
            <ShieldCheck size={11} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.sessionIdText}>
              #{String(appointmentId || 'SESSION').slice(-6).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Scrollable workspace tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}>
          {WORKSPACE_TABS.map(tab => {
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
                  style={[styles.tabLabelText, isActive && styles.tabLabelTextActive]}
                  numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Dynamic Tab Body */}
        <ScrollView
          contentContainerStyle={[
            styles.tabBodyScroll,
            { paddingBottom: 100 + Math.max(insets.bottom, 10) },
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          keyboardDismissMode="interactive"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic">
          {/* TAB 1: Symptoms */}
          {activeTab === 'symptoms' && (
            <View style={styles.tabSection}>
              <View style={styles.cardBox}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Chief Complaint</Text>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityBadgeText}>Today</Text>
                  </View>
                </View>
                <Text style={styles.chiefComplaintText}>
                  “Severe throbbing headache on the right side with nausea and intense light
                  sensitivity since yesterday evening.”
                </Text>
              </View>

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
                      blurOnSubmit={false}
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
            </View>
          )}

          {/* TAB 2: Diagnosis */}
          {activeTab === 'diagnosis' && (
            <View style={styles.tabSection}>
              <View style={styles.cardBox}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Provisional Diagnosis</Text>
                  <Pencil size={14} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.diagnosisHighlightBox}>
                  <Activity size={18} color={colors.primary} strokeWidth={2.2} />
                  <TextInput
                    style={styles.diagnosisHighlightInput}
                    value={provisionalDiagnosis}
                    onChangeText={setProvisionalDiagnosis}
                    placeholder="Enter provisional diagnosis…"
                    placeholderTextColor={colors.primaryLight}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Clinical Examination</Text>
                <TextInput
                  style={styles.summaryTextInput}
                  multiline
                  value={clinicalSummary}
                  onChangeText={setClinicalSummary}
                  placeholder="Examination findings, systems review…"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Differential Considerations</Text>
                <View style={styles.differentialRow}>
                  <View style={styles.diffDot} />
                  <Text style={styles.diffText}>Tension-type Headache (rule out)</Text>
                </View>
                <View style={styles.differentialRow}>
                  <View style={styles.diffDot} />
                  <Text style={styles.diffText}>Sinus headache (no congestion noted)</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 3: Treatment Plan */}
          {activeTab === 'treatment' && (
            <View style={styles.tabSection}>
              <View style={styles.cardBox}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Treatment Plan</Text>
                  <Pressable onPress={() => setRxModalOpen(true)} hitSlop={6}>
                    <Text style={styles.quickRxLink}>+ Prescribe</Text>
                  </Pressable>
                </View>

                {treatmentNotes.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <FileText size={18} color={colors.textMuted} strokeWidth={2} />
                    <Text style={styles.emptyStateText}>
                      No treatment steps yet. Add advice or open Prescribe.
                    </Text>
                  </View>
                ) : (
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
                )}

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

              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Patient Lifestyle Advice</Text>
                <TextInput
                  style={styles.summaryTextInput}
                  multiline
                  value={patientEducation}
                  onChangeText={setPatientEducation}
                  placeholder="Rest, hydration, red-flag symptoms…"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          )}

          {/* TAB 4: Follow-up & Lab Orders */}
          {activeTab === 'followup' && (
            <View style={styles.tabSection}>
              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Follow-up</Text>
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
                        {isCompact ? dur.replace(' Days', 'd').replace(' Weeks', 'w').replace(' Month', 'mo') : dur}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.cardBox}>
                <Text style={styles.cardTitle}>Internal Notes</Text>
                <TextInput
                  style={styles.summaryTextInput}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Private clinical notes for this record…"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Pressable
                style={styles.labCtaBanner}
                onPress={() => setLabOpen(true)}>
                <View style={styles.labCtaIconWrap}>
                  <FlaskConical size={20} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.labCtaTitle}>Order Lab Tests</Text>
                  <Text style={styles.labCtaSub}>CBC · Thyroid · Electrolytes · more</Text>
                </View>
                <View style={styles.labCtaChevron}>
                  <Plus size={16} color={colors.primary} strokeWidth={2.4} />
                </View>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Persistent Bottom Clinical Actions Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable
            style={styles.barSecondaryBtn}
            onPress={() => setRxModalOpen(true)}>
            <Pill size={16} color={colors.primary} strokeWidth={2.2} />
            {!isCompact && <Text style={styles.barSecondaryBtnText}>Rx</Text>}
          </Pressable>

          <Pressable
            style={styles.barSecondaryBtn}
            onPress={() => setLabOpen(true)}>
            <FlaskConical size={16} color={colors.primary} strokeWidth={2.2} />
            {!isCompact && <Text style={styles.barSecondaryBtnText}>Labs</Text>}
          </Pressable>

          <Pressable
            style={styles.barPrimaryBtn}
            onPress={() => endCallMut.mutate()}
            disabled={endCallMut.isPending}>
            {endCallMut.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.2} />
            )}
            <Text style={styles.barPrimaryBtnText}>
              {endCallMut.isPending ? 'Saving…' : 'Complete Visit'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Quick E-Prescription Builder Modal */}
      <Modal
        visible={rxModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRxModalOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                <Plus size={16} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.addMedRowText}>+ Add Another Medicine</Text>
              </Pressable>

              <Pressable
                style={styles.modalIssueBtn}
                onPress={() => {
                  const hasMedicine = rxItems.some(it => it.medicine.trim());
                  if (!hasMedicine) {
                    Alert.alert(
                      'Medicine required',
                      'Please enter a medicine name before signing the prescription.',
                    );
                    return;
                  }
                  issueRxMut.mutate();
                }}
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
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
    backgroundColor: '#07141C',
  },

  /* Video Stage */
  videoStage: {
    backgroundColor: '#07141C',
    position: 'relative',
    overflow: 'hidden',
  },
  patientVideoFeed: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A1924',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderInitial: {
    fontSize: 64,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
  },
  videoTopScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(7, 20, 28, 0.55)',
  },
  videoBottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: 'rgba(7, 20, 28, 0.5)',
  },
  videoLoadingWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07141C',
    gap: 10,
  },
  videoLoadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mint,
  },
  videoConnectingCard: {
    position: 'absolute',
    alignSelf: 'center',
    top: '38%',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0, 78, 82, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(221, 246, 242, 0.2)',
  },
  videoConnectingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  videoConnectingSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  startConsultBtn: {
    marginTop: 10,
    backgroundColor: colors.mint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  startConsultBtnText: {
    color: '#041016',
    fontSize: 12,
    fontWeight: '800',
  },

  videoTopBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 10,
    gap: 10,
  },
  glassIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPatientMetaCol: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  videoPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  videoSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  videoPatientSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  timerPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  videoTopRightCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 109, 114, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(221, 246, 242, 0.28)',
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mint,
    letterSpacing: 0.2,
  },
  doctorPipWrap: {
    width: 52,
    height: 68,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    backgroundColor: '#000',
    ...shadows.cardElevated,
  },
  doctorPipImg: {
    width: '100%',
    height: '100%',
  },
  doctorPipFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorPipInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pipCameraOff: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7,20,28,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  callControlsFloatingBar: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  callControlsGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(7, 20, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  controlCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 109, 114, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCircleBtnMuted: {
    backgroundColor: 'rgba(240, 82, 82, 0.9)',
  },
  endCallPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.pill,
    minWidth: 42,
    justifyContent: 'center',
  },
  endCallPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Workspace */
  workspaceSheet: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -16,
    overflow: 'hidden',
    ...shadows.cardElevated,
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: colors.surface,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sessionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sessionStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
  },
  sessionStripTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sessionIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.aqua,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  sessionIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  tabsScroll: {
    backgroundColor: colors.surface,
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActive: {
    backgroundColor: colors.aqua,
    borderColor: '#B4E8E1',
  },
  tabLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  tabBodyScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tabSection: {
    gap: 12,
  },

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
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  priorityBadge: {
    backgroundColor: colors.aqua,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  chiefComplaintText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  cardSubCount: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

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
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  symptomChipChecked: {
    backgroundColor: colors.aqua,
    borderColor: '#B4E8E1',
  },
  checkboxCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  symptomChipText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    flexShrink: 1,
  },
  symptomChipTextChecked: {
    color: colors.primaryDark,
    fontWeight: '700',
  },

  diagnosisHighlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B4E8E1',
  },
  diagnosisHighlightInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    padding: 0,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  summaryTextInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  differentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  diffText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },

  quickRxLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  treatmentListWrap: {
    gap: 8,
  },
  treatmentItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  treatmentIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treatmentIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  treatmentItemText: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 17,
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
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
    paddingVertical: 10,
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
  labCtaBanner: {
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
  labCtaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labCtaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  labCtaSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  labCtaChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  addBtnText: {
    fontSize: 12,
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
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
  },
  addInlineSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  addInlineSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

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
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    ...shadows.cardElevated,
  },
  barSecondaryBtn: {
    height: 44,
    minWidth: 48,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#B4E8E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  barSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  barPrimaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  barPrimaryBtnText: {
    fontSize: 13,
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
