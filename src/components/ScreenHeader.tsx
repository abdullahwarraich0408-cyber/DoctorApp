import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  variant?: 'default' | 'home';
  right?: ReactNode;
  onRightPress?: () => void;
  rightIcon?: string;
};

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  variant = 'default',
  right,
  onRightPress,
  rightIcon = 'bell-outline',
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  // Always call navigation hook (never behind a condition) to satisfy Rules of Hooks.
  const navigation = useNavigation();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  if (variant === 'home') {
    return (
      <View style={[styles.wrap, { paddingTop: topInset + spacing.md }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.homeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandKicker}>medzoos doctor</Text>
            <Text style={styles.homeTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.homeSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right || (
            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              onPress={onRightPress}
              accessibilityLabel="Notifications"
              hitSlop={8}>
              <Icon name={rightIcon} size={20} color={colors.ink} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { paddingTop: topInset + spacing.sm }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityLabel="Go back"
            hitSlop={8}>
            <Icon name="arrow-left" size={20} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={styles.sideSlot} />
        )}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.sideSlot}>
          {right ||
            (onRightPress ? (
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                onPress={onRightPress}
                hitSlop={8}>
                <Icon name={rightIcon} size={20} color={colors.ink} />
              </Pressable>
            ) : (
              <View style={styles.iconBtn} />
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  brandKicker: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  homeTitle: {
    ...typography.greeting,
    color: colors.ink,
  },
  homeSubtitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  sideSlot: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
    textTransform: 'lowercase',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
