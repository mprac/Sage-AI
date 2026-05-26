import React from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '../../theme';

interface CardProps extends ViewProps {
  /** 'elevated' adds a soft shadow; 'flat' is borderless on surface; default has a hairline border. */
  variant?: 'default' | 'elevated' | 'flat';
  padded?: boolean;
}

/** Themed surface card — rounded, soft, consistent. */
export function Card({ variant = 'default', padded = true, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: variant === 'flat' ? theme.colors.surface : theme.colors.card,
          borderRadius: theme.radius.lg,
          borderWidth: variant === 'elevated' || variant === 'flat' ? 0 : 1,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
        },
        variant === 'elevated' ? theme.shadow.card : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
