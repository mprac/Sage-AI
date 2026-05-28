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
  seasonal_note?: string | null;
}

export interface RecognitionResult {
  id: string;
  foods: DetectedFood[];
  image_path?: string | null;
  credits_spent: number;
  balance: number;
}

export interface RecognitionDetail {
  id: string;
  foods: DetectedFood[];
  image_path?: string | null;
  created_at: string;
}

export interface RecognitionUpdate {
  foods: DetectedFood[];
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
  hemisphere: Hemisphere;
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
  type: string; // hat | theme | accessory
  icon: string; // lucide icon name
  color?: string | null; // for theme cosmetics
  price_credits: number;
  unlock_level: number;
}

export interface HarvestDelta {
  season: Season;
  year: number;
  new_slugs: string[];          // produce slugs added by this cook
  total: number;                // current ingredients_cooked count for the season
  target: number;               // threshold for the "harvester" award
  new_awards: string[];         // award slugs newly earned by this cook
}

export interface FeedResult {
  pet: SagePet;
  leveled_up: boolean;
  revived: boolean;
  credits_balance?: number | null;
  harvest_delta?: HarvestDelta | null;
}

export type Hemisphere = 'N' | 'S';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonalProduce {
  slug: string;
  display_name: string;
  icon: string;
}

export interface HarvestProgress {
  cooked: string[];             // slugs already cooked this season
  cooks_count: number;
  target: number;
  total: number;
  awards_earned: string[];
  started_at?: string | null;
  completed_at?: string | null;
}

export interface SeasonOut {
  season: Season;
  year: number;
  hemisphere: Hemisphere;
  produce: SeasonalProduce[];
  harvest: HarvestProgress;
}

export interface AlmanacEntry {
  season: Season;
  year: number;
  hemisphere: Hemisphere;
  ingredients_cooked: string[];
  cooks_count: number;
  awards_earned: string[];
  started_at: string;
  completed_at?: string | null;
}

export interface RecipeIngredient {
  item: string;
  quantity?: string | null;
}

export interface RecipeStep {
  instruction: string;
  tip?: string | null;
}

export interface PlaylistTrack {
  title: string;
  artist: string;
}

export interface Playlist {
  vibe: string;
  search_query: string;
  tracks: PlaylistTrack[];
}

export interface Recipe {
  title: string;
  summary: string;
  servings?: number | null;
  total_time_minutes?: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  playlist?: Playlist | null;
  session_id?: string | null;
  seasonal_note?: string | null;
}

export interface GeneratedRecipe {
  recipe: Recipe;
  credits_spent: number;
  balance: number;
}

export interface RecipeSummary {
  id: string;
  title: string;
  total_time_minutes?: number | null;
  session_id?: string | null;
  created_at: string;
}
