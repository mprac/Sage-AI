/** Subtle, solid entrance — a gentle opacity fade (no spring, no slide/bounce). */
import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

export function FadeInUp({
  children,
  index = 0,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  return (
    <Animated.View entering={FadeIn.delay(index * 45).duration(220)} style={style}>
      {children}
    </Animated.View>
  );
}
