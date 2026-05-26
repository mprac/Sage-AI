import React from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
}

/** Themed text input with optional label. */
export function Input({ label, style, ...rest }: InputProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            ...theme.typography.body,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({ input: { borderWidth: 1 } });
