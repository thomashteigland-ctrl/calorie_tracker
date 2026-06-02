# Calorie counter app

React + TypeScript web app backed by Supabase (`calories.foods`).

## Deploy on Vercel

Repo: [github.com/thomashteigland-ctrl/calorie_tracker](https://github.com/thomashteigland-ctrl/calorie_tracker)

1. Import the repo in [Vercel](https://vercel.com).
2. If it does not detect **Vite**, set manually: **Framework Preset** = Vite, **Build Command** = `npm run build`, **Output Directory** = `dist`, **Install Command** = `npm install`, **Root Directory** = `.` (leave blank).
3. Add environment variables for **Production and Preview** (names must match exactly):
   - `VITE_SUPABASE_URL` = `https://dhkzbmrlgcxaxrwimzjs.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = legacy **anon public** key (`eyJ…`) from [API settings](https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/settings/api) — recommended over `sb_publishable_` if auth fails
   - `VITE_SUPABASE_SCHEMA` = `calories`
4. **Redeploy** after adding or changing env vars (Vite embeds them at build time; saving alone is not enough).
6. Deploy.
7. In Supabase **Authentication → URL configuration**, add your Vercel URL (e.g. `https://calorie-tracker-xxx.vercel.app`) to **Site URL** and **Redirect URLs** (`https://…/**`).

Camera/barcode scanning requires HTTPS — Vercel provides that for phone testing.

## Web app (local dev)

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Search for foods in Norwegian or English.

Requires `VITE_SUPABASE_*` in `.env` (see `.env.example`).

```bash
npm run build    # production bundle
npm run preview  # preview production build
```

## Supabase

Project: [dhkzbmrlgcxaxrwimzjs](https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs)

Schema **`calories`** is exposed via the Data API.

Run migrations in order (SQL editor):

1. `supabase/migrations/20250602170000_create_foods_table.sql`
2. `supabase/migrations/20250603120000_profiles_goals_logs.sql`
3. `supabase/migrations/20250604120000_foods_barcode_scan.sql`
4. `supabase/migrations/20250605120000_google_oauth_profile.sql`
5. `supabase/migrations/20250606120000_progress_tracking.sql` (weight + steps tables)

### Scanning packaged foods

In **Add food → Scan**: use the camera on the barcode, upload a photo of the package, or type the digits. The app looks up [Open Food Facts](https://world.openfoodfacts.org/) and saves the product to `foods` for everyone.

If the product is missing, use **Add manually** and copy values from the nutrition label (per 100 g).

**Note:** Reading full nutrition text from a photo (OCR) is not implemented yet — barcode → Open Food Facts, or manual entry from the label.

**Auth — email, password, and Google:**

1. [Authentication → Providers → Email](https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/auth/providers) — enable Email.
2. **For local dev:** turn **off** “Confirm email” so password sign-in works without an inbox link.
3. [URL configuration](https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/auth/url-configuration): add `http://localhost:5173/**` and your Vercel URL (`https://calorie-tracker-seven-beta.vercel.app/**`).

**Google sign-in (one-time setup):**

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **Create OAuth client ID** (type: Web application).
2. **Authorized JavaScript origins:** `http://localhost:5173`, `https://calorie-tracker-seven-beta.vercel.app` (and your Supabase URL `https://dhkzbmrlgcxaxrwimzjs.supabase.co`).
3. **Authorized redirect URIs:** copy the callback URL from [Supabase → Authentication → Providers → Google](https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/auth/providers) (looks like `https://dhkzbmrlgcxaxrwimzjs.supabase.co/auth/v1/callback`).
4. Paste **Client ID** and **Client secret** into Supabase Google provider and enable Google.
5. Redeploy Vercel after app changes; run migration `20250605120000_google_oauth_profile.sql` in SQL editor.

First-time Google users get a profile row automatically, then the goals setup screen.

**Same email (password + Google) — no manual “merge” in the app:**

Supabase [automatically links identities](https://supabase.com/docs/guides/auth/auth-identity-linking) when the **verified email matches**. One `auth.users` row → one `user_id` → your existing `profiles`, `user_goals`, and `food_logs` stay attached. You do **not** need to merge database rows in normal cases.

| Situation | What happens |
|-----------|----------------|
| Email account exists, user signs in with Google (same verified email) | Google identity is linked to the **existing** user |
| User signed up with email, wants Google later | Sign in with password → **Connect Google** on the home screen (requires [Manual linking](https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/auth/providers) enabled in Supabase) |
| Two accounts already created (different UUIDs) | Rare if linking worked; fix in Supabase dashboard or support — would require moving rows between `user_id`s manually |

Enable **Manual linking** under Authentication settings if **Connect Google** should work while logged in.

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | One row per user (`id` = `auth.users.id`) |
| `user_goals` | Daily calorie / macro targets |
| `food_logs` | What you ate: `food_id`, `logged_date`, `portions` (1 = 100 g) |
| `foods` | Food catalog (Matvaretabellen) |

## Ingest Matvaretabellen

```bash
npm run ingest:matvaretabellen
```

## iPhone later — does React web work?

**Yes for now.** This stack is a good way to validate search, macros, and Supabase on the desktop.

When you are ready for a native iPhone app, you have three realistic paths:

| Approach | Best when | Trade-off |
|----------|-----------|-----------|
| **Expo (React Native + TypeScript)** | You want one codebase for iOS + web | Rebuild UI with RN components; reuse `types/`, `api/`, Supabase client |
| **Keep this web app + Capacitor** | You want App Store quickly with minimal rewrite | WebView wrapper; feels less native |
| **Swift/SwiftUI only for iOS** | Best native UX on Apple only | Two codebases; duplicate API layer |

**Recommendation:** Stay on **Vite + React** until daily logging and goals feel right. Then add an **Expo** app and move shared logic into something like `shared/` (`types`, `api/foods`, Supabase config). Expo runs in the browser too (`npx expo start --web`), so you can keep testing without throwing away your backend work.

What to keep platform-agnostic from day one (already split in this repo):

- `src/types/` — data models
- `src/api/` — Supabase queries
- `src/lib/supabase.ts` — client setup

What will be rewritten for mobile: `src/components/` and styling (use React Native primitives instead of HTML/CSS).

## Project layout

```
src/           React web UI
scripts/       One-off data ingestion
supabase/      SQL migrations
```
