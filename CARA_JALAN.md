# NikahPlan — Cara Menjalankan & Catatan

## Cara Menjalankan

```bash
cd nikahplan
npm run dev
# buka http://localhost:3000 → Daftar / Masuk
```

### Script lain

```bash
npm run build      # next build (produksi)
npm run start      # jalankan build produksi
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Setup Awal

1. Supabase → **SQL Editor** → paste `supabase_migration.sql` → **Run** (sekali saja, bikin semua tabel).
2. Copy `.env.example` → `.env`, isi `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Settings → API) + `AUTH_SECRET`.
3. `npm install` lalu `npm run dev`.

## Struktur Penting

| Path | Fungsi |
|---|---|
| `src/auth.ts` | Konfigurasi Auth.js (credentials + JWT) |
| `src/proxy.ts` | Proteksi route (`/dashboard` wajib login) |
| `src/actions/auth.ts` | Register, login, logout, save/reset wedding |
| `supabase_migration.sql` | Skema DB — paste ke Supabase SQL Editor, Run |
| `src/components/dashboard/DashboardClient.tsx` | Seluruh UI dashboard (9 tab) |
| `src/lib/seed-data.ts` | Data demo saat register |

## Catatan

- **Stack**: Next.js 16 + React + Tailwind + Auth.js (next-auth beta) + Supabase (PostgreSQL, via `@supabase/supabase-js`).
- **Multi-tenant**: 1 akun = 1 data wedding. Data di-bawah `userId`, query selalu di-guard session.
- **Auto-save**: edit di UI → debounce ~700ms → `saveWeddingAction` (Server Actions + Zod validation).
- **File HTML lama** (`sistem_manajemen_wedding_planner.html`) tetap di root sebagai referensi visual.
- **Supabase**: akses DB server-side pakai `service_role` key (`src/lib/supabase.ts`); RLS aktif tanpa policy — key anon publik tidak bisa akses tabel.
- **UI**: di-port dari Vue single-file → React; class Tailwind dipertahankan agar visual identik.

## Produksi (Vercel + Supabase)

1. Supabase: bikin project → **SQL Editor** → paste `supabase_migration.sql` → **Run**.
2. Supabase → Settings → API → salin **Project URL** + **service_role** key.
3. Vercel: import repo GitHub → set env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` → Deploy.
4. Domain (opsional): Vercel → Settings → Domains → ikuti instruksi DNS record.

## Fitur Sudah Ada

- Register / login / logout (Auth.js + bcrypt)
- Proteksi `/dashboard` tanpa session → redirect `/login`
- 9 tab: Dashboard, Mempelai, Budget, Seserahan, Vendor, Administrasi KUA, Undangan, Timeline, Rundown
- Reset data demo (dengan popup konfirmasi)
- Toast notifikasi, auto-save indicator (Tersimpan / Menyimpan...)
- **Backfill data default** (sesuai HTML base) untuk mahar, vendor, KUA, timeline, rundown — kalau list kosong, diisi otomatis saat dashboard dibuka
- **Placeholder input** di modal & rundown/panitia (contoh data dari HTML base)
- **Nav hamburger (drawer)** di mobile/tablet: icon ☰ di header → slide menu dari kiri; desktop tetap sidebar sticky (`lg:`)

## Belum / Ide Phase 2

- Verifikasi email, lupa password
- Google OAuth
- Workspace / role (multi-anggota)
- Billing / langganan SaaS
