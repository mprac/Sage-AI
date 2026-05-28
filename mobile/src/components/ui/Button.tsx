import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
} from 'react-native';

import { haptic } from '../../lib/haptics';
import { useTheme } from '../../theme';
import { Icon, type IconName } from './Icon';
import { ShineOverlay } from './ShineOverlay';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: IconName;
}

/** Themed button: brand-gradient primary, press-scale, haptic feedback.
 *
 *  When `loading` is true, the label stays visible (so the action still reads as a button) and a
 *  diagonal "shine" gradient sweeps continuously across the surface, suggesting work in flight —
 *  more delightful than a generic spinner for a long-running mutation like recipe generation. */
export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  loading,
  fullWidth = true,
  icon,
  disabled,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const solid = isPrimary || isDanger;

  const textTone = solid ? 'onPrimary' : isGhost ? 'primary' : 'text';
  const padV = size === 'lg' ? 16 : 12;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  const shineTint = solid ? 'rgba(255,255,255,0.55)' : `${theme.colors.primary}55`;

  const inner = (
    <View style={styles.content}>
      {icon ? <Icon name={icon} tone={textTone} size="sm" /> : null}
      <Text variant="label" tone={textTone}>
        {title}
      </Text>
      {loading ? (
        <ActivityIndicator
          color={solid ? theme.colors.onPrimary : theme.colors.primary}
          style={{ marginLeft: 4 }}
          size="small"
        />
      ) : null}
    </View>
  );

  const radiusStyle = { borderRadius: theme.radius.lg };
  const handlePress = (e: GestureResponderEvent) => {
    haptic.light();
    onPress?.(e);
  };

  return (
    <Animated.View style={{ transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'flex-start' }}>
      <Pressable
        disabled={disabled || loading}
        onPress={handlePress}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        style={[{ opacity: disabled ? 0.45 : 1 }, style as object]}
        {...rest}
      >
        {isPrimary ? (
          <LinearGradient
            colors={theme.gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, radiusStyle, { paddingVertical: padV, overflow: 'hidden' }, theme.shadow.sm]}
          >
            {inner}
            <ShineOverlay loading={!!loading} tint={shineTint} />
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.base,
              radiusStyle,
              {
                paddingVertical: padV,
                backgroundColor: isDanger ? theme.colors.danger : isGhost ? 'transparent' : theme.colors.card,
                borderColor: theme.colors.border,
                borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
                overflow: 'hidden',
              },
              isDanger ? theme.shadow.sm : null,
            ]}
          >
            {inner}
            <ShineOverlay loading={!!loading} tint={shineTint} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
