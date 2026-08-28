import React, { type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Frosted / smoky glass tokens — clinical teal chrome */
export const smoky = {
  fill: 'rgba(255, 255, 255, 0.72)',
  fillStrong: 'rgba(248, 252, 252, 0.88)',
  fillSoft: 'rgba(255, 255, 255, 0.55)',
  stroke: 'rgba(255, 255, 255, 0.92)',
  tint: 'rgba(230, 244, 245, 0.42)',
  shadow: {
    shadowColor: '#084F52',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

type SmokyGlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: 'soft' | 'regular' | 'strong';
  rounded?: number;
};

export function SmokyGlass({
  children,
  style,
  intensity = 'regular',
  rounded = 0,
}: SmokyGlassProps) {
  const fill =
    intensity === 'strong'
      ? smoky.fillStrong
      : intensity === 'soft'
        ? smoky.fillSoft
        : smoky.fill;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: fill,
          borderRadius: rounded,
          borderColor: smoky.stroke,
        },
        rounded > 0 && smoky.shadow,
        style,
      ]}>
      <View
        pointerEvents="none"
        style={[styles.tint, { borderRadius: rounded, backgroundColor: smoky.tint }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            borderTopLeftRadius: rounded,
            borderTopRightRadius: rounded,
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
  tint: {
    ...StyleSheet.absoluteFill,
  },

  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  content: {
    zIndex: 1,
    width: '100%',
  },
});
