import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
} from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

/** Themed button. Color/spacing/radius all come from the theme tokens. */
export function Button({
  title,
  variant = 'primary',
  loading,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const bg = isPrimary ? theme.colors.primary : isGhost ? 'transparent' : theme.colors.surface;
  const borderColor = isGhost ? 'transparent' : theme.colors.border;
  const textTone = isPrimary ? 'onPrimary' : 'text';

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth,
          borderRadius: theme.radius.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          opacity: pressed || disabled ? 0.7 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style as object,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={isPrimary ? theme.colors.onPrimary : theme.colors.primary} />
        ) : (
          <Text variant="title" tone={textTone}>
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
