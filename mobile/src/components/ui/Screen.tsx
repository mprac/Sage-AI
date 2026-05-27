import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  /**
   * Safe-area edges to inset. Default `[]` — screens with a navigation header don't need a top
   * inset (the header already offsets content; adding one double-insets and causes a shift).
   * Headerless screens (e.g. sign-in) pass `['top','bottom']`.
   */
  edges?: Edge[];
  /**
   * Pull-to-refresh (only with `scroll`). Pass a query's refetch + its in-flight flag, e.g.
   * `onRefresh={refetch} refreshing={isRefetching}`. Enabling it also allows the bounce so the
   * gesture feels natural.
   */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** Page wrapper: themed background, optional scroll + padding + safe-area edges + pull-to-refresh. */
export function Screen({
  scroll,
  padded = true,
  edges = [],
  onRefresh,
  refreshing = false,
  style,
  children,
  ...rest
}: ScreenProps) {
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
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.grow}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          // Allow the bounce when pull-to-refresh is on, so the gesture has room to trigger.
          bounces={!!onRefresh}
          overScrollMode={onRefresh ? 'always' : 'never'}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
                progressBackgroundColor={theme.colors.card}
              />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, grow: { flexGrow: 1 } });
