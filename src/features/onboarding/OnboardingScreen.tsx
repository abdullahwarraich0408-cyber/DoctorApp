import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingSlide } from './components/OnboardingSlide';
import { Pagination } from './components/Pagination';
import { OnboardingButton } from './components/OnboardingButton';
import { SkipButton } from './components/SkipButton';
import { ONBOARDING_SLIDES } from './data';
import type { OnboardingAuthTarget } from './data';
import { setOnboardingComplete } from './storage';
import { colors } from '../../theme';

type OnboardingScreenProps = {
  onComplete: (target?: OnboardingAuthTarget) => void;
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<Animated.FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const isLast = index === ONBOARDING_SLIDES.length - 1;

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await setOnboardingComplete();
      onComplete('signin');
    } catch {
      onComplete('signin');
    }
  }, [finishing, onComplete]);

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(next, ONBOARDING_SLIDES.length - 1));
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setIndex(clamped);
  }, []);

  const onNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    goTo(index + 1);
  }, [finish, goTo, index, isLast]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index > 0) {
        goTo(index - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goTo, index]);

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== index) {
        setIndex(next);
      }
    },
    [index, width],
  );

  const primaryLabel = useMemo(() => {
    if (index === 0) return 'Get started';
    if (isLast) return 'Sign in';
    return 'Next';
  }, [index, isLast]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        {isLast ? (
          <View style={styles.skipPlaceholder} />
        ) : (
          <SkipButton onPress={finish} />
        )}
      </View>

      <Animated.FlatList
        ref={listRef}
        style={styles.list}
        data={ONBOARDING_SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onScrollToIndexFailed={({ index: failedIndex }) => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToIndex({ index: failedIndex, animated: true });
          });
        }}
        renderItem={({ item, index: itemIndex }) => {
          const inputRange = [
            (itemIndex - 1) * width,
            itemIndex * width,
            (itemIndex + 1) * width,
          ];
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.35, 1, 0.35],
            extrapolate: 'clamp',
          });
          const translateY = scrollX.interpolate({
            inputRange,
            outputRange: [12, 0, 12],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View style={[styles.page, { width, opacity, transform: [{ translateY }] }]}>
              <OnboardingSlide slide={item} width={width} />
            </Animated.View>
          );
        }}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Pagination count={ONBOARDING_SLIDES.length} index={index} />
        <View style={styles.actions}>
          <OnboardingButton
            label={primaryLabel}
            onPress={onNext}
            loading={finishing && isLast}
          />
          {index === 0 ? (
            <OnboardingButton
              label="I already have an account"
              variant="secondary"
              onPress={finish}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    minHeight: 52,
    justifyContent: 'center',
  },
  skipPlaceholder: {
    height: 44,
  },
  list: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 20,
  },
  actions: {
    gap: 4,
  },
});
