import React, { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
}

/** Themed text input — filled surface, rounded, with a focus ring in the brand color.
 *  Forwards its ref to the underlying TextInput so callers can `.focus()` it programmatically. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <Text variant="overline" tone="muted">
          {label.toUpperCase()}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.subtle}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.card,
            borderColor: focused ? theme.colors.primary : theme.colors.border,
            borderWidth: focused ? 2 : 1,
            borderRadius: theme.radius.md,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.md,
            ...theme.typography.body,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
});
