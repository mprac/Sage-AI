/**
 * Shared contract + helpers for Sage home **layout variants**.
 *
 * The Sage tab is split into a data container ([(tabs)/index.tsx](mobile/app/(tabs)/index.tsx))
 * and interchangeable presentational variants in this folder. The container fetches Sage + does
 * all mutations, then hands every variant the same `SageVariantProps`. To try a new design, add a
 * `SageVariantProps` component and register it in `./index.ts` — no data/handler wiring needed.
 */
import React from 'react';
import { View } from 'react-native';

import { Gradient, Icon, type IconName, Text } from '../../../components/ui';
import { palette, useTheme } from '../../../theme';
import type { SagePet, SageState, SeasonOut } from '../../../types/api';

/** Semantic colour for meaningful glyphs — so a heart is ALWAYS rose, a trophy ALWAYS gold, a
 *  flame ALWAYS coral, everywhere they appear. Returns undefined for icons with no fixed meaning
 *  (caller falls back to its default tint). */
export function iconTint(name: IconName, theme: ReturnType<typeof useTheme>): string | undefined {
  switch (name) {
    case 'flame':
      return theme.colors.energy; // streak / heat
    case 'heart':
      return theme.colors.love; // bond / love
    case 'trophy':
    case 'crown':
    case 'gem':
      return theme.colors.accent; // achievement / treasure = gold
    default:
      return undefined;
  }
}

/** Mood band → a 2-stop gradient for the vitality bar (keeps the health meaning, adds richness). */
export function moodGradient(state: SageState, theme: ReturnType<typeof useTheme>): [string, string] {
  if (state === 'thriving' || state === 'content') return [theme.colors.success, palette[300]];
  if (state === 'peckish') return [theme.colors.warning, palette.accent[300]];
  return [theme.colors.danger, palette.ember[400]];
}

/** Everything a layout variant needs — all derived state + handlers come pre-computed. */
export interface SageVariantProps {
  sage: SagePet;
  /** Mood-band color (success/warning/danger) for vitality + accents. */
  moodColor: string;
  /** XP progress to the next level, 0–100. */
  xpPct: number;
  accessoryIcon?: IconName;
  themeColor?: string | null;
  treatPending: boolean;
  /** The next cosmetic the user unlocks by leveling up (lowest locked unlock_level), or null if
   *  there's nothing left to unlock. Variants may surface it as a "goal" to chase. */
  nextReward?: { name: string; unlockLevel: number } | null;
  /** The user's current seasonal-journey info — null while loading or on failure. Used to
   *  paint the habitat with seasonal palette and surface the harvest meter. */
  season?: SeasonOut | null;
  onCookNow: () => void;
  onTreat: () => void;
  onRename: () => void;
  onShop: () => void;
  /** Open the Almanac timeline (past harvests + earned awards). */
  onOpenAlmanac: () => void;
}

export interface SageVariant {
  key: string;
  label: string;
  Component: React.ComponentType<SageVariantProps>;
}

/** Mood band → semantic color. Shared by the container (to derive the prop) and any variant. */
export function moodColor(state: SageState, theme: ReturnType<typeof useTheme>): string {
  if (state === 'thriving' || state === 'content') return theme.colors.success;
  if (state === 'peckish') return theme.colors.warning;
  return theme.colors.danger;
}

/** A slim progress bar (vitality / XP). Pass `colors` for a multi-stop gradient fill. */
export function Bar({
  value,
  color,
  track,
  colors,
}: {
  value: number;
  color?: string;
  track: string;
  colors?: readonly string[];
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ height: 10, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
      {colors && colors.length > 1 ? (
        <Gradient
          colors={colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct}%`, height: '100%', borderRadius: 999 }}
        />
      ) : (
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 999 }} />
      )}
    </View>
  );
}

/** An icon-medallion stat (streak / bond / best). */
export function Stat({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} color={iconTint(icon, theme) ?? theme.colors.primary} size="sm" />
      </View>
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}
