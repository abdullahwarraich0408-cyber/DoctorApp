import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PhoneOff,
  Clock,
  User,
  CheckCircle2,
  Stethoscope,
  X,
} from 'lucide-react-native';
import { colors, radius, shadows } from '../theme';

type EndConsultationModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  patientName: string;
  duration?: string;
  isTeleconsult?: boolean;
};

/**
 * Custom Medical Confirmation Modal for ending/completing consultations.
 * Replaces system Alert dialogs with modern, clinical-grade UI matching Medzoos DoctorApp theme.
 */
export default function EndConsultationModal({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
  patientName,
  duration,
  isTeleconsult = true,
}: EndConsultationModalProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 14);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isLoading) onClose();
      }}>
      <View style={[styles.overlay, { paddingBottom: bottomPadding }]}>
        {/* Backdrop press to dismiss if not loading */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!isLoading) onClose();
          }}
          accessibilityLabel="Dismiss modal"
        />

        {/* Modal Card */}
        <View style={styles.card}>
          {/* Top Dismiss Button */}
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            disabled={isLoading}
            hitSlop={8}
            accessibilityLabel="Close">
            <X size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          {/* Icon Badge */}
          <View style={styles.iconCircle}>
            {isTeleconsult ? (
              <PhoneOff size={26} color="#DC2626" strokeWidth={2.4} />
            ) : (
              <Stethoscope size={26} color={colors.primary} strokeWidth={2.4} />
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isTeleconsult ? 'End Video Consultation?' : 'Complete Consultation?'}
          </Text>

          {/* Patient Context Pills Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <User size={12} color={colors.primary} strokeWidth={2} />
              <Text style={styles.metaPillText} numberOfLines={1}>
                {patientName}
              </Text>
            </View>

            {duration ? (
              <>
                <View style={styles.metaDot} />
                <View style={styles.metaPill}>
                  <Clock size={12} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.metaPillText}>{duration}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Description */}
          <Text style={styles.bodyText}>
            Are you sure you want to finish this session? Clinical notes, diagnosis, and prescription items will be archived to the patient's medical record.
          </Text>

          {/* Clinical Reassurance Checklist */}
          <View style={styles.checklistCard}>
            <View style={styles.checkItem}>
              <CheckCircle2 size={15} color={colors.success} strokeWidth={2.2} />
              <Text style={styles.checkItemText}>
                Clinical summary & diagnoses archived
              </Text>
            </View>
            <View style={styles.checkItem}>
              <CheckCircle2 size={15} color={colors.success} strokeWidth={2.2} />
              <Text style={styles.checkItemText}>
                Consultation status marked as Completed
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={onClose}
              disabled={isLoading}>
              <Text style={styles.cancelBtnText}>Keep Consulting</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && styles.btnPressed,
                isLoading && styles.btnDisabled,
              ]}
              onPress={onConfirm}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  {isTeleconsult && (
                    <PhoneOff size={15} color="#FFFFFF" strokeWidth={2.2} />
                  )}
                  <Text style={styles.confirmBtnText}>Complete & End</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    ...shadows.cardElevated,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  bodyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  checklistCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '100%',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    gap: 6,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.25,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.cardSoft,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
