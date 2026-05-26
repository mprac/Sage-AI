import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

/** Small header chip showing the live credit balance. */
export function CreditPill({ balance }: { balance: number | null }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.accentSoft,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
      }}
    >
      <Text variant="caption" tone="primary">
        ✦ {balance ?? '—'} credits
      </Text>
    </View>
  );
}
