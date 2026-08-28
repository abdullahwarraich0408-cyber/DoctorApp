import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

interface StatusChipProps {
  status: string;
  showIcon?: boolean;
}

export function StatusChip({ status, showIcon = false }: StatusChipProps) {
  const norm = (status || '').toLowerCase().replace(/\s+/g, '_');
  
  const map: Record<string, { bg: string; fg: string; border: string; label?: string }> = {
    pending: { bg: colors.warningBg, fg: colors.warning, border: '#FDE68A', label: 'Pending' },
    booked: { bg: colors.infoBg, fg: colors.info, border: '#BFDBFE', label: 'Booked' },
    confirmed: { bg: colors.mint, fg: colors.primary, border: '#B2EBE6', label: 'Confirmed' },
    in_progress: { bg: colors.warningBg, fg: colors.warning, border: '#FED7AA', label: 'In Progress' },
    completed: { bg: colors.successBg, fg: colors.success, border: '#A7F3D0', label: 'Completed ✓' },
    cancelled: { bg: colors.dangerBg, fg: colors.danger, border: '#FECDD3', label: 'Cancelled' },
    upcoming: { bg: colors.purpleBg, fg: colors.purple, border: '#DDD6FE', label: 'Upcoming' },
  };

  const tone = map[norm] || {
    bg: colors.iceBlue,
    fg: colors.primaryLight,
    border: colors.border,
    label: status ? status.replace('_', ' ') : 'General',
  };

  return (
    <View style={[styles.chip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.chipText, { color: tone.fg }]}>
        {tone.label || status.replace('_', ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.1,
  },
});
