/** Themed linear gradient — reads gradient stops from the theme so it recolors with the brand. */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import type { ViewStyle } from 'react-native';

import { useTheme } from '../../theme';

interface GradientProps {
  name?: 'brand' | 'hero' | 'heroWarm' | 'accent' | 'appetite' | 'glow' | 'bubble';
  /** Custom stops override `name`. */
  colors?: [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function Gradient({
  name = 'brand',
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  children,
}: GradientProps) {
  const theme = useTheme();
  const stops = colors ?? theme.gradients[name];
  return (
    <LinearGradient colors={stops} start={start} end={end} style={style}>
      {children}
    </LinearGradient>
  );
}
