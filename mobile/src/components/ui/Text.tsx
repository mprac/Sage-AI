import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../../theme';

type Variant = 'hero' | 'display' | 'heading' | 'title' | 'body' | 'label' | 'caption' | 'overline';
type Tone = 'text' | 'title' | 'muted' | 'subtle' | 'primary' | 'onPrimary' | 'danger' | 'success';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
}

/** Themed text. All typography (font family, size, spacing) flows through the theme. */
export function Text({ variant = 'body', tone = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  const color = theme.colors[tone as keyof typeof theme.colors] ?? theme.colors.text;
  return <RNText style={[theme.typography[variant], { color }, style]} {...rest} />;
}
