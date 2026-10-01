import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  Platform,
  StatusBar,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Building,
  Check,
  CalendarCheck,
  MessageSquare,
  Folder,
  XCircle,
  Copy,
  ShieldCheck,
  X,
  FileText,
  UserCheck,
  Play,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { formatDate, mapAppointment } from '../../lib/mappers/doctorPortal';
import { StatusChip } from '../../components/StatusChip';
import { colors, radius, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import TabScreenHeader from '../../components/TabScreenHeader';
import type { RootStackParamList } from '../../navigation/types';

function formatStepperDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildStepperSteps(appointment: any, status: string) {
  const created = appointment?.raw?.created_at
    ? formatStepperDate(appointment.raw.created_at)
    : 'Scheduled';
  const updated = appointment?.raw?.updated_at
    ? formatStepperDate(appointment.raw.updated_at)
    : '';

  const steps = [
    { key: 'booked', title: 'Booked', time: created },
    { key: 'confirmed', title: 'Confirmed', time: '' },
    { key: 'in_progress', title: 'In Progress', time: '' },
    { key: 'completed', title: 'Completed', time: '' },
  ];

  let activeIndex = 0;
  if (status === 'completed') activeIndex = 3;
  else if (status === 'in_progress') activeIndex = 2;
  else if (status === 'confirmed' || status === 'checked_in') activeIndex = 1;
  else if (status === 'cancelled' || status === 'no_show') activeIndex = 1;

  if (activeIndex >= 1) steps[1].time = updated || steps[1].time;
  if (activeIndex >= 2) steps[2].time = updated || '-';
  if (status === 'completed') {
    steps[3].time = updated || '-';
    steps[2].time = steps[2].time || updated || '-';
  }

  return steps.map((step, index) => {
    let state: 'done' | 'active' | 'todo' = 'todo';
    if (status === 'completed') {
      state = 'done';
    } else if (status === 'cancelled' || status === 'no_show') {
      state = index === 0 ? 'done' : index === 1 ? 'active' : 'todo';
    } else if (index < activeIndex) {
      state = 'done';
    } else if (index === activeIndex) {
      state = 'active';
    }
    return { ...step, state };
  });
}

export function AppointmentDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'AppointmentDetail'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const query = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => doctorPortalApi.getAppointments(),
  });

  const rawAppointment = useMemo(() => {
    const list = (
      Array.isArray(query.data) ? query.data : query.data?.appointments || []
    ).map(mapAppointment);
    return list.find((item: any) => item.id === route.params.appointmentId);
  }, [query.data, route.params.appointmentId]);

  const appointment = useMemo(() => {
    if (!rawAppointment) return null;
    const feeValue = rawAppointment.raw?.fee ?? rawAppointment.raw?.doctor?.fee;
    const paid =
      String(rawAppointment.paymentStatus || '').toLowerCase() === 'paid';
    return {
      ...rawAppointment,
      age: rawAppointment.raw?.customer?.profile_data?.age || rawAppointment.raw?.customer?.age,
      gender:
        rawAppointment.raw?.customer?.profile_data?.gender ||
        rawAppointment.raw?.customer?.gender,
      complaint: rawAppointment.reason || '',
      symptoms: Array.isArray(rawAppointment.raw?.consultation?.symptoms)
        ? rawAppointment.raw.consultation.symptoms
        : [],
      timeRange: rawAppointment.time || '',
      notes: rawAppointment.consultationNotes || 'No notes added yet',
      fee: feeValue != null ? `PKR ${Number(feeValue).toLocaleString()}` : '—',
      paidAmount: paid && feeValue != null ? `PKR ${Number(feeValue).toLocaleString()}` : '—',
      appointmentCode: `APT-${String(rawAppointment.id).slice(0, 8).toUpperCase()}`,
      room: rawAppointment.isOnline ? 'Video Room' : 'Clinic',
      isPaid: paid,
      patientId: rawAppointment.patientId,
    };
  }, [rawAppointment]);

  const statusMut = useMutation({
    mutationFn: (payload: string | { status: string; notes?: string; no_show_reason?: string }) => {
      const next =
        typeof payload === 'string'
          ? { status: payload, notes: cancelReason || undefined }
          : payload;
      return doctorPortalApi.updateAppointmentStatus(
        appointment.id,
        next.status,
        next.notes,
        next.no_show_reason ? { no_show_reason: next.no_show_reason } : undefined,
      );
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      setCancelModalVisible(false);
      setCancelReason('');
      const newStatus = typeof payload === 'string' ? payload : payload.status;
      Alert.alert(
        'Status Updated',
        newStatus === 'no_show'
          ? 'Patient marked as no-show.'
          : `Appointment is now marked as ${String(newStatus).replace('_', ' ')}.`,
      );
    },
    onError: (err: Error) => Alert.alert('Could not update status', err.message),
  });

  const isVideo =
    Boolean(appointment?.isOnline) ||
    String(appointment?.type || '')
      .toLowerCase()
      .includes('online') ||
    String(appointment?.type || '')
      .toLowerCase()
      .includes('video');

  const status = String(appointment?.status || '').toLowerCase();
  const isTerminal = status === 'completed' || status === 'cancelled' || status === 'no_show';
  const isInPerson =
    Boolean(appointment?.isInPerson) ||
    String(appointment?.consultationMode || '').toLowerCase() === 'in_person' ||
    String(appointment?.raw?.consultation_mode || '').toLowerCase() === 'in_person' ||
    String(appointment?.raw?.preferred_consultation_mode || '').toLowerCase() ===
      'in_person';
  const showOnlineTools = isVideo && !isInPerson;
  const canConfirm = status === 'pending' || status === 'booked' || status === 'upcoming';
  const canCheckIn = isInPerson && status === 'confirmed';
  const canStartVisit = isInPerson && status === 'checked_in';
  const canStartConsult =
    (showOnlineTools && (status === 'confirmed' || status === 'in_progress')) ||
    canStartVisit ||
    status === 'in_progress';
  const canMarkNoShow =
    Boolean(appointment) &&
    !isTerminal &&
    ['pending', 'confirmed', 'checked_in'].includes(status);
  const canCancel = Boolean(appointment) && !isTerminal;
  const paymentStatus = String(
    appointment?.paymentStatus || appointment?.raw?.payment_status || '',
  ).toLowerCase();
  const paymentMethod = String(
    appointment?.raw?.payment_method || '',
  ).toLowerCase();
  const canMarkPaid =
    paymentStatus === 'pay_at_clinic' ||
    paymentMethod === 'pay_at_clinic' ||
    paymentMethod === 'cod';
  const markPaidMut = useMutation({
    mutationFn: () => doctorPortalApi.markAppointmentPaid(appointment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      Alert.alert('Payment updated', 'Marked as paid at clinic.');
    },
    onError: (err: Error) => Alert.alert('Could not mark paid', err.message),
  });
  const docsQuery = useQuery({
    queryKey: ['visit-documents', appointment?.id],
    enabled: Boolean(appointment?.id),
    queryFn: () => doctorPortalApi.getVisitDocuments(appointment.id),
  });
  const visitDocs = docsQuery.data?.documents || [];
  const sharedHistoryQuery = useQuery({
    queryKey: ['shared-history', appointment?.id],
    enabled: Boolean(appointment?.id),
    queryFn: () => doctorPortalApi.getAppointmentSharedHistory(appointment.id),
  });
  const sharedHistory = sharedHistoryQuery.data?.sharedHistory || null;
  const stepperSteps = useMemo(
    () => buildStepperSteps(appointment, status),
    [appointment, status],
  );
  const followUpDate =
    appointment?.raw?.consultation?.follow_up_date ||
    appointment?.raw?.follow_up_date ||
    null;
  const followUpNotes =
    appointment?.raw?.consultation?.follow_up_notes ||
    appointment?.raw?.follow_up_notes ||
    null;

  if (query.isLoading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Loading appointment…</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700', marginBottom: 8 }}>
          Appointment not found
        </Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TabScreenHeader
        showBack
        title="Appointment Details"
        right={<StatusChip status={appointment.status} />}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}>
        
        {/* Patient Profile Card */}
        <View style={styles.patientCard}>
          <View style={styles.patientCardLeft}>
            <View style={[styles.patientAvatarImg, styles.patientAvatarFallback]}>
              <Text style={styles.patientAvatarInitial}>
                {(appointment.patient || 'P').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.patientMetaCol}>
              <View style={styles.patientNameRow}>
                <Text style={styles.patientNameText}>{appointment.patient}</Text>
                {appointment.isFollowUp ? (
                  <View style={styles.followUpPill}>
                    <Text style={styles.followUpPillText}>FOLLOW-UP</Text>
                  </View>
                ) : null}
                <View style={styles.patientRolePill}>
                  <Text style={styles.patientRoleText}>Patient</Text>
                </View>
              </View>

              <Text style={styles.demographicsText}>
                {[
                  appointment.age ? `${appointment.age} Years` : null,
                  appointment.gender || null,
                ]
                  .filter(Boolean)
                  .join(' • ') || 'Patient'}
              </Text>

              {appointment.isFollowUp && appointment.parentAppointmentId ? (
                <Text style={styles.previousVisitHint}>
                  Linked to previous visit · tap patient profile for full history
                </Text>
              ) : null}

              <View style={styles.appointmentTimeRow}>
                <Calendar size={13} color={colors.primary} strokeWidth={2} />
                <Text style={styles.appointmentTimeText}>
                  {appointment.date || 'Scheduled'}
                  {appointment.time ? ` • ${appointment.time}` : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.modeBadgeWrap}>
            <View style={styles.modePill}>
              {isVideo ? (
                <Video size={12} color={colors.primary} strokeWidth={2.2} />
              ) : (
                <Building size={12} color={colors.primary} strokeWidth={2.2} />
              )}
              <Text style={styles.modePillText}>{appointment.type}</Text>
            </View>
          </View>
        </View>

        {/* Progress Stepper */}
        <View style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            {stepperSteps.map((step, index) => (
              <React.Fragment key={step.key}>
                {index > 0 && (
                  <View
                    style={[
                      styles.stepLine,
                      (step.state === 'done' ||
                        step.state === 'active' ||
                        stepperSteps[index - 1]?.state === 'done') &&
                        styles.stepLineActive,
                    ]}
                  />
                )}
                <View style={styles.stepCol}>
                  <View
                    style={[
                      styles.stepCircle,
                      step.state === 'done' && styles.stepCircleCompleted,
                      step.state === 'active' && styles.stepCircleActive,
                    ]}>
                    {step.state === 'done' ? (
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    ) : step.state === 'active' ? (
                      <View style={styles.stepInnerDot} />
                    ) : (
                      <Text style={styles.stepNum}>{index + 1}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      step.state === 'active' && styles.stepTitleActive,
                      step.state === 'done' && styles.stepTitleDone,
                    ]}>
                    {step.title}
                  </Text>
                  <Text style={styles.stepTime}>{step.time || '-'}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Clinical Summary Card */}
        <View style={styles.clinicalCard}>
          <Text style={styles.cardHeaderTitle}>CLINICAL SUMMARY</Text>

          {/* Chief Complaint */}
          <View style={styles.clinicalBox}>
            <Text style={styles.boxLabel}>Chief Complaint</Text>
            <Text style={styles.boxValueText}>
              {appointment.complaint || 'Normal Consultation'}
            </Text>
          </View>

          {!!followUpDate && (
            <View style={[styles.clinicalBox, styles.followUpBox]}>
              <Text style={styles.boxLabel}>Scheduled Follow-up</Text>
              <Text style={styles.boxValueText}>{formatDate(followUpDate)}</Text>
              {!!followUpNotes && (
                <Text style={styles.followUpNotesValue}>{followUpNotes}</Text>
              )}
            </View>
          )}

          {/* Symptoms */}
          <View style={styles.symptomsContainer}>
            <Text style={styles.boxLabel}>Reported Symptoms</Text>
            <View style={styles.symptomsPillsRow}>
              {(appointment.symptoms || []).map((symptom: string, idx: number) => (
                <View key={idx} style={styles.symptomPill}>
                  <Text style={styles.symptomPillText}>{symptom}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Timeline & Notes */}
          <View style={styles.clinicalSubRow}>
            <View style={styles.subCol}>
              <Text style={styles.boxLabel}>Duration</Text>
              <View style={styles.inlineMetaRow}>
                <Clock size={13} color={colors.primary} strokeWidth={2} />
                <Text style={styles.inlineMetaText}>{appointment.timeRange}</Text>
              </View>
            </View>

            <Pressable
              style={styles.subCol}
              onPress={() =>
                navigation.navigate('Consultation', {
                  appointmentId: appointment.id,
                  patientName: appointment.patient,
                })
              }>
              <Text style={styles.boxLabel}>Notes</Text>
              <View style={styles.inlineMetaRow}>
                <FileText size={13} color={colors.primary} strokeWidth={2} />
                <Text style={styles.inlineNotesLink}>View Clinical Notes &gt;</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Side-by-Side Information Cards */}
        <View style={styles.sideBySideRow}>
          {/* Payment Card */}
          <View style={styles.halfCard}>
            <Text style={styles.halfCardTitle}>PAYMENT DETAILS</Text>
            <Text style={styles.feeSubLabel}>Consultation Fee</Text>
            <Text style={styles.feeMainVal}>{appointment.fee}</Text>

            <View style={styles.paidStatusRow}>
              <Text style={styles.paidText}>Paid {appointment.paidAmount}</Text>
              <View style={styles.paidCheckDot}>
                <Check size={8} color="#FFFFFF" strokeWidth={3} />
              </View>
            </View>
          </View>

          {/* Appointment Code Card */}
          <View style={styles.halfCard}>
            <Text style={styles.halfCardTitle}>APPOINTMENT INFO</Text>
            <Text style={styles.feeSubLabel}>Appointment ID</Text>
            <Pressable
              style={styles.copyIdRow}
              onPress={() =>
                Alert.alert(
                  'Copied ID',
                  `Appointment Code ${appointment.appointmentCode} copied.`,
                )
              }>
              <Text style={styles.idCodeText}>{appointment.appointmentCode}</Text>
              <Copy size={12} color={colors.primary} strokeWidth={2} />
            </Pressable>

            <View style={styles.roomRow}>
              <Building size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.roomText}>{appointment.room}</Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          {canStartConsult && (
            <Pressable
              style={styles.startConsultBtn}
              onPress={() => {
                if (showOnlineTools) {
                  navigation.navigate('Video', { appointmentId: appointment.id });
                } else {
                  navigation.navigate('Consultation', {
                    appointmentId: appointment.id,
                    patientName: appointment.patient,
                  });
                }
              }}>
              {showOnlineTools ? (
                <Video size={18} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <FileText size={18} color="#FFFFFF" strokeWidth={2.2} />
              )}
              <Text style={styles.startConsultBtnText}>
                {status === 'in_progress'
                  ? showOnlineTools
                    ? 'Continue Video'
                    : 'Continue Visit'
                  : showOnlineTools
                    ? 'Start Video'
                    : 'Start Visit'}
              </Text>
            </Pressable>
          )}

          {status === 'completed' && (
            <Pressable
              style={styles.startConsultBtn}
              onPress={() =>
                navigation.navigate('Consultation', {
                  appointmentId: appointment.id,
                  patientName: appointment.patient,
                })
              }>
              <FileText size={18} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.startConsultBtnText}>View Clinical Notes</Text>
            </Pressable>
          )}

          {canMarkPaid && paymentStatus !== 'paid' && (
            <Pressable
              style={styles.confirmBtn}
              onPress={() => markPaidMut.mutate()}
              disabled={markPaidMut.isPending}>
              <Check size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.confirmBtnText}>
                {markPaidMut.isPending ? 'Saving…' : 'Mark Cash Paid'}
              </Text>
            </Pressable>
          )}

          {/* Twin Action Row: Chat (online only) & View Records */}
          <View style={styles.twinActionsRow}>
            {showOnlineTools ? (
              <Pressable
                style={styles.twinActionBtn}
                onPress={() =>
                  navigation.navigate('Chat', {
                    appointmentId: appointment.id,
                    patientName: appointment.patient,
                  })
                }>
                <MessageSquare size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.twinActionBtnText}>Chat</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.twinActionBtn}
              onPress={() => {
                const patientId = appointment.patientId;
                if (!patientId) {
                  Alert.alert('Patient record unavailable', 'This appointment has no linked patient id.');
                  return;
                }
                navigation.navigate('PatientDetail', { patientId: String(patientId) });
              }}>
              <Folder size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.twinActionBtnText}>Records</Text>
            </Pressable>
          </View>

          <View style={styles.visitDocsCard}>
            <Text style={styles.visitDocsTitle}>Shared Medical History</Text>
            {sharedHistoryQuery.isLoading ? (
              <Text style={styles.visitDocsEmpty}>Loading…</Text>
            ) : sharedHistory?.share_state === 'revoked' ? (
              <Text style={styles.visitDocsEmpty}>
                Sharing access revoked — shared records are no longer available.
              </Text>
            ) : !sharedHistory?.grant_count ? (
              <Text style={styles.visitDocsEmpty}>
                No medical records were shared for this appointment.
              </Text>
            ) : (
              <>
                <Text style={[styles.visitDocsEmpty, { marginBottom: 6 }]}>
                  {sharedHistory.grant_count} shared record
                  {sharedHistory.grant_count === 1 ? '' : 's'} available
                </Text>
                {(sharedHistory.visit_summaries || []).map((item: any) => (
                  <View key={`vs-${item.record_id}`} style={{ marginBottom: 6 }}>
                    <Text style={styles.visitDocItem} numberOfLines={1}>
                      Visit · {item.diagnosis || 'Summary'}
                      {item.doctor_name ? ` · Dr. ${item.doctor_name}` : ''}
                    </Text>
                    {item.summary ? (
                      <Text style={styles.visitDocsEmpty} numberOfLines={2}>
                        {item.summary}
                      </Text>
                    ) : null}
                  </View>
                ))}
                {(sharedHistory.prescriptions || []).map((item: any) => (
                  <Text key={`rx-${item.record_id}`} style={styles.visitDocItem} numberOfLines={1}>
                    Rx · {item.doctor_name ? `Dr. ${item.doctor_name}` : 'Prescription'}
                  </Text>
                ))}
                {(sharedHistory.lab_reports || []).map((item: any) => (
                  <Text key={`lab-${item.record_id}`} style={styles.visitDocItem} numberOfLines={1}>
                    Lab · {item.title || 'Report'}
                  </Text>
                ))}
                {(sharedHistory.medical_documents || []).map((item: any) => (
                  <Text key={`md-${item.record_id}`} style={styles.visitDocItem} numberOfLines={1}>
                    Doc · {item.title || 'Medical document'}
                  </Text>
                ))}
                {(sharedHistory.visit_documents || []).map((item: any) => (
                  <Text key={`vd-${item.record_id}`} style={styles.visitDocItem} numberOfLines={1}>
                    Visit file · {item.title || 'Document'}
                  </Text>
                ))}
              </>
            )}
          </View>

          <View style={styles.visitDocsCard}>
            <Text style={styles.visitDocsTitle}>Visit Documents</Text>
            {docsQuery.isLoading ? (
              <Text style={styles.visitDocsEmpty}>Loading…</Text>
            ) : visitDocs.length === 0 ? (
              <Text style={styles.visitDocsEmpty}>No documents attached to this visit yet.</Text>
            ) : (
              visitDocs.map((doc: any) => (
                <Text key={doc.id} style={styles.visitDocItem} numberOfLines={1}>
                  {doc.title || doc.file_name || 'Document'} · {doc.document_type}
                </Text>
              ))
            )}
          </View>

          <Pressable
            style={styles.twinActionBtn}
            onPress={() =>
              navigation.navigate('Prescription', {
                appointmentId: appointment.id,
                patientName: appointment.patient,
              })
            }>
            <FileText size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.twinActionBtnText}>
              {appointment.prescription ? 'View / Edit Rx' : 'Create Rx'}
            </Text>
          </Pressable>

          {canConfirm && (
            <Pressable
              style={styles.confirmBtn}
              onPress={() => statusMut.mutate('confirmed')}
              disabled={statusMut.isPending}>
              <CalendarCheck size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.confirmBtnText}>Confirm Visit</Text>
            </Pressable>
          )}

          {canCheckIn && (
            <Pressable
              style={styles.confirmBtn}
              onPress={() => statusMut.mutate('checked_in')}
              disabled={statusMut.isPending}>
              <UserCheck size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.confirmBtnText}>Check In</Text>
            </Pressable>
          )}

          {status === 'checked_in' && isInPerson ? (
            <Text style={[styles.visitDocsEmpty, { marginBottom: 8 }]}>
              Patient checked in
              {appointment?.raw?.checked_in_at
                ? ` · ${new Date(appointment.raw.checked_in_at).toLocaleTimeString()}`
                : ''}
            </Text>
          ) : null}

          {canStartVisit && (
            <Pressable
              style={styles.confirmBtn}
              onPress={() => statusMut.mutate('in_progress')}
              disabled={statusMut.isPending}>
              <Play size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.confirmBtnText}>Start Visit</Text>
            </Pressable>
          )}

          {canMarkNoShow && (
            <Pressable
              style={styles.cancelLinkBtn}
              onPress={() =>
                Alert.alert('Mark No-show', 'Mark this patient as no-show?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Mark No-show',
                    style: 'destructive',
                    onPress: () => statusMut.mutate({ status: 'no_show' }),
                  },
                ])
              }>
              <XCircle size={14} color={colors.danger} strokeWidth={2} />
              <Text style={styles.cancelLinkText}>Mark No-show</Text>
            </Pressable>
          )}

          {canCancel && (
            <Pressable
              style={styles.cancelLinkBtn}
              onPress={() => setCancelModalVisible(true)}>
              <XCircle size={14} color={colors.danger} strokeWidth={2} />
              <Text style={styles.cancelLinkText}>Cancel Appointment</Text>
            </Pressable>
          )}
        </View>

        {/* Confidential Security Footer */}
        <View style={styles.securityFooter}>
          <ShieldCheck size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.securityFooterText}>
            End-to-end encrypted consultation • Confidential
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Cancellation Reason Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Appointment</Text>
              <Pressable onPress={() => setCancelModalVisible(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={true}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalSub}>
                Please provide a clinical reason or message for the patient:
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Doctor emergency or rescheduling request..."
                placeholderTextColor={colors.textMuted}
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
              />

              <View style={styles.modalButtonsRow}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setCancelModalVisible(false)}>
                  <Text style={styles.modalCancelBtnText}>Dismiss</Text>
                </Pressable>

                <Pressable
                  style={styles.modalConfirmCancelBtn}
                  onPress={() => statusMut.mutate('cancelled')}
                  disabled={statusMut.isPending}>
                  <Text style={styles.modalConfirmCancelBtnText}>
                    {statusMut.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: TAB_BAR_CLEARANCE + 30,
    gap: 14,
  },

  /* Header Section */
  headerSection: {
        paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    letterSpacing: -0.3,
  },

  /* Patient Card */
  patientCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  patientCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  patientAvatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: colors.mint,
  },
  patientAvatarFallback: {
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  patientMetaCol: {
    flex: 1,
    gap: 3,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  patientRolePill: {
    backgroundColor: colors.aqua,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  patientRoleText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  followUpPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  followUpPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  previousVisitHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  demographicsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  appointmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  appointmentTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  modeBadgeWrap: {
    alignItems: 'flex-end',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Stepper Card */
  stepperCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.cardSoft,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCol: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepCircleActive: {
    backgroundColor: colors.aqua,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  stepInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  stepNum: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepTitleActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepTitleDone: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stepTime: {
    fontSize: 8,
    color: colors.textMuted,
  },
  stepLine: {
    height: 2,
    flex: 0.6,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },

  /* Clinical Card */
  clinicalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadows.cardSoft,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  clinicalBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  followUpBox: {
    backgroundColor: colors.aqua,
    borderColor: '#B4E8E1',
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  boxValueText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    fontWeight: '500',
  },
  followUpNotesValue: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  symptomsContainer: {
    gap: 6,
  },
  symptomsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  symptomPill: {
    backgroundColor: colors.aqua,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.mint,
  },
  symptomPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  clinicalSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  subCol: {
    gap: 4,
  },
  inlineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inlineMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inlineNotesLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  /* Side-by-Side Half Cards */
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    ...shadows.cardSoft,
  },
  halfCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  feeSubLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  feeMainVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paidStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  paidText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  paidCheckDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  idCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  roomText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  /* Actions Section */
  actionsSection: {
    gap: 10,
    marginTop: 4,
  },
  startConsultBtn: {
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.cardElevated,
  },
  startConsultBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  twinActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  twinActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  twinActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  visitDocsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  visitDocsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  visitDocsEmpty: {
    fontSize: 12,
    color: colors.textMuted,
  },
  visitDocItem: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  confirmBtn: {
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelLinkBtn: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 2,
  },
  cancelLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },

  /* Security Footer */
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  securityFooterText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 63, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    gap: 12,
    ...shadows.cardElevated,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 75,
    textAlignVertical: 'top',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
