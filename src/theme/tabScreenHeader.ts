import { Platform, StatusBar, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { radius } from './radius';

/**
 * Shared teal screen header chrome.
 * Total header height = safe-area inset + TAB_SCREEN_HEADER_BODY.
 * Keeps Home / Appointments / Consult / Patients / Account visually aligned
 * even when inner content differs.
 */
export const TAB_SCREEN_HEADER_BODY = 112;
export const TAB_SCREEN_HEADER_PAD_TOP = 8;
export const TAB_SCREEN_HEADER_PAD_BOTTOM = 12;
export const TAB_SCREEN_HEADER_PAD_H = 20;
export const TAB_SCREEN_HEADER_TITLE_ROW = 44;
export const TAB_SCREEN_HEADER_RADIUS = radius.xl;

/** Canonical screen-name style for teal headers */
export const screenHeaderTitleStyle: TextStyle = {
  fontSize: 22,
  fontWeight: '700',
  color: '#FFFFFF',
  letterSpacing: -0.35,
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
};

export const screenHeaderSubtitleStyle: TextStyle = {
  fontSize: 12,
  fontWeight: '500',
  color: 'rgba(255, 255, 255, 0.85)',
  letterSpacing: -0.1,
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
};

export function getStatusBarTopInset(safeTop: number) {
  return Math.max(
    safeTop,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
}

export function tabScreenHeaderShellStyle(topInset: number): ViewStyle {
  return {
    height: topInset + TAB_SCREEN_HEADER_BODY,
    paddingTop: topInset + TAB_SCREEN_HEADER_PAD_TOP,
    paddingBottom: TAB_SCREEN_HEADER_PAD_BOTTOM,
    paddingHorizontal: TAB_SCREEN_HEADER_PAD_H,
    borderBottomLeftRadius: TAB_SCREEN_HEADER_RADIUS,
    borderBottomRightRadius: TAB_SCREEN_HEADER_RADIUS,
  };
}

export const tabScreenHeaderStyles = StyleSheet.create({
  inner: {
    flex: 1,
  },
  innerSplit: {
    justifyContent: 'space-between',
  },
  innerCentered: {
    justifyContent: 'center',
  },
  titleRow: {
    minHeight: TAB_SCREEN_HEADER_TITLE_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    ...screenHeaderTitleStyle,
  },
  subtitle: {
    ...screenHeaderSubtitleStyle,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    flexShrink: 0,
  },
  backBtnSpacer: {
    width: 38,
    height: 38,
  },
  secondary: {
    justifyContent: 'flex-end',
    gap: 6,
    minHeight: 0,
  },
});
