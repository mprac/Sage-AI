/**
 * Sage home layout-variant registry. The container renders `SAGE_VARIANTS[i].Component` and a
 * dev switcher cycles `i`. **To try a new design:** create a `SageVariantProps` component in this
 * folder and add it to the array below — that's the only wiring needed.
 */
import { SageHomeAurora } from './SageHomeAurora';
import { SageHomeClassic } from './SageHomeClassic';
import { SageHomeHabitat } from './SageHomeHabitat';
import type { SageVariant } from './shared';

export const SAGE_VARIANTS: SageVariant[] = [
  { key: 'classic', label: 'Classic', Component: SageHomeClassic },
  { key: 'aurora', label: 'Aurora', Component: SageHomeAurora },
  { key: 'habitat', label: 'Habitat', Component: SageHomeHabitat },
];

export type { SageVariantProps, SageVariant } from './shared';
