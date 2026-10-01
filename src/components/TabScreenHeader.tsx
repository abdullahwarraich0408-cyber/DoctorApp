import React, { type ReactNode } from 'react';
import {
  Text,
  View,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import GreenGradientHeader from './GreenGradientHeader';
import {
  getStatusBarTopInset,
  tabScreenHeaderShellStyle,
  tabScreenHeaderStyles as H,
} from '../theme/tabScreenHeader';

type TabScreenHeaderProps = {
  /** Canonical screen name (left). Ignored when `leading` is provided. */
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  /** Replaces the default title block (e.g. Home profile row). */
  leading?: ReactNode;
  /** Right-side actions (icons, badges). */
  right?: ReactNode;
  /** Secondary band under the title row (chips, live toggle, etc.). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fixed-height teal header shared by DoctorApp tab/stack screens.
 * Screen titles always use the same type size/weight regardless of siblings.
 */
export default function TabScreenHeader({
  title,
  subtitle,
  showBack = false,
  leading,
  right,
  children,
  style,
}: TabScreenHeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const topInset = getStatusBarTopInset(insets.top);
  const hasSecondary = Boolean(children) || Boolean(subtitle);

  return (
    <GreenGradientHeader style={[tabScreenHeaderShellStyle(topInset), style]}>
      <View
        style={[
          H.inner,
          hasSecondary ? H.innerSplit : H.innerCentered,
        ]}>
        <View style={H.titleRow}>
          {showBack ? (
            <Pressable
              style={H.backBtn}
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
              }}
              accessibilityLabel="Go back"
              hitSlop={8}>
              <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          ) : null}

          {leading ? (
            <View style={H.titleBlock}>{leading}</View>
          ) : (
            <View style={H.titleBlock}>
              {title ? (
                <Text style={H.title} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
            </View>
          )}
          {right ? (
            <View style={H.rightSlot}>{right}</View>
          ) : showBack ? (
            <View style={H.backBtnSpacer} />
          ) : null}
        </View>
        {hasSecondary ? (
          <View style={H.secondary}>
            {subtitle ? (
              <Text style={H.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
            {children}
          </View>
        ) : null}
      </View>
    </GreenGradientHeader>
  );
}

export {
  screenHeaderTitleStyle,
  screenHeaderSubtitleStyle,
} from '../theme/tabScreenHeader';
