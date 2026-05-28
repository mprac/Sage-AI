# Image assets

Put static, bundled images here (logos, illustrations, app icon, splash, onboarding art).
Reference them with `require()` so Metro bundles them:

```tsx
import { Image } from 'react-native';

<Image source={require('../../assets/images/my-image.png')} style={{ width: 120, height: 120 }} />
```

Or with `expo-image` (already a transitive dep via expo) for caching/better perf.

## Guidelines
- **Formats:** `.png` (transparency / icons), `.jpg` (photos), `.webp` (smaller). SVGs aren't used as
  files here — UI glyphs go through `<Icon>` (lucide). For custom vector art, prefer a PNG @1x/@2x/@3x.
- **Resolutions:** ship `name.png`, `name@2x.png`, `name@3x.png` and `require('.../name.png')` —
  React Native auto-picks the right density.
- **App icon / splash:** when you add them, wire the paths in `app.json` (e.g. `expo.icon`,
  `expo.splash.image`). The splash currently only sets a background color.
- **Not for:** user-uploaded / runtime photos (ingredient snaps) — those go to Supabase Storage and are
  loaded by URL, not bundled here.

## ⚠️ After adding new image files
Metro's cached module map won't see them until you restart with cache cleared:
`npx expo start --tunnel -c` (see CLAUDE.md rule 9).
