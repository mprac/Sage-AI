/**
 * Circular harvest meter — the seasonal-journey sibling of VitalityRing.
 * Shows how many in-season produce slugs the user has cooked this season,
 * stroked with the current season's gradient (spring blossoms → fall amber).
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Icon, type IconName, Text } from '../../components/ui';
import { useTheme } from '../../theme';
import type { Season } from '../../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const GRAD_ID = 'sageHarvestGradient';

interface Props {
  cooked: number;            // current slugs filled (e.g. 5)
  total: number;             // catalog size for the season (e.g. 12)
  season: Season;            // drives stroke gradient + center icon
  size?: number;             // default 72
  strokeWidth?: number;      // default 6
  showLabel?: boolean;       // when true, renders "5/12" below — default false
}

export function HarvestMeter({
  cooked,
  total,
  season,
  size = 72,
  strokeWidth = 6,
  showLabel = false,
}: Props) {
  const theme = useTheme();
  const palette = theme.seasonPalette[season];
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const fill = total > 0 ? Math.max(0, Math.min(1, cooked / total)) : 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(fill, { duration: 700 });
  }, [fill, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id={GRAD_ID} x1="0" y1="0" x2="1" y2="1">
              {palette.ring.map((c, i) => (
                <Stop key={i} offset={i / (palette.ring.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.colors.surface}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${GRAD_ID})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Icon name={palette.icon as IconName} color={palette.ring[0]} size="md" />
      </View>
      {showLabel ? (
        <Text variant="overline" tone="muted">
          {cooked}/{total}
        </Text>
      ) : null}
    </View>
  );
}
