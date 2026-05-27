/**
 * Themed icon wrapper around lucide-react-native — the single icon set for the app.
 * Every icon pulls its size from the theme's `iconSize` scale and its color from the theme,
 * so iconography stays consistent and recolors with the brand. Add new glyphs to `ICONS`.
 *
 * Usage: <Icon name="camera" tone="primary" size="md" />
 */
import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Coins,
  Cookie,
  Crown,
  Flame,
  Gem,
  Heart,
  ImagePlus,
  Leaf,
  type LucideIcon,
  LogOut,
  MessageCircle,
  Moon,
  Music,
  PartyPopper,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShoppingBag,
  Sparkles,
  Sun,
  Trophy,
  User,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react-native';

import { useTheme } from '../../theme';

const ICONS = {
  'chef-hat': ChefHat,
  camera: Camera,
  'image-plus': ImagePlus,
  sparkles: Sparkles,
  utensils: UtensilsCrossed,
  music: Music,
  coins: Coins,
  flame: Flame,
  heart: Heart,
  trophy: Trophy,
  'shopping-bag': ShoppingBag,
  play: Play,
  check: Check,
  'message-circle': MessageCircle,
  'book-open': BookOpen,
  user: User,
  send: Send,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  plus: Plus,
  x: X,
  'log-out': LogOut,
  pencil: Pencil,
  refresh: RefreshCw,
  crown: Crown,
  party: PartyPopper,
  leaf: Leaf,
  moon: Moon,
  sun: Sun,
  cookie: Cookie,
  gem: Gem,
  clock: Clock,
  users: Users,
  'chevron-down': ChevronDown,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
type Tone = 'text' | 'muted' | 'primary' | 'onPrimary' | 'danger' | 'success';

export interface IconProps {
  name: IconName;
  size?: keyof ReturnType<typeof useTheme>['iconSize'] | number;
  tone?: Tone;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 'md', tone = 'text', color, strokeWidth = 2 }: IconProps) {
  const theme = useTheme();
  const Glyph = ICONS[name];
  const px = typeof size === 'number' ? size : theme.iconSize[size];
  const toneColor =
    color ??
    (tone === 'muted'
      ? theme.colors.muted
      : tone === 'primary'
        ? theme.colors.primary
        : tone === 'onPrimary'
          ? theme.colors.onPrimary
          : tone === 'danger'
            ? theme.colors.danger
            : tone === 'success'
              ? theme.colors.success
              : theme.colors.text);
  return <Glyph size={px} color={toneColor} strokeWidth={strokeWidth} />;
}
