/** Sage's animated avatar — emoji-based (Lottie can swap in later), with an equipped hat overlay. */
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from '../../components/ui';

interface Props {
  moodEmoji: string;
  hatEmoji?: string | null;
  dormant?: boolean;
  size?: number;
}

export function SageAvatar({ moodEmoji, hatEmoji, dormant, size = 140 }: Props) {
  const theme = useTheme();
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle idle bob; slows to a near-stop when fainted.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: dormant ? 2600 : 1100, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: dormant ? 2600 : 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, dormant]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, dormant ? -2 : -10] });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'flex-end', height: size + 24 }}>
      {hatEmoji ? (
        <Animated.View style={{ transform: [{ translateY }], marginBottom: -size * 0.32, zIndex: 2 }}>
          <Text style={{ fontSize: size * 0.4 }}>{hatEmoji}</Text>
        </Animated.View>
      ) : null}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY }],
          opacity: dormant ? 0.6 : 1,
        }}
      >
        <Text style={{ fontSize: size * 0.55 }}>{moodEmoji}</Text>
      </Animated.View>
    </View>
  );
}
