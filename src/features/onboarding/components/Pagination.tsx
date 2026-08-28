import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../theme';

type PaginationProps = {
  count: number;
  index: number;
};

export function Pagination({ count, index }: PaginationProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={`Slide ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotIdle: {
    width: 8,
    backgroundColor: colors.primarySoft,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
});
