/** A Pressable that springs down on touch and fires a light haptic on release — the native-iOS
 *  "this is tappable" feel. Use for nav/header buttons and any custom tappable surface. */
import React, { useRef } from 'react';
import { Animated, type GestureResponderEvent, Pressable, type PressableProps } from 'react-native';

import { haptic } from '../../lib/haptics';

interface PressableScaleProps extends Omit<PressableProps, 'children' | 'style'> {
  children: React.ReactNode;
  /** Scale at the bottom of the press (default 0.94 — subtle). */
  scaleTo?: number;
  /** Fire a light haptic on press (default true). */
  haptics?: boolean;
  style?: PressableProps['style'];
}

export function PressableScale({
  children,
  scaleTo = 0.94,
  haptics = true,
  onPress,
  style,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], alignSelf: 'flex-start' }}>
      <Pressable
        onPressIn={() => animate(scaleTo)}
        onPressOut={() => animate(1)}
        onPress={(e: GestureResponderEvent) => {
          if (haptics) haptic.light();
          onPress?.(e);
        }}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
