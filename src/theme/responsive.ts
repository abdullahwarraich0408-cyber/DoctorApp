import { useMemo } from 'react';
import { useWindowDimensions, PixelRatio } from 'react-native';

/** Breakpoints aligned to common phone / phablet / tablet widths. */
export const BREAKPOINTS = {
  compact: 380,
  phone: 430,
  largePhone: 600,
  tablet: 768,
} as const;

export type LayoutSize = 'compact' | 'phone' | 'large' | 'tablet';

export function getLayoutSize(width: number): LayoutSize {
  if (width < BREAKPOINTS.compact) return 'compact';
  if (width < BREAKPOINTS.largePhone) return 'phone';
  if (width < BREAKPOINTS.tablet) return 'large';
  return 'tablet';
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** Scale a base size mildly with screen width (capped). */
export function scaleByWidth(width: number, base: number, factor = 0.35) {
  const ratio = clamp(width / 390, 0.88, 1.18);
  return Math.round(base * (1 + (ratio - 1) * factor));
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const size = getLayoutSize(width);
    const isCompact = size === 'compact';
    const isTablet = size === 'tablet';
    const isLandscape = width > height;
    const contentPad = isCompact ? 12 : isTablet ? 24 : 16;
    const fontScale = PixelRatio.getFontScale();

    // Video stage: shorter phones need more room for the clinical sheet
    let videoStageHeight: number;
    if (isLandscape && width >= BREAKPOINTS.largePhone) {
      videoStageHeight = height;
    } else if (isTablet && !isLandscape) {
      videoStageHeight = Math.round(clamp(height * 0.36, 280, 420));
    } else if (height < 700) {
      videoStageHeight = Math.round(clamp(height * 0.34, 200, 280));
    } else {
      videoStageHeight = Math.round(clamp(height * 0.4, 240, height * 0.46));
    }

    // Side-by-side only when wide enough that both panes stay usable
    const useSplitLayout =
      (isTablet && width >= BREAKPOINTS.tablet) ||
      (isLandscape && width >= BREAKPOINTS.largePhone);

    const controlBtnSize = isCompact ? 38 : 42;
    const bottomBarBtnHeight = isCompact ? 42 : 46;
    const modalMaxHeight = Math.round(height * (isCompact ? 0.62 : 0.58));

    return {
      width,
      height,
      size,
      isCompact,
      isTablet,
      isLandscape,
      useSplitLayout,
      contentPad,
      fontScale,
      videoStageHeight,
      controlBtnSize,
      bottomBarBtnHeight,
      modalMaxHeight,
      titleSize: scaleByWidth(width, isCompact ? 15 : 16),
      bodySize: scaleByWidth(width, 13),
      labelSize: scaleByWidth(width, 11),
    };
  }, [width, height]);
}
