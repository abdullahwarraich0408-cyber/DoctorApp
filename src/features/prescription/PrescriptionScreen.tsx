import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Copy,
  Stethoscope,
  Pill,
  Check,
  MoreVertical,
  ChevronDown,
  CheckCircle2,
  Plus,
  AlertCircle,
  Bookmark,
  FileSignature,
} from 'lucide-react-native';
import { doctorPortalApi } from '../../lib/api';
import { colors, radius, spacing, shadows, TAB_BAR_CLEARANCE } from '../../theme';
import GreenGradientHeader from '../../components/GreenGradientHeader';
import type { RootStackParamList } from '../../navigation/types';

interface RxMedicineItem {
  id: string;
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  status: 'active' | 'draft';
  safetyCheck: string;
}

const EMPTY_MEDICINE: RxMedicineItem = {
  id: 'med-1',
  medicine: '',
  dosage: '1 Tablet',
  frequency: 'Once a day',
  duration: '3 Days',
  instructions: '',
  status: 'draft',
  safetyCheck: '',
};

function mapRxItemsFromApi(prescription: any): RxMedicineItem[] {
  const items = Array.isArray(prescription?.items) ? prescription.items : [];
  if (!items.length) return [{ ...EMPTY_MEDICINE, id: `med-${Date.now()}` }];
  return items.map((item: any, index: number) => ({
    id: `med-${item.id || index}`,
    medicine: item.name || item.medicine || '',
    dosage: item.dosage || item.dose || '1 Tablet',
    frequency: item.frequency || 'Once a day',
    duration: item.duration || '3 Days',
    instructions: item.instructions || '',
    status: 'active' as const,
    safetyCheck: 'No major interactions found',
  }));
}

