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

import { Icon, type IconName, Text } from '../../../components/ui';
import { useTheme } from '../../../theme';
import type { SagePet, SageState } from '../../../types/api';

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
  onCookNow: () => void;
  onTreat: () => void;
  onRename: () => void;
  onShop: () => void;
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

/** A slim progress bar (vitality / XP). */
export function Bar({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <View style={{ height: 10, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: color }} />
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
        <Icon name={icon} tone="primary" size="sm" />
      </View>
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}
