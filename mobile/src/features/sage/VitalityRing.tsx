/** Animated circular vitality ring (react-native-svg + reanimated) around the Sage avatar.
 *  Strokes with a multi-stop gradient (`gradient`) when provided — an iridescent "AI" sweep. */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const GRAD_ID = 'sageVitalityGradient';

interface Props {
  value: number; // 0-100
  size: number;
  color: string;
  track: string;
  /** Multi-stop gradient for the progress stroke (overrides `color`). */
  gradient?: readonly string[];
  strokeWidth?: number;
  children?: React.ReactNode;
}

export function VitalityRing({ value, size, color, track, gradient, strokeWidth = 6, children }: Props) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(100, value)) / 100, { duration: 700 });
  }, [value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  const stroke = gradient && gradient.length > 1 ? `url(#${GRAD_ID})` : color;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {gradient && gradient.length > 1 ? (
          <Defs>
            <LinearGradient id={GRAD_ID} x1="0" y1="0" x2="1" y2="1">
              {gradient.map((c, i) => (
                <Stop key={i} offset={i / (gradient.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          animatedProps={animatedProps}
          // start at 12 o'clock
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
