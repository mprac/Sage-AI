/** Friendly empty/error state — icon medallion + title + subtitle + optional CTA. */
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.xl }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} tone="primary" size="xl" />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>{title}</Text>
      {subtitle ? (
        <Text tone="muted" style={{ textAlign: 'center', maxWidth: 300 }}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        // Row wrapper centers the auto-width button (its own alignSelf:'flex-start' would
        // otherwise pin it to the left of the centered column).
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch', marginTop: theme.spacing.sm }}>
          <Button title={actionLabel} fullWidth={false} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