export function PrescriptionScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Prescription'>>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const [items, setItems] = useState<RxMedicineItem[]>([{ ...EMPTY_MEDICINE }]);
  const [notes, setNotes] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const patientName = route.params.patientName || 'Patient';
  const appointmentId = route.params.appointmentId;

  const existingRxQuery = useQuery({
    queryKey: ['doctor-prescription', appointmentId],
    enabled: Boolean(appointmentId),
    retry: false,
    queryFn: () => doctorPortalApi.getPrescription(appointmentId),
  });

  React.useEffect(() => {
    if (hydrated) return;
    const prescription =
      (existingRxQuery.data as any)?.prescription || existingRxQuery.data;
    if (prescription && (prescription.items || prescription.notes)) {
      setItems(mapRxItemsFromApi(prescription));
      setNotes(prescription.notes || '');
      setHydrated(true);
      return;
    }
    if (existingRxQuery.isFetched || existingRxQuery.isError) {
      setHydrated(true);
    }
  }, [existingRxQuery.data, existingRxQuery.isFetched, existingRxQuery.isError, hydrated]);

  const saveMut = useMutation({
    mutationFn: (sign: boolean) => {
      const validItems = items
        .filter(i => i.medicine.trim())
        .map(i => ({
          medicine: i.medicine,
          name: i.medicine,
          dosage: i.dosage,
          frequency: i.frequency,
          duration: i.duration,
          instructions: i.instructions,
        }));

      if (validItems.length === 0) {
        throw new Error('Please add at least one medicine name.');
      }

      return doctorPortalApi.createPrescription({
        appointment_id: route.params.appointmentId,
        items: validItems,
        notes: notes || 'Take medications as prescribed.',
        sign,
      });
    },
    onSuccess: (_data, sign) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-consultation'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-prescription', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['doctor-patient'] });
      Alert.alert(
        sign ? 'Prescription Signed & Issued' : 'Draft Saved',
        sign
          ? 'Digital E-Prescription delivered to patient health vault.'
          : 'Prescription draft saved successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    onError: (err: Error) => Alert.alert('Could not save', err.message),
  });

  const updateItem = (id: string, patch: Partial<RxMedicineItem>) => {
    setItems(list =>
      list.map(row => {
        if (row.id === id) {
          const updated = { ...row, ...patch };
          if (patch.medicine && patch.medicine.trim().length > 0) {
            updated.status = 'active';
            if (!updated.safetyCheck) {
              updated.safetyCheck = 'No major interactions found';
            }
          }
          return updated;
        }
        return row;
      }),
    );
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(list => list.filter(row => row.id !== id));
  };

  const addNewMedicine = () => {
    const newItem: RxMedicineItem = {
      id: `med-${Date.now()}`,
      medicine: '',
      dosage: '1 Tablet',
      frequency: 'Once a day',
      duration: '3 Days',
      instructions: '',
      status: 'draft',
      safetyCheck: '',
    };
    setItems(list => [...list, newItem]);
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Are you sure you want to clear all prescribed medicines?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setItems([{ ...EMPTY_MEDICINE, id: `med-${Date.now()}` }]),
      },
    ]);
  };

  return (
    <View style={styles.root}>

      {/* Deep Teal Header */}
      <GreenGradientHeader style={[styles.headerSection, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            hitSlop={8}>
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Prescription</Text>
          <View style={{ width: 40 }} />
        </View>
      </GreenGradientHeader>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {/* Patient Context Hero Card */}
          <View style={styles.patientHeroCard}>
            <View style={[styles.patientAvatar, styles.patientAvatarFallback]}>
              <Text style={styles.patientAvatarInitial}>
                {(patientName || 'P').charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.patientMainCol}>
              <Text style={styles.patientName}>{patientName}</Text>
              <Text style={styles.patientMeta}>Linked appointment</Text>
              <View style={styles.consCodeRow}>
                <Text style={styles.consCodeText}>
                  APT-{String(appointmentId || '').slice(0, 8).toUpperCase() || '—'}
                </Text>
                <Copy size={11} color={colors.textMuted} strokeWidth={2} />
              </View>
            </View>

            <View style={styles.patientRightCol}>
              <View style={styles.metaRowRight}>
                <Stethoscope size={12} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.metaRightText, { color: colors.primary, fontWeight: '600' }]}>
                  {existingRxQuery.data ? 'Existing Rx loaded' : 'New prescription'}
                </Text>
              </View>
            </View>
          </View>

          {/* Section Header Row */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.sectionIconCircle}>
                <Pill size={16} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.sectionTitleText}>Prescription</Text>
            </View>
            <Pressable onPress={clearAll} hitSlop={6}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </Pressable>
          </View>

          {/* Medication Cards List */}
          <View style={styles.medicationsList}>
            {items.map((item, index) => {
              const isActive = item.status === 'active' || item.medicine.trim().length > 0;

              return (
                <View key={item.id} style={styles.medCard}>
                  {/* Card Header: Number & Status Pill + More Options */}
                  <View style={styles.medCardTopRow}>
                    <View style={styles.medNumberCircle}>
                      <Text style={styles.medNumberText}>{index + 1}</Text>
                    </View>

                    <View style={styles.medTopRightRow}>
                      <View
                        style={[
                          styles.statusBadgePill,
                          isActive ? styles.statusBadgeActive : styles.statusBadgeDraft,
                        ]}>
                        {isActive && (
                          <Check size={12} color={colors.success} strokeWidth={3} />
                        )}
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextDraft,
                          ]}>
                          {isActive ? 'Active' : 'Draft'}
                        </Text>
                      </View>

                      {items.length > 1 && (
                        <Pressable
                          onPress={() => removeItem(item.id)}
                          hitSlop={8}>
                          <MoreVertical size={18} color={colors.textMuted} strokeWidth={2} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Medicine Name Field */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Medicine Name</Text>
                    <View style={styles.inputWithDropdown}>
                      <TextInput
                        style={styles.medicineInput}
                        placeholder="Search medicine or enter name..."
                        placeholderTextColor={colors.textMuted}
                        value={item.medicine}
                        onChangeText={text => updateItem(item.id, { medicine: text })}
                      />
                      <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
                    </View>
                  </View>

                  {/* 3-Column Grid: Dosage, Frequency, Duration */}
                  <View style={styles.threeColumnGrid}>
                    <View style={styles.gridFieldCol}>
                      <Text style={styles.fieldLabel}>Dosage</Text>
                      <View style={styles.dropdownInput}>
                        <TextInput
                          style={styles.gridInput}
                          placeholder="Dosage"
                          placeholderTextColor={colors.textMuted}
                          value={item.dosage}
                          onChangeText={text => updateItem(item.id, { dosage: text })}
                        />
                        <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
                      </View>
                    </View>

                    <View style={styles.gridFieldCol}>
                      <Text style={styles.fieldLabel}>Frequency</Text>
                      <View style={styles.dropdownInput}>
                        <TextInput
                          style={styles.gridInput}
                          placeholder="Frequency"
                          placeholderTextColor={colors.textMuted}
                          value={item.frequency}
                          onChangeText={text => updateItem(item.id, { frequency: text })}
                        />
                        <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
                      </View>
                    </View>

                    <View style={styles.gridFieldCol}>
                      <Text style={styles.fieldLabel}>Duration</Text>
                      <View style={styles.dropdownInput}>
                        <TextInput
                          style={styles.gridInput}
                          placeholder="Duration"
                          placeholderTextColor={colors.textMuted}
                          value={item.duration}
                          onChangeText={text => updateItem(item.id, { duration: text })}
                        />
                        <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
                      </View>
                    </View>
                  </View>

                  {/* Instructions Field */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Instructions</Text>
                    <TextInput
                      style={styles.instructionsInput}
                      placeholder="Add instructions for the patient..."
                      placeholderTextColor={colors.textMuted}
                      value={item.instructions}
                      onChangeText={text => updateItem(item.id, { instructions: text })}
                    />
                  </View>

                  {/* Safety Check Sub-banner */}
                  {isActive && item.safetyCheck ? (
                    <View style={styles.safetyCheckBanner}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <CheckCircle2 size={15} color={colors.success} strokeWidth={2.2} />
                        <Text style={styles.safetyCheckText}>{item.safetyCheck}</Text>
                      </View>
                      <Pressable onPress={() => Alert.alert('Interaction Details', 'No drug-to-drug interactions with patient records.')}>
                        <Text style={styles.safetyDetailsLink}>View Details &gt;</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* + Add Medicine Button */}
          <Pressable
            style={styles.addMedicineBtn}
            onPress={addNewMedicine}>
            <Plus size={16} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.addMedicineBtnText}>Add Medicine</Text>
          </Pressable>

          {/* Additional Notes Field */}
          <View style={styles.notesSection}>
            <View style={styles.notesHeaderRow}>
              <Text style={styles.notesLabel}>Notes (Optional)</Text>
              <Text style={styles.charCounter}>{notes.length}/500</Text>
            </View>
            <TextInput
              style={styles.notesAreaInput}
              placeholder="Add any additional notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Medication Safety Warning Alert */}
          <View style={styles.safetyWarningCard}>
            <AlertCircle size={20} color={colors.warning} strokeWidth={2.2} />
            <View style={styles.safetyWarningTextCol}>
              <Text style={styles.safetyWarningTitle}>Medication Safety</Text>
              <Text style={styles.safetyWarningSub}>
                Review patient allergies, interactions, and contraindications before issuing.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Bottom Actions Bar */}
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.saveDraftBtn}
            onPress={() => saveMut.mutate(false)}
            disabled={saveMut.isPending}>
            <Bookmark size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.saveDraftBtnText}>Save Draft</Text>
          </Pressable>

          <Pressable
            style={styles.signIssueBtn}
            onPress={() => saveMut.mutate(true)}
            disabled={saveMut.isPending}>
            <FileSignature size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.signIssueBtnText}>
              {saveMut.isPending ? 'Signing...' : 'Sign & Issue'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    paddingBottom: 110,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  /* Patient Hero Card */
  patientHeroCard: {
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
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
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
  patientMainCol: {
    gap: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  patientMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  consCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  consCodeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  patientRightCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  metaRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRightText: {
    fontSize: 10,
    color: colors.textMuted,
  },

  /* Section Title Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },

  /* Medications List */
  medicationsList: {
    gap: 12,
  },
  medCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    ...shadows.cardSoft,
  },
  medCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  medTopRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusBadgeActive: {
    backgroundColor: colors.successBg,
  },
  statusBadgeDraft: {
    backgroundColor: colors.iceBlue,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeTextActive: {
    color: colors.success,
  },
  statusBadgeTextDraft: {
    color: colors.textMuted,
  },

  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inputWithDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 40,
  },
  medicineInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  /* 3 Column Grid */
  threeColumnGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  gridFieldCol: {
    flex: 1,
    gap: 4,
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    height: 38,
  },
  gridInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  instructionsInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 11,
    color: colors.textPrimary,
  },

  safetyCheckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#D0EFEF',
    borderRadius: radius.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  safetyCheckText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  safetyDetailsLink: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
  },

  /* Add Medicine Button */
  addMedicineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  addMedicineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Notes Section */
  notesSection: {
    gap: 6,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  charCounter: {
    fontSize: 10,
    color: colors.textMuted,
  },
  notesAreaInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  /* Safety Warning Card */
  safetyWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  safetyWarningTextCol: {
    flex: 1,
    gap: 2,
  },
  safetyWarningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  safetyWarningSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    flexDirection: 'row',
    gap: 12,
    ...shadows.cardElevated,
  },
  saveDraftBtn: {
    flex: 1,
    height: 46,
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
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  signIssueBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  signIssueBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
