/** Small pill badge — for moods, levels, streaks, category chips. Theme-driven. */
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface BadgeProps {
  label: string;
  icon?: IconName;
  /** Explicit colors win; otherwise uses a soft brand tint. */
  bg?: string;
  fg?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, icon, bg, fg, size = 'md' }: BadgeProps) {
  const theme = useTheme();
  const background = bg ?? theme.colors.primarySoft;
  const color = fg ?? theme.colors.primary;
  const padV = size === 'sm' ? 3 : 5;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'center',
        backgroundColor: background,
        paddingVertical: padV,
        paddingHorizontal: theme.spacing.sm + 2,
        borderRadius: theme.radius.pill,
      }}
    >
      {icon ? <Icon name={icon} color={color} size="sm" /> : null}
      <Text variant="overline" style={{ color }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
