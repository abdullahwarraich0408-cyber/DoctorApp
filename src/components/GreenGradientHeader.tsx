import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

type GreenGradientHeaderProps = {
  style?: ViewStyle | (ViewStyle | false | null | undefined)[];
  children?: React.ReactNode;
};

/**
 * Left→right teal gradient matching Home "Next Patient" card
 * (Start Consult / primary accents): bright teal → primary → deep teal.
 */
export default function GreenGradientHeader({ style, children }: GreenGradientHeaderProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== layout.width || height !== layout.height)) {
      setLayout({ width, height });
    }
  };

  const w = layout.width;
  const h = layout.height;

  // Explicit hex (same as Next Patient Start Consult theme) — visible L→R shift
  const GRAD_LEFT = '#00A3A8';
  const GRAD_MID = '#006D72';
  const GRAD_RIGHT = '#003E42';

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {w > 0 && h > 0 ? (
        <Svg
          width={w}
          height={h}
          style={styles.absoluteSvg}
          pointerEvents="none">
          <Defs>
            <LinearGradient
              id="hGradLeftRight"
              x1="0"
              y1="0"
              x2={w}
              y2="0"
              gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={GRAD_LEFT} />
              <Stop offset="0.5" stopColor={GRAD_MID} />
              <Stop offset="1" stopColor={GRAD_RIGHT} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill="url(#hGradLeftRight)" />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#00A3A8',
  },
  absoluteSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
