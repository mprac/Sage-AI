import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '../../theme';

type Variant = 'display' | 'heading' | 'title' | 'body' | 'caption';
type Tone = 'text' | 'muted' | 'primary' | 'onPrimary' | 'danger' | 'success';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
}

/** Themed text. All typography flows through the theme — no inline font sizes in screens. */
export function Text({ variant = 'body', tone = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  const toneColor =
    tone === 'text'
      ? theme.colors.text
      : tone === 'muted'
        ? theme.colors.muted
        : tone === 'primary'
          ? theme.colors.primary
          : tone === 'onPrimary'
            ? theme.colors.onPrimary
            : tone === 'danger'
              ? theme.colors.danger
              : theme.colors.success;

  return <RNText style={[theme.typography[variant], { color: toneColor }, style]} {...rest} />;
}
