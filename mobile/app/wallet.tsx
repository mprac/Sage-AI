/** Wallet — balance, recent ledger, and credit packs (RevenueCat). */
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '../src/components/ui';
import { usePurchases } from '../src/features/billing/usePurchases';
import { api } from '../src/lib/api';
import { useTheme } from '../src/theme';
import { useWallet } from '../src/store/wallet';
import type { WalletSummary } from '../src/types/api';

export default function Wallet() {
  const theme = useTheme();
  const setBalance = useWallet((s) => s.setBalance);
  const { packages, buy, busy } = usePurchases();

  const { data, refetch } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const w = await api.get<WalletSummary>('/wallet');
      setBalance(w.balance);
      return w;
    },
  });

  return (
    <Screen scroll>
      <Card style={{ alignItems: 'center', gap: theme.spacing.xs }}>
        <Text variant="caption" tone="muted">Balance</Text>
        <Text variant="display" tone="primary">✦ {data?.balance ?? '—'}</Text>
        <Text variant="caption" tone="muted">credits</Text>
      </Card>

      <Text variant="title" style={{ marginTop: theme.spacing.md }}>Get more credits</Text>
      {packages.length === 0 ? (
        <Text tone="muted" variant="caption">
          Credit packs appear here once RevenueCat is configured in a dev/production build
          (in-app purchases don't run in Expo Go).
        </Text>
      ) : (
        packages.map((pkg) => (
          <Card key={pkg.identifier}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text variant="title">{pkg.product.title}</Text>
                <Text variant="caption" tone="muted">{pkg.product.priceString}</Text>
              </View>
              <Button
                title="Buy"
                fullWidth={false}
                loading={busy}
                onPress={async () => {
                  await buy(pkg);
                  setTimeout(refetch, 1500); // webhook grants credits server-side
                }}
              />
            </View>
          </Card>
        ))
      )}

      <Text variant="title" style={{ marginTop: theme.spacing.md }}>Activity</Text>
      {data?.ledger.map((e) => (
        <View
          key={e.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text variant="body">{e.reason}</Text>
          <Text variant="body" tone={e.delta >= 0 ? 'success' : 'muted'}>
            {e.delta >= 0 ? '+' : ''}
            {e.delta}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
