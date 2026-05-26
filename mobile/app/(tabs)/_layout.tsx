/** Authenticated tab navigator. Gates on session, bootstraps wallet + purchases. */
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable } from 'react-native';

import { CreditPill } from '../../src/components/ui';
import { configurePurchases } from '../../src/features/billing/usePurchases';
import { api } from '../../src/lib/api';
import { useTheme } from '../../src/theme';
import { useAuth } from '../../src/store/auth';
import { useWallet } from '../../src/store/wallet';
import type { TasteProfile, WalletSummary } from '../../src/types/api';

export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const balance = useWallet((s) => s.balance);
  const setBalance = useWallet((s) => s.setBalance);

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
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerRight: () => (
          <Pressable onPress={() => router.push('/wallet')} style={{ marginRight: theme.spacing.md }}>
            <CreditPill balance={balance} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Sage' }} />
      <Tabs.Screen name="cook" options={{ title: 'Cook' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
