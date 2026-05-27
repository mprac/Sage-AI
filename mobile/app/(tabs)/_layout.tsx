/** Authenticated tab navigator. Gates on session, bootstraps wallet + purchases. */
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreditPill, Icon, type IconName } from '../../src/components/ui';
import { configurePurchases } from '../../src/features/billing/usePurchases';
import { useSage } from '../../src/features/sage/useSage';
import { api } from '../../src/lib/api';
import { useTheme } from '../../src/theme';
import { useAuth } from '../../src/store/auth';
import { useWallet } from '../../src/store/wallet';
import type { TasteProfile, WalletSummary } from '../../src/types/api';

const tabIcon =
  (name: IconName) =>
  ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon name={name} color={color} size="md" strokeWidth={focused ? 2.4 : 2} />
  );

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
        tabBarLabelStyle: { fontFamily: theme.fonts.medium, fontSize: 11, letterSpacing: 0.2 },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
          // Lift the items off the screen edge: respect the home-indicator inset, plus a little
          // breathing room (min 14 on devices without an inset).
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 14),
        },
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTintColor: theme.colors.title,
        headerTitleStyle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.title },
        headerRight: () => (
          <Pressable onPress={() => router.push('/wallet')} style={{ marginRight: theme.spacing.md }}>
            <CreditPill balance={balance} />
          </Pressable>
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
