import React from 'react';
import { View, Text, Image, Pressable, Alert, StyleSheet, Linking } from 'react-native';
import { Droplet, Phone, User, ShieldCheck } from 'lucide-react-native';
import { colors, radius, shadows } from '../theme';

type PatientInfoCardProps = {
  avatarUri?: any;
  name: string;
  ageGender?: string;
  bloodGroup?: string;
  patientId: string;
  phone: string;
  totalVisits?: number;
  totalPrescriptions?: number;
  totalLabs?: number;
};

/**
 * Enhanced Clinical Patient Information Card with clean medical-grade aesthetics.
 */
export default function PatientInfoCard({
  avatarUri,
  name,
  ageGender,
  bloodGroup,
  patientId,
  phone,
  totalVisits,
  totalPrescriptions,
  totalLabs,
}: PatientInfoCardProps) {
  const handleContact = () => {
    if (!phone || phone === 'Not provided') {
      Alert.alert('No Phone Number', 'No phone number is available for this patient.');
      return;
    }

    Alert.alert(
      'Contact Patient',
      `Call ${name} at ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => {
            const cleanNumber = phone.replace(/[^0-9+]/g, '');
            Linking.openURL(`tel:${cleanNumber}`).catch(() => {
              Alert.alert('Unable to Call', `Could not open phone dialer for ${phone}`);
            });
          },
        },
      ],
    );
  };

  const initial = (name || 'P').trim().charAt(0).toUpperCase();
  const hasValidBlood = Boolean(bloodGroup && bloodGroup !== '—' && bloodGroup !== '-' && bloodGroup.trim().length > 0);
  const formattedId = patientId.length > 8 ? patientId.slice(-8).toUpperCase() : patientId.toUpperCase();

  return (
    <View style={styles.card}>
      {/* Top Patient Summary Row */}
      <View style={styles.topRow}>
        {/* Avatar with fallback initial badge */}
        <View style={styles.avatarWrapper}>
          {avatarUri && typeof avatarUri === 'string' && avatarUri.startsWith('http') ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarInitialWrap}>
              <Text style={styles.avatarInitialText}>{initial}</Text>
            </View>
          )}
          <View style={styles.onlineBadgeDot} />
        </View>

        {/* Patient Details Column */}
        <View style={styles.metaCol}>
          <View style={styles.nameHeaderRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.idChip}>
              <Text style={styles.idChipText}>#{formattedId}</Text>
            </View>
          </View>

          {/* Demographics & Blood Row */}
          <View style={styles.tagsRow}>
            {!!ageGender && ageGender !== 'Patient' && (
              <View style={styles.demographicBadge}>
                <Text style={styles.demographicBadgeText}>{ageGender}</Text>
              </View>
            )}

            {hasValidBlood ? (
              <View style={styles.bloodBadge}>
                <Droplet size={11} color={colors.danger} strokeWidth={2.4} />
                <Text style={styles.bloodBadgeText}>{bloodGroup}</Text>
              </View>
            ) : null}
          </View>

          {/* Phone row */}
          {phone && phone !== 'Not provided' ? (
            <Text style={styles.phoneSubText} numberOfLines={1}>
              {phone}
            </Text>
          ) : null}
        </View>

        {/* Quick Call Action */}
        <Pressable
          style={({ pressed }) => [styles.contactBtn, pressed && styles.pressedState]}
          onPress={handleContact}
          accessibilityLabel={`Call ${name}`}>
          <View style={styles.contactIconCircle}>
            <Phone size={17} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.contactBtnLabel}>Call</Text>
        </Pressable>
      </View>

      {/* Mini Stats Footer Strip if visit metrics are provided */}
      {(totalVisits !== undefined || totalPrescriptions !== undefined || totalLabs !== undefined) && (
        <View style={styles.statsStrip}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{totalVisits ?? 0}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {totalPrescriptions ?? 0}
            </Text>
            <Text style={styles.statLabel}>Prescriptions</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: colors.primaryDark }]}>
              {totalLabs ?? 0}
            </Text>
            <Text style={styles.statLabel}>Lab Reports</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    ...shadows.cardSoft,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
  },
  avatarInitialWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.aqua,
    borderWidth: 1.5,
    borderColor: '#B4E8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  metaCol: {
    flex: 1,
    gap: 4,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  idChip: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  idChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  demographicBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demographicBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bloodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  bloodBadgeText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '700',
  },
  phoneSubText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  contactBtn: {
    alignItems: 'center',
    gap: 3,
    paddingLeft: 4,
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: '#C8EDE9',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.cardSoft,
  },
  contactBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  pressedState: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },

  /* Stats Strip */
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
});
