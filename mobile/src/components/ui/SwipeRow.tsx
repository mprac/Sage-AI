/**
 * Swipe-to-reveal row actions — the iOS-Mail interaction, tuned to Sage's design system.
 *
 * No buttons show until the user swipes a row left; the actions then track the finger and the
 * icons pop in with a staggered scale. Tapping an action springs the row closed first, then fires.
 * Colors/sizing come from theme tokens; a light haptic confirms the row has opened.
 */
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { useTheme } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type ActionTone = 'danger' | 'primary' | 'neutral';

export interface SwipeAction {
  icon: IconName;
  label: string;
  tone?: ActionTone;
  onPress: () => void;
}

export interface SwipeRowProps {
  actions: SwipeAction[];
  children: React.ReactNode;
  /** Spacing around the row; mirrors what the list would otherwise apply to each card. */
  style?: ViewStyle;
}

const ACTION_WIDTH = 78;

function ActionButton({
  action,
  index,
  count,
  progress,
  swipeable,
}: {
  action: SwipeAction;
  index: number;
  count: number;
  progress: SharedValue<number>;
  swipeable: SwipeableMethods;
}) {
  const theme = useTheme();
  const tone: ActionTone = action.tone ?? 'neutral';
  const bg =
    tone === 'danger' ? theme.colors.danger : tone === 'primary' ? theme.colors.primary : theme.colors.surface;
  const fg = tone === 'neutral' ? 'text' : 'onPrimary';

  // Stagger the reveal: the outermost action (next to the row) leads, the rest cascade in behind it.
  const delay = (count - 1 - index) * 0.12;
  const animated = useAnimatedStyle(() => {
    const p = interpolate(progress.value, [delay, delay + 0.85], [0, 1], 'clamp');
    return { opacity: p, transform: [{ scale: interpolate(p, [0, 1], [0.55, 1]) }] };
  });

  // The rightmost action carries the group's rounded outer edge; the row's right corners flatten to
  // meet the inner buttons (see SwipeRow), so together they read as one continuous rounded shape.
  const isLast = index === count - 1;
  return (
    <Pressable
      onPress={() => {
        swipeable.close();
        action.onPress();
      }}
      style={[
        styles.action,
        {
          backgroundColor: bg,
          borderTopRightRadius: isLast ? theme.radius.lg : 0,
          borderBottomRightRadius: isLast ? theme.radius.lg : 0,
        },
      ]}
    >
      <Reanimated.View style={[styles.actionInner, animated]}>
        <Icon name={action.icon} tone={fg} size="md" />
        <Text variant="caption" tone={fg} style={styles.actionLabel} numberOfLines={1}>
          {action.label}
        </Text>
      </Reanimated.View>
    </Pressable>
  );
}

/** Separate component so `useAnimatedStyle` is a legitimate top-level hook (renderRightActions is
 *  invoked as a plain function by Swipeable, not as a component). */
function RightActions({
  actions,
  progress,
  drag,
  swipeable,
}: {
  actions: SwipeAction[];
  progress: SharedValue<number>;
  drag: SharedValue<number>;
  swipeable: SwipeableMethods;
}) {
  const total = actions.length * ACTION_WIDTH;
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + total }],
  }));
  return (
    <Reanimated.View style={[{ width: total }, styles.actions, containerStyle]}>
      {actions.map((a, i) => (
        <ActionButton
          key={a.label}
          action={a}
          index={i}
          count={actions.length}
          progress={progress}
          swipeable={swipeable}
        />
      ))}
    </Reanimated.View>
  );
}

export function SwipeRow({ actions, children, style }: SwipeRowProps) {
  const theme = useTheme();
  const lg = theme.radius.lg;
  // 0 = closed (row fully rounded), 1 = open (right corners squared off to sit flush against the
  // actions). Driven on the open/close snap so the radius eases in sync with the row sliding.
  const openness = useSharedValue(0);
  const rowStyle = useAnimatedStyle(() => {
    const r = interpolate(openness.value, [0, 1], [lg, 0]);
    return { borderTopRightRadius: r, borderBottomRightRadius: r };
  });

  return (
    <View style={style}>
      <ReanimatedSwipeable
        friction={2}
        rightThreshold={ACTION_WIDTH * 0.5}
        overshootRight={false}
        renderRightActions={(progress, drag, swipeable) => (
          <RightActions actions={actions} progress={progress} drag={drag} swipeable={swipeable} />
        )}
        onSwipeableWillOpen={() => {
          haptic.light();
          openness.value = withTiming(1, { duration: 200 });
        }}
        onSwipeableWillClose={() => {
          openness.value = withTiming(0, { duration: 200 });
        }}
      >
        {/* Clip the row content so its right corners can flatten as the actions are revealed; the
            left corners stay rounded. (Swipeable already clips the actions when closed.) */}
        <Reanimated.View
          style={[
            styles.rowClip,
            { borderTopLeftRadius: theme.radius.lg, borderBottomLeftRadius: theme.radius.lg },
            rowStyle,
          ]}
        >
          {children}
        </Reanimated.View>
      </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  rowClip: { overflow: 'hidden' },
  actions: { flexDirection: 'row' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center' },
  actionInner: { alignItems: 'center', gap: 4 },
  actionLabel: { marginTop: 2 },
});
