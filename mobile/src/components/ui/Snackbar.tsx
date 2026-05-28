/**
 * SnackbarHost — renders the single global undo snackbar (see src/store/snackbar.ts).
 * Mounted once near the app root. A dark, floating pill that slides up from the bottom with an
 * Undo affordance; auto-commits after `duration`.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { useSnackbar } from '../../store/snackbar';
import { useTheme } from '../../theme';
import { Text } from './Text';

export function SnackbarHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const current = useSnackbar((s) => s.current);
  const dismiss = useSnackbar((s) => s.dismiss);

  // Re-arm the auto-commit timer whenever a new snackbar appears (keyed on id).
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => dismiss(true), current.duration);
    return () => clearTimeout(t);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  // Invert the surface so the bar reads as a distinct overlay in both light and dark themes.
  const barBg = theme.colors.text;
  const onBar = theme.colors.background;

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, styles.host, { paddingBottom: insets.bottom + theme.spacing.lg }]}
    >
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(260)}
        exiting={FadeOutDown.duration(180)}
        style={[
          styles.bar,
          theme.shadow.lg,
          {
            backgroundColor: barBg,
            borderRadius: theme.radius.pill,
            paddingVertical: theme.spacing.sm + 4,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}
      >
        <Text variant="label" style={{ color: onBar, flex: 1 }} numberOfLines={1}>
          {current.message}
        </Text>
        {current.actionLabel ? (
          <Pressable
            hitSlop={10}
            onPress={() => {
              haptic.light();
              dismiss(false);
            }}
            style={{ marginLeft: theme.spacing.md }}
          >
            <Text variant="label" style={{ color: theme.colors.primary }}>
              {current.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { justifyContent: 'flex-end', alignItems: 'stretch', paddingHorizontal: 16 },
  bar: { flexDirection: 'row', alignItems: 'center' },
});
