/** Animated "shine" sweep overlay — a translucent gradient stripe that slides diagonally across
 *  its parent forever while `loading`. Drop into any rounded surface as a sibling of its content;
 *  the parent must clip via `overflow: 'hidden'` for the shine to wipe cleanly at the edges.
 *
 *  Used to make long-running actions (recipe generation, save) feel alive without a separate
 *  spinner — the surface itself looks like it's working. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, View } from 'react-native';

interface Props {
  loading: boolean;
  /** Color of the shine peak (middle of the gradient). Defaults to translucent white. */
  tint?: string;
  /** Sweep speed (ms per full traversal). Defaults to 1500. */
  duration?: number;
}

export function ShineOverlay({ loading, tint = 'rgba(255,255,255,0.55)', duration = 1500 }: Props) {
  const [width, setWidth] = useState(0);
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading || width <= 0) {
      shine.stopAnimation();
      shine.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(shine, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [loading, width, shine, duration]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== width) setWidth(w);
  };

  const SHINE_W = Math.max(width, 120);

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
    >
      {loading && width > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: SHINE_W,
            transform: [
              {
                translateX: shine.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-SHINE_W, width + SHINE_W],
                }),
              },
              { skewX: '-20deg' },
            ],
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', tint, 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
