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
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapAppointment } from '../../lib/mappers/doctorPortal';
import { StatusChip } from '../../components/StatusChip';
import { colors, radius, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

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
    if (rawAppointment) {
      return {
        ...rawAppointment,
        age: rawAppointment.age || 32,
        gender: rawAppointment.gender || 'Female',
        complaint:
          rawAppointment.reason ||
          'Recurring migraine with nausea and light sensitivity.',
        symptoms: ['Headache', 'Nausea', 'Light Sensitivity'],
        timeRange: '10:00 AM - 10:20 AM (20 mins)',
        notes: 'No notes added yet',
        fee: 'PKR 2,500',
        paidAmount: 'PKR 2,500',
        appointmentCode: 'MD9505141000',
        room: 'Video Room 1',
        isPaid: true,
        avatar:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
      };
    }
    return {
      id: route.params.appointmentId || 'default-1',
      patient: 'Ayesha Malik',
      age: 32,
      gender: 'Female',
      date: 'Today, May 14, 2025',
      time: '10:00 AM',
      type: 'Video Visit',
      status: 'confirmed',
      complaint: 'Recurring migraine with nausea and light sensitivity.',
      symptoms: ['Headache', 'Nausea', 'Light Sensitivity'],
      timeRange: '10:00 AM - 10:20 AM (20 mins)',
      notes: 'No notes added yet',
      fee: 'PKR 2,500',
      paidAmount: 'PKR 2,500',
      appointmentCode: 'MD9505141000',
      room: 'Video Room 1',
      isPaid: true,
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    };
  }, [rawAppointment, route.params.appointmentId]);

  const statusMut = useMutation({
    mutationFn: (newStatus: 'confirmed' | 'cancelled' | 'in_progress') =>
      doctorPortalApi.updateAppointmentStatus(
        appointment.id,
        newStatus,
        cancelReason || undefined,
      ),
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      setCancelModalVisible(false);
      setCancelReason('');
      Alert.alert(
        'Status Updated',
        `Appointment is now marked as ${newStatus.replace('_', ' ')}.`,
      );
    },
    onError: (err: Error) => Alert.alert('Could not update status', err.message),
  });

  const isVideo = appointment.type?.toLowerCase().includes('video');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header Bar */}
      <View style={[styles.headerSection, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            hitSlop={8}>
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          <Text style={styles.headerTitle}>Appointment Details</Text>
          <StatusChip status={appointment.status} />
        </View>
      </View>

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
            <Image
              source={{ uri: appointment.avatar }}
              style={styles.patientAvatarImg}
            />
            <View style={styles.patientMetaCol}>
              <View style={styles.patientNameRow}>
                <Text style={styles.patientNameText}>{appointment.patient}</Text>
                <View style={styles.patientRolePill}>
                  <Text style={styles.patientRoleText}>Patient</Text>
                </View>
              </View>

              <Text style={styles.demographicsText}>
                {appointment.age} Years • {appointment.gender}
              </Text>

              <View style={styles.appointmentTimeRow}>
                <Calendar size={13} color={colors.primary} strokeWidth={2} />
                <Text style={styles.appointmentTimeText}>
                  {appointment.date || 'Today, May 14, 2025'} • {appointment.time}
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
            {/* Step 1: Booked */}
            <View style={styles.stepCol}>
              <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
                <Check size={11} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text style={styles.stepTitle}>Booked</Text>
              <Text style={styles.stepTime}>May 13, 9:15 PM</Text>
            </View>

            <View style={[styles.stepLine, styles.stepLineActive]} />

            {/* Step 2: Confirmed */}
            <View style={styles.stepCol}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <View style={styles.stepInnerDot} />
              </View>
              <Text style={[styles.stepTitle, styles.stepTitleActive]}>
                Confirmed
              </Text>
              <Text style={styles.stepTime}>May 14, 8:30 AM</Text>
            </View>

            <View style={styles.stepLine} />

            {/* Step 3: In Progress */}
            <View style={styles.stepCol}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <Text style={styles.stepTitle}>In Progress</Text>
              <Text style={styles.stepTime}>-</Text>
            </View>

            <View style={styles.stepLine} />

            {/* Step 4: Completed */}
            <View style={styles.stepCol}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>4</Text>
              </View>
              <Text style={styles.stepTitle}>Completed</Text>
              <Text style={styles.stepTime}>-</Text>
            </View>
          </View>
        </View>

        {/* Clinical Summary Card */}
        <View style={styles.clinicalCard}>
          <Text style={styles.cardHeaderTitle}>CLINICAL SUMMARY</Text>

          {/* Chief Complaint */}
          <View style={styles.clinicalBox}>
            <Text style={styles.boxLabel}>Chief Complaint</Text>
            <Text style={styles.boxValueText}>{appointment.complaint}</Text>
          </View>

          {/* Symptoms */}
          <View style={styles.symptomsContainer}>
            <Text style={styles.boxLabel}>Reported Symptoms</Text>
            <View style={styles.symptomsPillsRow}>
              {appointment.symptoms.map((symptom: string, idx: number) => (
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
          {/* Dominant Start Consultation Button */}
          <Pressable
            style={styles.startConsultBtn}
            onPress={() =>
              navigation.navigate('Video', {
                appointmentId: appointment.id,
              })
            }>
            <Video size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.startConsultBtnText}>Start Consultation</Text>
          </Pressable>

          {/* Twin Action Row: Chat & View Records */}
          <View style={styles.twinActionsRow}>
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

            <Pressable
              style={styles.twinActionBtn}
              onPress={() =>
                navigation.navigate('PatientDetail', {
                  patientId: appointment.id,
                })
              }>
              <Folder size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.twinActionBtnText}>Records</Text>
            </Pressable>
          </View>

          {/* Confirm Button if not confirmed */}
          {appointment.status !== 'confirmed' && (
            <Pressable
              style={styles.confirmBtn}
              onPress={() => statusMut.mutate('confirmed')}
              disabled={statusMut.isPending}>
              <CalendarCheck size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.confirmBtnText}>Confirm Visit</Text>
            </Pressable>
          )}

          {/* Minimal Cancel Button */}
          {appointment.status !== 'cancelled' && (
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
    backgroundColor: colors.primary,
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
    borderRadius: radius.full,
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
