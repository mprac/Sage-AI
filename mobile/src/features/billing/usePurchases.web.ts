/**
 * Web stub for RevenueCat. `react-native-purchases` has no web build, so Metro picks this
 * `.web.ts` file on web and the native one elsewhere — keeping the web bundle resolvable.
 * Purchases only run in a native build anyway; on web/Expo Go the wallet shows no packs.
 */
export function configurePurchases(_userId: string) {
  /* no-op on web */
}

export function usePurchases() {
  return { packages: [] as never[], buy: async (_pkg: never) => {}, busy: false };
}
