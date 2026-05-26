PART A — Create your Supabase project (gives you auth + database)
Go to supabase.com → Start your project → sign in (GitHub or email).
New project:
Name: plate
Database Password: set one and save it (you'll need it for the backend later)
Region: pick the one closest to you
Click Create new project and wait ~2 minutes for it to provision.
Get your keys: click the gear icon (Project Settings) → API. Copy these two (for the mobile app):
Project URL (looks like https://abcdefgh.supabase.co)
anon public key (a long eyJ... string)
Create the database tables: left sidebar → SQL Editor → + New query → open api/supabase/schema.sql on your PC, copy its entire contents, paste into the editor, click Run. You should see "Success."
Let yourself log in instantly without email confirmation (easier for testing): left sidebar → Authentication → Sign In / Providers → Email → turn OFF "Confirm email" → Save. (Otherwise you'd have to click a link in your inbox before logging in.)
PART B — Put the keys in mobile\.env
Open mobile\.env and set (using your real values from step 3, and your PC's IPv4 for the API):


EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
Replace 192.168.1.20 with the IP that run.ps1 printed (run ipconfig and use the IPv4 if unsure).
Leave the RevenueCat lines blank.
PART C — Restart Expo (env is read at startup, not on reload)

cd mobile
npx expo start -c
Then reload the app on your phone. Now sign-up/login will work — that's purely mobile ↔ Supabase, the backend isn't even involved for auth.

PART D — Backend keys (only needed for photo recognition + chat)
You can do this after login works. Open api\.env and fill:

Key	Where to get it
SUPABASE_URL	same Project URL as above
SUPABASE_SERVICE_KEY	Project Settings → API → service_role key (secret)
SUPABASE_JWT_SECRET	Project Settings → API → JWT Settings → JWT Secret
DATABASE_URL	Project Settings → Database → Connection string → URI, then change postgresql:// to postgresql+asyncpg:// and put in your DB password
ANTHROPIC_API_KEY	console.anthropic.com → API Keys → Create Key
VOYAGE_API_KEY	dashboard.voyageai.com → API Keys (optional; chat works without it)
REVENUECAT_WEBHOOK_SECRET	leave as change-me for now
Then restart the backend (.\run.ps1).

Do Parts A–C first and tell me if login works. That removeItem error should also be gone once the new bundle loads (I fixed the storage adapter). If anything still errors after you've set the real Supabase URL + anon key and restarted, paste it and I'll zero in.