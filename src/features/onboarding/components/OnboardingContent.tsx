import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../../../theme';

type OnboardingContentProps = {
  kicker: string;
  title: string;
  description: string;
};

export function OnboardingContent({
  kicker,
  title,
  description,
}: OnboardingContentProps) {
  const { width, height } = useWindowDimensions();
  const compact = width < 360 || height < 700;
  const titleSize = compact ? 28 : 32;
  const bodySize = compact ? 15 : 16;

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker} maxFontSizeMultiplier={1.2}>
        {kicker}
      </Text>
      <Text
        style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 6 }]}
        maxFontSizeMultiplier={1.25}>
        {title}
      </Text>
      <Text
        style={[styles.description, { fontSize: bodySize, lineHeight: bodySize + 9 }]}
        maxFontSizeMultiplier={1.25}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 340,
  },
});
