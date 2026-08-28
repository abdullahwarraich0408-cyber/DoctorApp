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
  CheckCircle2,
  CalendarCheck,
  MessageSquare,
  Folder,
  XCircle,
  Copy,
  ChevronRight,
  ShieldCheck,
  X,
  FileText,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { mapAppointment } from '../../lib/mappers/doctorPortal';
import { StatusChip } from '../../components/StatusChip';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
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

          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Patient Summary Card */}
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
                <Calendar size={12} color={colors.primary} strokeWidth={2} />
                <Text style={styles.appointmentTimeText}>
                  {appointment.date || 'Today, May 14, 2025'} • {appointment.time}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.modeBadgeWrap}>
            <View style={styles.modePill}>
              {isVideo ? (
                <Video size={12} color={colors.primary} strokeWidth={2} />
              ) : (
                <Building size={12} color={colors.primary} strokeWidth={2} />
              )}
              <Text style={styles.modePillText}>{appointment.type}</Text>
            </View>
          </View>
        </View>

        {/* Appointment Lifecycle Stepper */}
        <View style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            {/* Step 1: Booked */}
            <View style={styles.stepCol}>
              <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
                <Check size={12} color="#FFFFFF" strokeWidth={3} />
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

        {/* Grouped Clinical Information */}
        <View style={styles.clinicalGroupCard}>
          {/* Chief Complaint */}
          <View style={styles.clinicalSection}>
            <Text style={styles.sectionLabel}>Chief Complaint</Text>
            <Text style={styles.sectionBodyText}>{appointment.complaint}</Text>
          </View>

          <View style={styles.clinicalDivider} />

          {/* Symptoms */}
          <Pressable
            style={styles.clinicalSectionRow}
            onPress={() =>
              Alert.alert('Symptoms', appointment.symptoms.join(', '))
            }>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Symptoms</Text>
              <Text style={styles.sectionBodyText}>
                {appointment.symptoms.join(', ')}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          <View style={styles.clinicalDivider} />

          {/* Appointment Timeline */}
          <View style={styles.clinicalSection}>
            <Text style={styles.sectionLabel}>Appointment Timeline</Text>
            <Text style={styles.sectionBodyText}>{appointment.timeRange}</Text>
          </View>

          <View style={styles.clinicalDivider} />

          {/* Consultation Notes */}
          <Pressable
            style={styles.clinicalSectionRow}
            onPress={() =>
              navigation.navigate('Consultation', {
                appointmentId: appointment.id,
                patientName: appointment.patient,
              })
            }>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Consultation Notes</Text>
              <Text style={[styles.sectionBodyText, { color: colors.textMuted }]}>
                {appointment.notes}
              </Text>
            </View>
            <FileText size={18} color={colors.primary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Side-by-Side Information Cards */}
        <View style={styles.sideBySideRow}>
          {/* Payment Details Card */}
          <View style={styles.halfCard}>
            <Text style={styles.halfCardTitle}>Payment Details</Text>
            <View style={styles.halfCardContent}>
              <Text style={styles.feeSubLabel}>Consultation Fee</Text>
              <Text style={styles.feeMainVal}>{appointment.fee}</Text>

              <View style={styles.paidStatusRow}>
                <Text style={styles.paidText}>Paid {appointment.paidAmount}</Text>
                <View style={styles.paidCheckDot}>
                  <Check size={8} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>
            </View>
          </View>

          {/* Appointment Info Card */}
          <View style={styles.halfCard}>
            <Text style={styles.halfCardTitle}>Appointment Info</Text>
            <View style={styles.halfCardContent}>
              <Text style={styles.feeSubLabel}>Appointment ID</Text>
              <View style={styles.copyIdRow}>
                <Text style={styles.idCodeText}>{appointment.appointmentCode}</Text>
                <Copy size={12} color={colors.primary} strokeWidth={2} />
              </View>

              <View style={styles.roomRow}>
                <Building size={12} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.roomText}>{appointment.room}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Clinical Action Buttons */}
        <View style={styles.actionsSection}>
          {/* Row 1: Confirm & Start Consultation */}
          <View style={styles.actionsRow}>
            {appointment.status !== 'confirmed' && (
              <Pressable
                style={styles.confirmBtn}
                onPress={() => statusMut.mutate('confirmed')}
                disabled={statusMut.isPending}>
                <CalendarCheck size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.startConsultBtn}
              onPress={() =>
                navigation.navigate('Video', {
                  appointmentId: appointment.id,
                })
              }>
              <Video size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.startConsultBtnText}>Start Consultation</Text>
            </Pressable>
          </View>

          {/* Row 2: Open Chat & View Records */}
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.outlineActionBtn}
              onPress={() =>
                navigation.navigate('Chat', {
                  appointmentId: appointment.id,
                  patientName: appointment.patient,
                })
              }>
              <MessageSquare size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.outlineActionBtnText}>Open Chat</Text>
            </Pressable>

            <Pressable
              style={styles.outlineActionBtn}
              onPress={() =>
                navigation.navigate('PatientDetail', {
                  patientId: appointment.id,
                })
              }>
              <Folder size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.outlineActionBtnText}>View Records</Text>
            </Pressable>
          </View>

          {/* Row 3: Cancel Appointment */}
          {appointment.status !== 'cancelled' && (
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setCancelModalVisible(true)}>
              <XCircle size={16} color={colors.danger} strokeWidth={2} />
              <Text style={styles.cancelBtnText}>Cancel with Reason</Text>
            </Pressable>
          )}
        </View>

        {/* End-to-End Encryption Banner */}
        <View style={styles.securityFooter}>
          <ShieldCheck size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.securityFooterText}>
            Secure & Confidential • End-to-end encrypted consultation
          </Text>
        </View>
      </ScrollView>

      {/* Cancellation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Appointment</Text>
              <Pressable onPress={() => setCancelModalVisible(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: TAB_BAR_CLEARANCE + 30,
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

  /* Patient Card */
  patientCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
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
    gap: 12,
    flex: 1,
  },
  patientAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientMetaCol: {
    flex: 1,
    gap: 2,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  patientRolePill: {
    backgroundColor: colors.aqua,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  patientRoleText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  demographicsText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  appointmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Stepper Card */
  stepperCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
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

  /* Clinical Info Group */
  clinicalGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
  },
  clinicalSection: {
    gap: 2,
  },
  clinicalSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionBodyText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  clinicalDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  /* Side-by-Side Cards */
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    ...shadows.cardSoft,
  },
  halfCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  halfCardContent: {
    gap: 2,
  },
  feeSubLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  feeMainVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paidStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  paidText: {
    fontSize: 10,
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
    gap: 4,
  },
  idCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  roomText: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  /* Actions Section */
  actionsSection: {
    gap: 10,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startConsultBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  startConsultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  outlineActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outlineActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  cancelBtn: {
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: '#FED7D7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },

  /* Security Footer */
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
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
    height: 40,
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
