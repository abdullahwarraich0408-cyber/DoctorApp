import React from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, radius, spacing, shadows } from '../theme';

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  tone = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'primary' | 'danger' | 'ghost';
}) {
  const bg =
    tone === 'danger'
      ? colors.danger
      : tone === 'ghost'
        ? colors.primaryLight
        : colors.primary;
  const fg = tone === 'ghost' ? colors.primaryDark : colors.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        tone === 'primary' && shadows.fab,
        { backgroundColor: bg, opacity: pressed || disabled ? 0.88 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
