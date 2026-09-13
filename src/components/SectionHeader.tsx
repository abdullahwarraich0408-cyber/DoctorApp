import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, MoreVertical } from 'lucide-react-native';
import { colors, radius, spacing, shadows } from '../theme';

type SectionHeaderProps = {
  title: string;
  /** Optional label for a right‑aligned action button (e.g., "View All" or "+ Create") */
  buttonLabel?: string;
  /** Callback when the action button is pressed */
  onPress?: () => void;
};

/**
 * A minimalistic section header used throughout the Doctor app.
 * Displays a title and an optional action button on the right.
 */
export default function SectionHeader({ title, buttonLabel, onPress }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {buttonLabel && onPress && (
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={onPress}
          hitSlop={8}>
          <Text style={styles.actionLabel}>{buttonLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.aqua,
    borderRadius: radius.pill,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  actionBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});
