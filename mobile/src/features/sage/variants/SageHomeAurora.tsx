/** Sage home — "Aurora": scrollable, gradient hero panel, stat chips, quote card, gradient CTA. */
import React from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Gradient, Icon, type IconName, Screen, Text } from '../../../components/ui';
import { useTheme } from '../../../theme';
import { SageAvatar } from '../SageAvatar';
import { Bar, type SageVariantProps } from './shared';

/** Horizontal stat chip (icon + value + label) tinted by the accent palette. */
function Chip({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 2,
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.md,
        paddingVertical: theme.spacing.sm + 2,
        ...theme.shadow.sm,
      }}
    >
      <Icon name={icon} color={theme.colors.accent} size="sm" />
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}

export function SageHomeAurora({
  sage,
  moodColor,
  xpPct,
  accessoryIcon,
  themeColor,
  treatPending,
  onCookNow,
  onTreat,
  onRename,
  onShop,
}: SageVariantProps) {
  const theme = useTheme();

  return (
    <Screen scroll padded={false}>
      {/* Gradient hero panel */}
      <Gradient
        name="hero"
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          alignItems: 'center',
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.sm,
          borderBottomLeftRadius: theme.radius.xl,
          borderBottomRightRadius: theme.radius.xl,
        }}
      >
        <SageAvatar
          vitality={sage.vitality}
          moodColor={moodColor}
          themeColor={themeColor}
          accessoryIcon={accessoryIcon}
          dormant={sage.is_dormant}
          size={140}
        />
        <Pressable
          onPress={onRename}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}
        >
          <Text variant="hero">{sage.name}</Text>
          <Icon name="pencil" tone="muted" size="sm" />
        </Pressable>
        <Badge label={sage.mood} fg={moodColor} bg={theme.colors.card} />
      </Gradient>

      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        {/* Stat chips */}
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Chip icon="flame" value={sage.streak_days} label="streak" />
          <Chip icon="heart" value={sage.bond_level} label="bond" />
          <Chip icon="trophy" value={sage.longest_streak} label="best" />
        </View>

        {/* Vitality + level */}
        <Card variant="elevated" style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" tone="muted">Vitality</Text>
              <Text variant="caption" tone="muted">{sage.vitality}/100</Text>
            </View>
            <Bar value={sage.vitality} color={moodColor} track={theme.colors.surface} />
          </View>
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" tone="muted">Level {sage.level}</Text>
              <Text variant="caption" tone="muted">{sage.xp}/{sage.xp_to_next} XP</Text>
            </View>
            <Bar value={xpPct} color={theme.colors.primary} track={theme.colors.surface} />
          </View>
        </Card>

        {/* Message as a quote card */}
        <Card style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
          <Icon name="sparkles" tone="primary" size="sm" />
          <Text style={{ flex: 1, fontStyle: 'italic' }}>{sage.message}</Text>
        </Card>

        {/* Actions */}
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            title={sage.is_dormant ? `Cook to revive ${sage.name}` : `Cook now — feed ${sage.name}`}
            icon="camera"
            onPress={onCookNow}
          />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Give a treat" variant="secondary" icon="gem" loading={treatPending} onPress={onTreat} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Closet" variant="ghost" icon="shopping-bag" onPress={onShop} />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}
