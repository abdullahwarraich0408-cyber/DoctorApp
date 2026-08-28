import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../../theme';

type SkipButtonProps = {
  onPress: () => void;
};

export function SkipButton({ onPress }: SkipButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Skip onboarding"
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <Text style={styles.label}>Skip</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
