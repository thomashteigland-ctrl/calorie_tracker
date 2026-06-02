# Calorie counter app

React + TypeScript web app backed by Supabase (`calories.foods`).

## Deploy on Vercel

Repo: [github.com/thomashteigland-ctrl/calorie_tracker](https://github.com/thomashteigland-ctrl/calorie_tracker)

1. Import the repo in [Vercel](https://vercel.com).
2. If it does not detect **Vite**, set manually: **Framework Preset** = Vite, **Build Command** = `npm run build`, **Output Directory** = `dist`, **Install Command** = `npm install`, **Root Directory** = `.` (leave blank).
3. Add environment variables (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SCHEMA` = `calories`
4. Deploy.
5. In Supabase **Authentication → URL configuration**, add your Vercel URL (e.g. `https://calorie-tracker-xxx.vercel.app`) to **Site URL** and **Redirect URLs** (`https://…/**`).

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

### Scanning packaged foods

In **Add food → Scan**: use the camera on the barcode, upload a photo of the package, or type the digits. The app looks up [Open Food Facts](https://world.openfoodfacts.org/) and saves the product to `foods` for everyone.

If the product is missing, use **Add manually** and copy values from the nutrition label (per 100 g).

**Note:** Reading full nutrition text from a photo (OCR) is not implemented yet — barcode → Open Food Facts, or manual entry from the label.

**Auth (email + password, not magic links):**

1. [Authentication → Providers → Email](https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/auth/providers) — enable Email.
2. **For local dev:** turn **off** “Confirm email” so you can sign in immediately with password (no inbox link).
3. [URL configuration](https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/auth/url-configuration): Site URL `http://localhost:5173`, Redirect URLs include `http://localhost:5173/**`.
4. If confirmation emails never arrive: Supabase’s default mailer is unreliable — disable confirm email, or add custom SMTP under **Project Settings → Authentication**.

After sign-up with confirm email **off**, use **Sign in** with the same password.

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
