/** Wallet — balance, recent ledger, and credit packs (RevenueCat). */
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';

import { Button, Card, Gradient, Icon, Screen, Text } from '../src/components/ui';
import { usePurchases } from '../src/features/billing/usePurchases';
import { api } from '../src/lib/api';
import { useTheme } from '../src/theme';
import { useWallet } from '../src/store/wallet';
import type { WalletSummary } from '../src/types/api';

export default function Wallet() {
  const theme = useTheme();
  const setBalance = useWallet((s) => s.setBalance);
  const { packages, buy, busy } = usePurchases();

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const w = await api.get<WalletSummary>('/wallet');
      setBalance(w.balance);
      return w;
    },
  });

  return (
    <Screen scroll onRefresh={refetch} refreshing={isRefetching}>
      <Gradient
        name="brand"
        style={{
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
          alignItems: 'center',
          gap: theme.spacing.xs,
          ...theme.shadow.card,
        }}
      >
        <Text variant="overline" tone="onPrimary" style={{ opacity: 0.85 }}>BALANCE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="coins" tone="onPrimary" size="lg" />
          <Text variant="hero" tone="onPrimary">{data?.balance ?? '—'}</Text>
        </View>
        <Text variant="caption" tone="onPrimary" style={{ opacity: 0.85 }}>credits</Text>
      </Gradient>

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
      {data?.ledger.map((e) => {
        const credit = e.delta >= 0;
        return (
          <View
            key={e.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.divider,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: credit ? theme.colors.primarySoft : theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={credit ? 'plus' : 'utensils'} tone={credit ? 'success' : 'muted'} size="sm" />
            </View>
            <Text variant="body" style={{ flex: 1, textTransform: 'capitalize' }}>
              {e.reason.replace(/_/g, ' ')}
            </Text>
            <Text variant="title" tone={credit ? 'success' : 'text'}>
              {credit ? '+' : ''}{e.delta}
            </Text>
          </View>
        );
      })}
    </Screen>
  );
}
