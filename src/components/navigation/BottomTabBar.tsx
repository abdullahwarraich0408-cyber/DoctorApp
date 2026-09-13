import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Calendar,
  Video,
  Users,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import {
  TAB_BAR_CENTER_LIFT,
  TAB_BAR_HEIGHT,
  getTabBarOccupiedHeight,
} from '../../theme/layout';
import type { MainTabParamList } from '../../navigation/types';

type TabConfig = {
  name: keyof MainTabParamList;
  label: string;
  IconComponent: LucideIcon;
  isCenter?: boolean;
};

const TABS: TabConfig[] = [
  {
    name: 'Home',
    label: 'Home',
    IconComponent: Home,
  },
  {
    name: 'Appointments',
    label: 'Appointments',
    IconComponent: Calendar,
  },
  {
    name: 'Consult',
    label: 'Consult',
    IconComponent: Video,
    isCenter: true,
  },
  {
    name: 'Patients',
    label: 'Patients',
    IconComponent: Users,
  },
  {
    name: 'Profile',
    label: 'Account',
    IconComponent: User,
  },
];

const CENTER_SIZE = 56;

function getActiveTabIndex(state: BottomTabBarProps['state']) {
  const activeRoute = state.routes[state.index];
  if (!activeRoute) return 0;
  const configIndex = TABS.findIndex(tab => tab.name === activeRoute.name);
  return configIndex >= 0 ? configIndex : state.index;
}

export function BottomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = getActiveTabIndex(state);
  const bottomPad = Math.max(insets.bottom, spacing.xs);
  const occupiedHeight = getTabBarOccupiedHeight(insets.bottom);

  const centerIndex = TABS.findIndex(t => t.isCenter);
  const isCenterFocused = activeIndex === centerIndex;

  const handleTabPress = (index: number, isFocused: boolean) => {
    const route = state.routes.find(r => r.name === TABS[index]?.name);
    if (!route) return;

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (event.defaultPrevented) return;

    if (!isFocused) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={[styles.shell, { height: occupiedHeight }]} pointerEvents="box-none">
      <View
        style={[styles.wrapper, { paddingBottom: bottomPad }]}
        pointerEvents="box-none">
        <View style={styles.floatingBarContainer} pointerEvents="box-none">
          <View style={styles.floatingBar}>
            <View style={styles.barInner}>
              {TABS.map((tab, index) => {
                const route = state.routes.find(r => r.name === tab.name);
                if (!route) return null;
                const isFocused = activeIndex === index;
                const IconComp = tab.IconComponent;

                if (tab.isCenter) {
                  return (
                    <View key={tab.name} style={styles.centerSpacerCell}>
                      <Text
                        style={[
                          styles.centerLabel,
                          isCenterFocused && styles.centerLabelActive,
                        ]}>
                        {tab.label}
                      </Text>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={tab.name}
                    style={styles.tabCell}
                    onPress={() => handleTabPress(index, isFocused)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isFocused }}
                    accessibilityLabel={
                      descriptors[route.key]?.options.tabBarAccessibilityLabel ??
                      tab.label
                    }
                    android_ripple={{
                      color: 'rgba(0, 109, 114, 0.08)',
                      borderless: true,
                    }}
                    hitSlop={4}>
                    <View style={styles.tabInner}>
                      <View
                        style={[
                          styles.iconWrap,
                          isFocused && styles.iconWrapActive,
                        ]}>
                        <IconComp
                          size={20}
                          color={isFocused ? colors.primary : colors.textMuted}
                          strokeWidth={isFocused ? 2.3 : 1.8}
                        />
                      </View>
                      <Text
                        style={[
                          styles.tabLabel,
                          isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                        ]}
                        numberOfLines={1}>
                        {tab.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.centerFloatingOverlay} pointerEvents="box-none">
            <Pressable
              onPress={() => handleTabPress(centerIndex, isCenterFocused)}
              accessibilityRole="button"
              accessibilityState={{ selected: isCenterFocused }}
              accessibilityLabel="Start Telehealth Consultation"
              android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true }}>
              <View
                style={[
                  styles.centerBtn,
                  isCenterFocused && styles.centerBtnActive,
                ]}>
                <Video size={24} color="#FFFFFF" strokeWidth={2.2} />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  wrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: TAB_BAR_CENTER_LIFT,
  },
  floatingBarContainer: {
    width: '100%',
    position: 'relative',
  },
  floatingBar: {
    width: '100%',
    height: TAB_BAR_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#E7ECF1',
    ...shadows.cardElevated,
  },
  barInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabCell: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  iconWrapActive: {
    backgroundColor: colors.aqua,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  tabLabelInactive: {
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  centerSpacerCell: {
    width: CENTER_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 24,
  },
  centerLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  centerFloatingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.fab,
  },
  centerBtnActive: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.04 }],
  },
});
