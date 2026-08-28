import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Stethoscope,
  Calendar,
  Video,
  Pill,
  CheckCircle2,
  Building,
  UserCheck,
  MessageSquare,
  HeartPulse,
  Sparkles,
} from 'lucide-react-native';
import { colors, shadows } from '../../../theme';

type OnboardingIllustrationProps = {
  icon: string;
  accentIcon: string;
  height: number;
};

export function OnboardingIllustration({
  icon,
  accentIcon,
  height,
}: OnboardingIllustrationProps) {
  const size = Math.min(Math.round(height * 0.72), 220);

  const renderMainIcon = () => {
    const iconSize = Math.round(size * 0.42);
    switch (icon) {
      case 'stethoscope':
        return <Stethoscope size={iconSize} color="#FFFFFF" strokeWidth={2} />;
      case 'calendar-clock':
        return <Calendar size={iconSize} color="#FFFFFF" strokeWidth={2} />;
      case 'video-outline':
        return <Video size={iconSize} color="#FFFFFF" strokeWidth={2} />;
      case 'prescription':
        return <Pill size={iconSize} color="#FFFFFF" strokeWidth={2} />;
      default:
        return <CheckCircle2 size={iconSize} color="#FFFFFF" strokeWidth={2} />;
    }
  };

  const renderAccentIcon = () => {
    switch (accentIcon) {
      case 'hospital-building':
        return <Building size={20} color={colors.primary} strokeWidth={2.2} />;
      case 'account-check-outline':
        return <UserCheck size={20} color={colors.primary} strokeWidth={2.2} />;
      case 'message-text-outline':
        return <MessageSquare size={20} color={colors.primary} strokeWidth={2.2} />;
      case 'account-heart-outline':
        return <HeartPulse size={20} color={colors.primary} strokeWidth={2.2} />;
      default:
        return <Sparkles size={20} color={colors.primary} strokeWidth={2.2} />;
    }
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <View style={[styles.blobOne, { width: size * 1.35, height: size * 1.35 }]} />
      <View style={[styles.blobTwo, { width: size * 0.45, height: size * 0.45 }]} />
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius: size * 0.32,
          },
        ]}>
        {renderMainIcon()}
      </View>
      <View style={styles.accent}>
        {renderAccentIcon()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobOne: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.aqua,
  },
  blobTwo: {
    position: 'absolute',
    right: '16%',
    top: '10%',
    borderRadius: 999,
    backgroundColor: colors.mint,
  },
  badge: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...shadows.cardElevated,
  },
  accent: {
    position: 'absolute',
    right: '20%',
    bottom: '16%',
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
});
