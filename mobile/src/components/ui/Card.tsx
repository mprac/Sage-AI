import React from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '../../theme';

/** Themed surface card with consistent radius, padding, border, and shadow. */
export function Card({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
        },
        theme.shadow.card,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
