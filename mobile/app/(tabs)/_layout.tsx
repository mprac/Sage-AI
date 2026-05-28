/** Authenticated tab navigator. Gates on session, bootstraps wallet + purchases. */
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreditPill, Icon, type IconName, PressableScale } from '../../src/components/ui';
import { configurePurchases } from '../../src/features/billing/usePurchases';
import { useSage } from '../../src/features/sage/useSage';
import { api } from '../../src/lib/api';
import { haptic } from '../../src/lib/haptics';
import { TAB_BAR_HEIGHT } from '../../src/lib/layout';
import { useTheme } from '../../src/theme';
import { useAuth } from '../../src/store/auth';
import { useWallet } from '../../src/store/wallet';
import type { TasteProfile, WalletSummary } from '../../src/types/api';

/** Tab icon with a soft tinted "pill" that springs in behind the active tab. */
function TabBarIcon({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  const theme = useTheme();
  const p = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(p, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 12 }).start();
  }, [focused, p]);
  return (
    <View style={{ width: 52, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 52,
          height: 32,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primarySoft,
          opacity: p,
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }}
      />
      <Icon name={name} color={color} size="md" strokeWidth={focused ? 2.5 : 2} />
    </View>
  );
}

const tabIcon =
  (name: IconName) =>
  ({ color, focused }: { color: string; focused: boolean }) => (
    <TabBarIcon name={name} color={color} focused={focused} />
  );

/** Tab button with the native press-bounce + light haptic. The wrapping Animated.View stretches
 *  the full width of the tab slot and centers its children, so icon + label sit perfectly on the
 *  vertical axis regardless of label length ("Recipes"/"Profile" are wider than "Cook"/"Sage"). */
function TabBarButton({
  children,
  style,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
}: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 10 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={(e) => {
        haptic.light();
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      onPressIn={() => animate(0.85)}
      onPressOut={() => animate(1)}
      style={[style, styles.tabButton]}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          width: '100%',
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** Frosted-glass tab bar background — translucent blur + a token-tinted wash for legibility and a
 *  hairline top edge. Content scrolls under it (the bar is absolutely positioned). */
function TabBarFrost() {
  const theme = useTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        tint={theme.mode === 'dark' ? 'dark' : 'light'}
        intensity={theme.mode === 'dark' ? 40 : 60}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `${theme.colors.card}99` }]} />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.divider,
        }}
      />
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuth((s) => s.session);
  const balance = useWallet((s) => s.balance);
  const setBalance = useWallet((s) => s.setBalance);
  const chefName = useSage().data?.name ?? 'Sage';

  useEffect(() => {
    if (!session) return;
    configurePurchases(session.user.id);
    // Grant signup bonus (idempotent) then load the wallet balance.
    api
      .post<TasteProfile>('/profile/bootstrap', {})
      .then(() => api.get<WalletSummary>('/wallet'))
      .then((w) => setBalance(w.balance))
      .catch(() => {});
  }, [session, setBalance]);

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.subtle,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: 11,
          letterSpacing: 0.2,
          textAlign: 'center',
        },
        // Make each tab slot center its icon+label stack on the same vertical axis, so wider
        // labels (Recipes, Profile) read as centered relative to the icon above them.
        tabBarItemStyle: { alignItems: 'center', justifyContent: 'center' },
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarBackground: () => <TabBarFrost />,
        // Floating frosted bar — absolute so content scrolls under the glass (screens add
        // `tabBarSpacing` so nothing hides behind it).
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          // Lift the items off the screen edge: respect the home-indicator inset, plus a little
          // breathing room (min 14 on devices without an inset).
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 14),
        },
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTintColor: theme.colors.title,
        headerTitleStyle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.title },
        headerRight: () => (
          <PressableScale onPress={() => router.push('/wallet')} style={{ marginRight: theme.spacing.md }}>
            <CreditPill balance={balance} />
          </PressableScale>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: chefName, tabBarIcon: tabIcon('chef-hat') }} />
      <Tabs.Screen name="cook" options={{ title: 'Cook', tabBarIcon: tabIcon('camera') }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats', tabBarIcon: tabIcon('message-circle') }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes', tabBarIcon: tabIcon('book-open') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
