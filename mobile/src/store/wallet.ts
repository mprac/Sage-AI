/** Live credit balance (Zustand), updated by recognize/chat responses and the wallet screen. */
import { create } from 'zustand';

interface WalletState {
  balance: number | null;
  setBalance: (n: number) => void;
}

export const useWallet = create<WalletState>((set) => ({
  balance: null,
  setBalance: (balance) => set({ balance }),
}));
