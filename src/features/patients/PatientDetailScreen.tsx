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
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MoreVertical,
  AlertTriangle,
  ChevronRight,
  Stethoscope,
  Calendar,
  Pill,
  FlaskConical,
  FileText,
  Send,
  MessageSquare,
  CalendarClock,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { formatDate, mapPatientClinicalHistory } from '../../lib/mappers/doctorPortal';
import { colors, radius, shadows } from '../../theme';
import PatientInfoCard from '../../components/PatientInfoCard';
import SectionHeader from '../../components/SectionHeader';
import ScheduleFollowUpModal from '../../components/ScheduleFollowUpModal';
import TabScreenHeader from '../../components/TabScreenHeader';
import type { RootStackParamList } from '../../navigation/types';

function formatFollowUpLabel(value?: string | null) {
  if (!value) return '';
  return formatDate(value) || String(value).slice(0, 10);
}

export function PatientDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PatientDetail'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 36 : 16,
  ) + 14;

  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'prescriptions' | 'labs'>('overview');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const targetPatientId = route.params?.patientId;

  const query = useQuery({
    queryKey: ['doctor-patient', targetPatientId],
    enabled: Boolean(targetPatientId),
    queryFn: () => doctorPortalApi.getPatient(String(targetPatientId)),
  });

  const history = useMemo(
    () => mapPatientClinicalHistory(query.data || {}),
    [query.data],
  );

  const patientName = history.patient.name;
  const patientPhone = history.patient.phone || 'Not provided';
  const bloodGroup = history.patient.bloodGroup || '—';
  const ageGender = [
    history.patient.age ? `${history.patient.age} Years` : null,
    history.patient.gender || null,
  ]
    .filter(Boolean)
    .join(' • ') || 'Patient';

  const allConsultations = history.consultations;
  const prescriptionsList = history.prescriptions;
  const labsList = history.labs;
  const followUps = history.followUps || [];
  const latestRx = prescriptionsList[0];
  const latestAppointmentId = history.latestAppointmentId;

  const requireAppointment = (action: string) => {
    if (!latestAppointmentId) {
      Alert.alert(
        'No appointment linked',
        `Open this patient from an appointment first to ${action}.`,
      );
      return null;
    }
    return latestAppointmentId;
  };

  const openPrescription = (appointmentId?: string) => {
    const id = appointmentId || requireAppointment('create a prescription');
    if (!id) return;
    navigation.navigate('Prescription', {
      appointmentId: id,
      patientName,
    });
  };

  const openChat = () => {
    const id = requireAppointment('start chat');
    if (!id) return;
    navigation.navigate('Chat', { appointmentId: id, patientName });
  };

  const openConsultation = () => {
    const id = requireAppointment('open case sheet');
    if (!id) return;
    navigation.navigate('Consultation', {
      appointmentId: id,
      patientName,
      patientId: targetPatientId,
    });
  };

  if (!targetPatientId) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.emptyTitle}>Patient not found</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.summaryLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <TabScreenHeader
        showBack
        title="Patient Record"
        right={
          <Pressable style={styles.headerIconBtn} accessibilityLabel="Options" hitSlop={8}>
            <MoreVertical size={22} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        }
      />

      {query.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading clinical history…</Text>
        </View>
      ) : query.isError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Could not load patient</Text>
          <Text style={styles.emptySub}>
            {(query.error as Error)?.message || 'Please try again.'}
          </Text>
          <Pressable onPress={() => query.refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 80 }]}
            showsVerticalScrollIndicator={false}>
            <PatientInfoCard
              name={patientName}
              ageGender={ageGender}
              bloodGroup={bloodGroup}
              patientId={String(targetPatientId).slice(-8)}
              phone={patientPhone}
              totalVisits={allConsultations.length}
              totalPrescriptions={prescriptionsList.length}
              totalLabs={labsList.length}
            />

            {history.patient.allergies ? (
              <Pressable
                style={styles.alertBanner}
                onPress={() =>
                  Alert.alert('Allergies & Clinical Warnings', history.patient.allergies)
                }>
                <AlertTriangle size={18} color={colors.danger} strokeWidth={2.2} />
                <View style={styles.alertTextCol}>
                  <Text style={styles.alertTitle}>Allergies & Warnings</Text>
                  <Text style={styles.alertSub} numberOfLines={1}>
                    {history.patient.allergies}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.danger} strokeWidth={2} />
              </Pressable>
            ) : null}

            <View style={styles.tabsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsScroll}>
                {[
                  { key: 'overview', label: 'Overview', IconComp: Stethoscope },
                  { key: 'consultations', label: 'Consultations', IconComp: Calendar },
                  { key: 'prescriptions', label: 'Prescriptions', IconComp: Pill },
                  { key: 'labs', label: 'Lab Results', IconComp: FlaskConical },
                ].map(tab => {
                  const isActive = activeTab === tab.key;
                  const IconComponent = tab.IconComp;
                  return (
                    <Pressable
                      key={tab.key}
                      style={({ pressed }) => [
                        styles.tabChip,
                        isActive && styles.tabChipActive,
                        pressed && styles.tabChipPressed,
                      ]}
                      onPress={() => setActiveTab(tab.key as any)}>
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

            {activeTab === 'overview' && (
              <>
                <SectionHeader
                  title={`Upcoming Follow-ups (${followUps.length})`}
                  onPress={() => setShowScheduleModal(true)}
                  buttonLabel="+ Schedule Follow-up"
                />

                <View style={styles.timelineCard}>
                  {followUps.length === 0 ? (
                    <View style={styles.emptyFollowUpBox}>
                      <View style={styles.emptyFollowUpIcon}>
                        <CalendarClock size={20} color={colors.primary} strokeWidth={2} />
                      </View>
                      <Text style={styles.emptyFollowUpTitle}>No Upcoming Follow-ups</Text>
                      <Text style={styles.emptyFollowUpSub}>
                        Schedule follow-up appointments to track patient recovery.
                      </Text>
                    </View>
                  ) : (
                    followUps.map((fu: any) => (
                      <View key={fu.id} style={styles.followUpRow}>
                        <View
                          style={[
                            styles.followUpIconWrap,
                            fu.status === 'overdue' && styles.followUpIconOverdue,
                          ]}>
                          <Calendar
                            size={16}
                            color={fu.status === 'overdue' ? colors.danger : colors.primary}
                            strokeWidth={2.2}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.followUpDateText}>
                            {fu.dateLabel || formatFollowUpLabel(fu.date)}
                          </Text>
                          <Text style={styles.followUpTitleText} numberOfLines={1}>
                            {fu.title || 'Follow-up visit'}
                          </Text>
                          {!!fu.notes && (
                            <Text style={styles.followUpNotesText} numberOfLines={2}>
                              {fu.notes}
                            </Text>
                          )}
                        </View>
                        <View
                          style={
                            fu.status === 'overdue'
                              ? styles.statusPillProgress
                              : styles.statusPillCompleted
                          }>
                          <Text
                            style={
                              fu.status === 'overdue'
                                ? styles.statusPillTextProgress
                                : styles.statusPillTextCompleted
                            }>
                            {fu.status === 'overdue' ? 'Overdue' : 'Upcoming'}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <SectionHeader
                  title={`Consultation Timeline (${allConsultations.length})`}
                />

                <View style={styles.timelineCard}>
                  {allConsultations.length === 0 ? (
                    <View style={styles.emptyFollowUpBox}>
                      <View style={styles.emptyFollowUpIcon}>
                        <Stethoscope size={20} color={colors.primary} strokeWidth={2} />
                      </View>
                      <Text style={styles.emptyFollowUpTitle}>No Past Consultations</Text>
                      <Text style={styles.emptyFollowUpSub}>
                        Clinical notes and visit diagnoses will appear here once conducted.
                      </Text>
                    </View>
                  ) : (
                    allConsultations.map((item: any, idx: number) => {
                      const isLast = idx === allConsultations.length - 1;
                      const isCompleted = item.status === 'completed';
                      return (
                        <View
                          key={item.id}
                          style={[styles.timelineEventRow, isLast && { paddingBottom: 0 }]}>
                          <View style={styles.timelineColLeft}>
                            <View
                              style={[
                                styles.timelineDot,
                                {
                                  backgroundColor: isCompleted
                                    ? colors.success
                                    : colors.warning,
                                },
                              ]}
                            />
                            {!isLast && <View style={styles.timelineLine} />}
                          </View>
                          <View style={styles.timelineContent}>
                            <View style={styles.eventDateRow}>
                              <Text style={styles.eventDateText}>{item.date}</Text>
                              {!!item.time && (
                                <Text style={styles.eventTimeText}>{item.time}</Text>
                              )}
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
                                  {String(item.status || '').replace('_', ' ')}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.eventTitle}>{item.title}</Text>
                            {!!item.doctor && (
                              <Text style={styles.eventDoctor}>{item.doctor}</Text>
                            )}
                            <Text style={styles.eventNotes}>
                              {item.notes || item.complaint || 'No clinical notes recorded.'}
                            </Text>
                            {!!item.followUpDate && (
                              <View style={styles.inlineFollowUp}>
                                <Calendar size={12} color={colors.primary} strokeWidth={2} />
                                <Text style={styles.inlineFollowUpText}>
                                  Follow-up: {formatFollowUpLabel(item.followUpDate)}
                                  {item.followUpNotes ? ` · ${item.followUpNotes}` : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <View
                  style={[
                    styles.twoColumnRow,
                    isSmallScreen && { flexDirection: 'column' },
                  ]}>
                  <View style={styles.summaryBox}>
                    <SectionHeader
                      title="Prescription"
                      buttonLabel="+ Create"
                      onPress={() => openPrescription()}
                    />
                    {latestRx ? (
                      <>
                        <View style={styles.rxInnerCard}>
                          <View style={styles.rxIconWrap}>
                            <FileText size={16} color={colors.primary} strokeWidth={2} />
                          </View>
                          <View style={{ gap: 1 }}>
                            <Text style={styles.rxDateText}>Latest Rx</Text>
                            <Text style={styles.rxDoctorText}>
                              {latestRx.date || latestRx.doctor}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.medBulletList}>
                          {(latestRx.items || []).slice(0, 3).map((med: any, i: number) => (
                            <React.Fragment key={`${latestRx.id}-${i}`}>
                              <Text style={styles.medBulletText}>• {med.name}</Text>
                              {!!med.freq && (
                                <Text style={styles.medSubText}>{med.freq}</Text>
                              )}
                            </React.Fragment>
                          ))}
                          {(latestRx.items || []).length === 0 && (
                            <Text style={styles.medSubText}>
                              {latestRx.notes || 'Prescription on file'}
                            </Text>
                          )}
                        </View>
                        <Pressable
                          style={styles.sendRxMiniBtn}
                          onPress={() => openPrescription(latestRx.appointmentId)}>
                          <Send size={12} color={colors.primary} strokeWidth={2} />
                          <Text style={styles.sendRxMiniBtnText}>View / Edit Rx</Text>
                        </Pressable>
                      </>
                    ) : (
                      <View style={styles.miniEmptyWrap}>
                        <Pill size={18} color={colors.textMuted} strokeWidth={2} />
                        <Text style={styles.miniEmptySub}>No prescriptions yet</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.summaryBox}>
                    <View style={styles.summaryHeaderRow}>
                      <Text style={styles.summaryTitle}>Lab Results</Text>
                      <Pressable onPress={() => setActiveTab('labs')}>
                        <Text style={styles.summaryLink}>View All</Text>
                      </Pressable>
                    </View>
                    <View style={styles.labResultsList}>
                      {labsList.length === 0 ? (
                        <View style={styles.miniEmptyWrap}>
                          <FlaskConical size={18} color={colors.textMuted} strokeWidth={2} />
                          <Text style={styles.miniEmptySub}>No lab orders yet</Text>
                        </View>
                      ) : (
                        labsList.slice(0, 3).map((lab: any) => (
                          <View key={lab.id} style={styles.labRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.labNameText}>{lab.name}</Text>
                              <Text style={styles.labDateText}>{lab.date}</Text>
                            </View>
                            <View
                              style={
                                String(lab.status).toLowerCase().includes('normal') ||
                                String(lab.status).toLowerCase() === 'completed'
                                  ? styles.labPillNormal
                                  : styles.labPillLow
                              }>
                              <Text
                                style={
                                  String(lab.status).toLowerCase().includes('normal') ||
                                  String(lab.status).toLowerCase() === 'completed'
                                    ? styles.labPillTextNormal
                                    : styles.labPillTextLow
                                }>
                                {lab.status}
                              </Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                </View>
              </>
            )}

            {activeTab === 'consultations' && (
              <View style={styles.tabContentBlock}>
                <SectionHeader
                  title={`Consultation History (${allConsultations.length})`}
                  buttonLabel="+ Schedule Follow-up"
                  onPress={() => setShowScheduleModal(true)}
                />
                {allConsultations.length === 0 ? (
                  <Text style={styles.emptyInline}>No consultation history.</Text>
                ) : (
                  allConsultations.map((c: any) => (
                    <View key={c.id} style={styles.detailCardBlock}>
                      <View style={styles.cardHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardHeaderTitle}>{c.title}</Text>
                          {!!c.doctor && (
                            <Text style={styles.doctorSubText}>{c.doctor}</Text>
                          )}
                        </View>
                        <View
                          style={
                            c.status === 'completed'
                              ? styles.statusPillCompleted
                              : styles.statusPillProgress
                          }>
                          <Text
                            style={
                              c.status === 'completed'
                                ? styles.statusPillTextCompleted
                                : styles.statusPillTextProgress
                            }>
                            {String(c.status || '').replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailSectionDivider} />
                      <View style={styles.infoMetaRow}>
                        <Text style={styles.metaLabel}>Date & Time:</Text>
                        <Text style={styles.metaVal}>
                          {c.date}
                          {c.time ? ` at ${c.time}` : ''}
                        </Text>
                      </View>
                      {!!c.complaint && (
                        <View style={styles.infoMetaRow}>
                          <Text style={styles.metaLabel}>Chief Complaint:</Text>
                          <Text style={styles.metaVal}>{c.complaint}</Text>
                        </View>
                      )}
                      <View style={styles.infoMetaRowColumn}>
                        <Text style={styles.metaLabel}>Clinical Notes & Assessment:</Text>
                        <Text style={styles.clinicalNotesText}>
                          {c.notes || 'No clinical notes recorded for this visit.'}
                        </Text>
                      </View>
                      {!!c.followUpDate && (
                        <View style={styles.infoMetaRowColumn}>
                          <Text style={styles.metaLabel}>Scheduled Follow-up:</Text>
                          <Text style={styles.clinicalNotesText}>
                            {formatFollowUpLabel(c.followUpDate)}
                            {c.followUpNotes ? `\n${c.followUpNotes}` : ''}
                          </Text>
                        </View>
                      )}
                      {!!c.appointmentId && (
                        <Pressable
                          style={styles.sendRxMiniBtn}
                          onPress={() => openPrescription(c.appointmentId)}>
                          <Pill size={12} color={colors.primary} strokeWidth={2} />
                          <Text style={styles.sendRxMiniBtnText}>Prescription</Text>
                        </Pressable>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'prescriptions' && (
              <View style={styles.tabContentBlock}>
                <SectionHeader
                  title={`Prescriptions History (${prescriptionsList.length})`}
                  buttonLabel="+ New Rx"
                  onPress={() => openPrescription()}
                />
                {prescriptionsList.length === 0 ? (
                  <Text style={styles.emptyInline}>No prescriptions issued yet.</Text>
                ) : (
                  prescriptionsList.map((rx: any) => (
                    <Pressable
                      key={rx.id}
                      style={styles.detailCardBlock}
                      onPress={() => openPrescription(rx.appointmentId)}>
                      <View style={styles.cardHeaderRow}>
                        <View>
                          <Text style={styles.cardHeaderTitle}>
                            Prescription #{String(rx.id).slice(0, 8).toUpperCase()}
                          </Text>
                          <Text style={styles.doctorSubText}>{rx.doctor}</Text>
                        </View>
                        <Text style={styles.cardDateText}>{rx.date}</Text>
                      </View>
                      <View style={styles.detailSectionDivider} />
                      <View style={styles.medItemsContainer}>
                        {(rx.items || []).length === 0 ? (
                          <Text style={styles.clinicalNotesText}>
                            {rx.notes || 'Open to view prescription details.'}
                          </Text>
                        ) : (
                          rx.items.map((item: any, i: number) => (
                            <View key={i} style={styles.richMedCard}>
                              <View style={styles.medIconBox}>
                                <Pill size={16} color={colors.primary} strokeWidth={2} />
                              </View>
                              <View style={{ flex: 1, gap: 2 }}>
                                <Text style={styles.medNameText}>{item.name}</Text>
                                <Text style={styles.medMetaText}>
                                  Dosage: {item.dosage || '—'}
                                  {item.freq ? ` • ${item.freq}` : ''}
                                </Text>
                                {!!item.duration && (
                                  <Text style={styles.medDurationText}>
                                    Duration: {item.duration}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {activeTab === 'labs' && (
              <View style={styles.tabContentBlock}>
                <SectionHeader title={`Lab & Diagnostic Reports (${labsList.length})`} />
                {labsList.length === 0 ? (
                  <Text style={styles.emptyInline}>No lab reports for this patient.</Text>
                ) : (
                  labsList.map((lab: any) => (
                    <View key={lab.id} style={styles.richLabCard}>
                      <View style={styles.labCardHeader}>
                        <View style={styles.labIconBox}>
                          <FlaskConical size={18} color={colors.primary} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.labDetailName}>{lab.name}</Text>
                          <Text style={styles.labCategoryText}>
                            Category: {lab.category} • Date: {lab.date}
                          </Text>
                        </View>
                        <View
                          style={
                            String(lab.status).toLowerCase().includes('normal') ||
                            String(lab.status).toLowerCase() === 'completed'
                              ? styles.labPillNormal
                              : styles.labPillLow
                          }>
                          <Text
                            style={
                              String(lab.status).toLowerCase().includes('normal') ||
                              String(lab.status).toLowerCase() === 'completed'
                                ? styles.labPillTextNormal
                                : styles.labPillTextLow
                            }>
                            {lab.status}
                          </Text>
                        </View>
                      </View>
                      {!!lab.resultValue && (
                        <View style={styles.labResultBox}>
                          <Text style={styles.resultValueText}>
                            Result: {lab.resultValue}
                          </Text>
                          {!!lab.refRange && (
                            <Text style={styles.refRangeText}>
                              Reference: {lab.refRange}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
            <Pressable
              style={({ pressed }) => [styles.barOutlineBtn, pressed && styles.btnPressed]}
              onPress={openConsultation}>
              <FileText size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.barOutlineBtnText} numberOfLines={1}>
                Case Sheet
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.barOutlineBtn, pressed && styles.btnPressed]}
              onPress={openChat}>
              <MessageSquare size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.barOutlineBtnText} numberOfLines={1}>
                Start Chat
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.barSolidBtn, pressed && styles.btnPressed]}
              onPress={() => openPrescription()}>
              <Send size={14} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.barSolidBtnText} numberOfLines={1}>
                Send Rx
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <ScheduleFollowUpModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        patientName={patientName}
        patientId={String(targetPatientId).slice(-8)}
        appointmentId={latestAppointmentId}
        onScheduleSuccess={() => {
          query.refetch();
        }}
      />
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
  inlineFollowUp: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
    backgroundColor: colors.aqua,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inlineFollowUpText: {
    flex: 1,
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    lineHeight: 14,
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  followUpIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followUpIconOverdue: {
    backgroundColor: colors.dangerBg,
  },
  followUpDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  followUpTitleText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  followUpNotesText: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 13,
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
    paddingBottom: Platform.OS === 'android' ? 22 : 24,
    flexDirection: 'row',
    gap: 10,
    ...shadows.cardElevated,
  },
  barOutlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  barOutlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  barSolidBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  barSolidBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  tabChipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },

  /* Empty State Boxes in Record */
  emptyFollowUpBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    gap: 4,
  },
  emptyFollowUpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyFollowUpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyFollowUpSub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  miniEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  miniEmptySub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },

  /* Vitals Container */
  vitalsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  vitalIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vitalLabelText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '500',
  },

  /* Detailed Cards */
  tabContentBlock: {
    gap: 10,
  },
  detailCardBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    ...shadows.cardSoft,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDateText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  doctorSubText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '600',
    marginTop: 1,
  },
  detailSectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoMetaRowColumn: {
    gap: 3,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaVal: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  clinicalNotesText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  medItemsContainer: {
    gap: 8,
  },
  richMedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  medNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  medMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  medDurationText: {
    fontSize: 10,
    color: colors.textMuted,
  },

  /* Rich Labs */
  richLabCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
  },
  labCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  labIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labDetailName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  labCategoryText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  labResultBox: {
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  refRangeText: {
    fontSize: 10,
    color: colors.textMuted,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyInline: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
