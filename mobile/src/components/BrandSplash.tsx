/**
 * Animated launch splash — a warm "appetite" gradient with the Sage AI wordmark and food glyphs
 * gently floating in. Shown over the app on cold start; fades out once the app is `ready` and a
 * minimum dwell has elapsed (so the brand moment is always seen). Built in code — no image asset.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette, useTheme } from '../theme';
import { SageChefMark } from './SageChefMark';
import { Gradient, Icon, type IconName, Text } from './ui';

const WHITE = palette.neutral[0];
const MIN_DWELL_MS = 1300;

// Food glyphs scattered around the edges (percent positions) so they never crowd the wordmark.
const GLYPHS: { icon: IconName; left: number; top: number; size: number; delay: number }[] = [
  { icon: 'leaf', left: 12, top: 16, size: 30, delay: 0 },
  { icon: 'sparkles', left: 50, top: 10, size: 22, delay: 420 },
  { icon: 'cookie', left: 80, top: 20, size: 26, delay: 260 },
  { icon: 'utensils', left: 10, top: 50, size: 24, delay: 160 },
  { icon: 'flame', left: 84, top: 48, size: 24, delay: 600 },
  { icon: 'cookie', left: 18, top: 78, size: 22, delay: 520 },
  { icon: 'leaf', left: 82, top: 76, size: 30, delay: 320 },
];

/** A single food glyph that drifts up and down forever after a staggered entrance. */
function FloatingGlyph({ icon, left, top, size, delay }: (typeof GLYPHS)[number]) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 + t.value * 12 }],
    opacity: 0.16 + t.value * 0.14,
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: `${left}%`, top: `${top}%` }, style]}>
      <Icon name={icon} color={WHITE} size={size} />
    </Animated.View>
  );
}

export function BrandSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const theme = useTheme();
  const opacity = useSharedValue(1);
  const enter = useSharedValue(0);
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) });
    const id = setTimeout(() => setMinDone(true), MIN_DWELL_MS);
    return () => clearTimeout(id);
  }, [enter]);

  useEffect(() => {
    if (ready && minDone) {
      opacity.value = withTiming(0, { duration: 480, easing: Easing.in(Easing.cubic) }, (fin) => {
        if (fin) runOnJS(onFinish)();
      });
    }
  }, [ready, minDone, opacity, onFinish]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const mark = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 18 }, { scale: 0.9 + enter.value * 0.1 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, fade]}>
      <Gradient
        name="brand"
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.fill}
      >
        {GLYPHS.map((g, i) => (
          <FloatingGlyph key={i} {...g} />
        ))}

        <Animated.View style={[styles.center, mark]}>
          <View
            style={[
              {
                width: 96,
                height: 96,
                borderRadius: 30,
                backgroundColor: `${WHITE}26`,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              },
              theme.shadow.glow,
            ]}
          >
            <SageChefMark size={80} />
          </View>
          <Text variant="hero" style={{ color: WHITE, marginTop: theme.spacing.md }}>
            Sage AI
          </Text>
          <Text variant="title" style={{ color: WHITE, opacity: 0.92 }}>
            Your personal chef
          </Text>
        </Animated.View>
      </Gradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 999 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 6 },
});
