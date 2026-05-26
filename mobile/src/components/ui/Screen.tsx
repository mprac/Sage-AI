import React from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
}

/** Page wrapper: themed background, safe-area insets, optional scroll + padding. */
export function Screen({ scroll, padded = true, style, children, ...rest }: ScreenProps) {
  const theme = useTheme();
  const inner = (
    <View
      style={[{ flex: 1, padding: padded ? theme.spacing.lg : 0, gap: theme.spacing.md }, style]}
      {...rest}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.grow} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, grow: { flexGrow: 1 } });
