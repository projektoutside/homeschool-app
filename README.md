# La's Homeschool App

This is a Vite + React + TypeScript homeschool app with:

- Supabase authentication (username/email + password)
- Per-user cloud saved manager configuration
- Row Level Security (RLS) data isolation
- PWA/service-worker support with cache-update hardening

## 1) Environment setup

Copy `.env.example` to `.env` and set your Supabase values:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 2) Supabase database setup

Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor.

This creates `public.user_manager_configs` and RLS policies so each user can only access their own row.

## 3) Supabase auth settings

In Supabase dashboard:

- Enable Email/Password sign-in provider
- If you want instant sign-up/login in development, disable email confirmation
- If confirmation stays enabled, users must verify email before sign-in

> Note: Username sign-in is implemented by internally mapping usernames to a synthetic email format (`username@<your-supabase-project-host>`) unless a real email is entered.

## 4) Local development

```bash
npm install
npm run dev
```

## 5) Build

```bash
npm run build
```

## Caching/update behavior

- Service worker versioned cache (`public/service-worker.js`)
- Network-first strategy for HTML/navigation and live content folders
- Supabase API requests excluded from SW caching
- Service worker registration uses `import.meta.env.BASE_URL` for GitHub Pages compatibility

This keeps app updates fresher while user data remains safely in Supabase.
