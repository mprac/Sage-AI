/**
 * RevenueCat (react-native-purchases) integration for buying credit packs.
 * Initialise once at app root; offerings + purchase are exposed via the hook.
 *
 * Note: RevenueCat requires a native build (EAS dev client) — purchases do not work in
 * Expo Go. The hook degrades gracefully (offerings = []) so the rest of the app still runs.
 */
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { useCallback, useEffect, useState } from 'react';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

let configured = false;

/** Call once after sign-in so purchases are attributed to the Supabase user id. */
export function configurePurchases(userId: string) {
  if (configured) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) return; // not set up yet (e.g. Expo Go) — skip silently
  try {
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
  } catch {
    // ignore — native module unavailable in Expo Go
  }
}

export function usePurchases() {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    Purchases.getOfferings()
      .then((offerings) => setPackages(offerings.current?.availablePackages ?? []))
      .catch(() => setPackages([]));
  }, []);

  const buy = useCallback(async (pkg: PurchasesPackage) => {
    setBusy(true);
    try {
      await Purchases.purchasePackage(pkg);
      // Credits are granted server-side via the RevenueCat webhook; the wallet refreshes
      // on the next /wallet fetch.
    } finally {
      setBusy(false);
    }
  }, []);

  return { packages, buy, busy };
}
