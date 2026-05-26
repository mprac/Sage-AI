/** Sage's avatar — chef mark inside an animated vitality ring with a glow, theme color, and an
 *  optional accessory icon badge. Calmly hovers up and down (slows when fainted). */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Icon, type IconName } from '../../components/ui';
import { useTheme } from '../../theme';
import { VitalityRing } from './VitalityRing';

interface Props {
  vitality: number;
  moodColor: string;
  themeColor?: string | null;
  accessoryIcon?: IconName | null;
  dormant?: boolean;
  size?: number;
}

export function SageAvatar({ vitality, moodColor, themeColor, accessoryIcon, dormant, size = 156 }: Props) {
  const theme = useTheme();
  const disc = size - 24;
  const hover = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = dormant ? 2800 : 1900; // slower, fainter when dormant
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hover, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hover, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hover, dormant]);

  const translateY = hover.interpolate({ inputRange: [0, 1], outputRange: [0, dormant ? -3 : -8] });

  return (
    <Animated.View style={{ width: size, height: size, opacity: dormant ? 0.7 : 1, transform: [{ translateY }] }}>
      <VitalityRing value={vitality} size={size} color={moodColor} track={theme.colors.divider} strokeWidth={7}>
        <View
          style={[
            {
              width: disc,
              height: disc,
              borderRadius: disc / 2,
              backgroundColor: themeColor ?? theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            },
            theme.shadow.glow,
            { shadowColor: moodColor },
          ]}
        >
          <Icon name="chef-hat" size={Math.round(disc * 0.46)} tone="primary" />
        </View>
      </VitalityRing>

      {accessoryIcon ? (
        <View
          style={{
            position: 'absolute',
            right: 2,
            bottom: 2,
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.colors.card,
            borderWidth: 3,
            borderColor: theme.colors.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={accessoryIcon} tone="primary" size="md" />
        </View>
      ) : null}
    </Animated.View>
  );
}
