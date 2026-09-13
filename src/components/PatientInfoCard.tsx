import React from 'react';
import { View, Text, Image, Pressable, Alert, StyleSheet } from 'react-native';
import { Droplet, Phone } from 'lucide-react-native';
import { colors, radius, shadows } from '../theme';

type PatientInfoCardProps = {
  avatarUri?: any;
  name: string;
  ageGender: string;
  bloodGroup: string;
  patientId: string;
  phone: string;
};

/**
 * Minimalist patient information card with subtle glass‑morphism effect.
 */
export default function PatientInfoCard({
  avatarUri,
  name,
  ageGender,
  bloodGroup,
  patientId,
  phone,
}: PatientInfoCardProps) {
  const handleContact = () => {
    Alert.alert(
      'Contact Patient',
      `Reach out to ${name} at ${phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', onPress: () => console.log('Calling', phone) },
      ],
    );
  };

  const imageSource =
    typeof avatarUri === 'string'
      ? { uri: avatarUri }
      : avatarUri || require('../assets/patient_avatar_placeholder.png');

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrapper}>
        <Image source={imageSource} style={styles.avatarImg} />
        <View style={styles.onlineBadgeDot} />
      </View>

      <View style={styles.metaCol}>
        <Text style={styles.nameText}>{name}</Text>
        <Text style={styles.demographicsText}>{ageGender}</Text>
        <View style={styles.bloodGroupRow}>
          <Droplet size={13} color={colors.danger} strokeWidth={2.2} />
          <Text style={styles.bloodGroupText}>{bloodGroup}</Text>
        </View>
        <Text style={styles.idText}>ID: {patientId}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.contactBtn, pressed && styles.pressedState]}
        onPress={handleContact}
        accessibilityLabel={`Contact ${name}`}>
        <View style={styles.contactIconCircle}>
          <Phone size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.contactBtnLabel}>Contact</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  avatarWrapper: { position: 'relative' },
  avatarImg: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: colors.border },
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
  metaCol: { flex: 1, gap: 2 },
  nameText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  demographicsText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  bloodGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  bloodGroupText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  idText: { fontSize: 10, color: colors.textMuted },
  contactBtn: { alignItems: 'center', gap: 2 },
  contactIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.aqua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnLabel: { fontSize: 10, fontWeight: '600', color: colors.primary },
  pressedState: { opacity: 0.7, transform: [{ scale: 0.96 }] },
});
