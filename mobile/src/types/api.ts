/**
 * API contract types.
 *
 * ⚠️ Normally GENERATED from the backend OpenAPI schema:
 *     npm run gen:api   (openapi-typescript http://127.0.0.1:8000/openapi.json -o src/types/api.ts)
 *
 * This hand-written stub mirrors api/app/schemas/* so the app type-checks before the
 * backend is running. Regenerate to keep it in sync with the source of truth.
 */

export interface DetectedFood {
  name: string;
  category: string;
  confidence: number;
  estimated_quantity?: string | null;
}

export interface RecognitionResult {
  id: string;
  foods: DetectedFood[];
  image_path?: string | null;
  credits_spent: number;
  balance: number;
}

export interface LedgerEntry {
  id: number;
  delta: number;
  reason: string;
  model?: string | null;
  created_at: string;
}

export interface WalletSummary {
  balance: number;
  ledger: LedgerEntry[];
}

export interface TasteProfile {
  likes: string[];
  dislikes: string[];
  allergies: string[];
  dietary_restrictions: string[];
  favorite_cuisines: string[];
  spice_tolerance?: string | null;
  cooking_skill?: string | null;
  household_size?: number | null;
  memory_summary: string;
}

export type SageState = 'thriving' | 'content' | 'peckish' | 'hungry' | 'weak' | 'fainted';

export interface SagePet {
  name: string;
  vitality: number;
  mood: string;
  mood_emoji: string;
  state: SageState;
  message: string;
  level: number;
  xp: number;
  xp_to_next: number;
  streak_days: number;
  longest_streak: number;
  bond_xp: number;
  bond_level: number;
  is_dormant: boolean;
  equipped: Record<string, string>;
  unlocked_cosmetics: string[];
  hours_until_hungry: number;
}

export interface Cosmetic {
  id: string;
  name: string;
  type: string;
  emoji: string;
  price_credits: number;
  unlock_level: number;
}

export interface FeedResult {
  pet: SagePet;
  leveled_up: boolean;
  revived: boolean;
  credits_balance?: number | null;
}
