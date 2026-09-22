# NikahPlan — Cara Menjalankan & Catatan

## Cara Menjalankan

```bash
cd nikahplan
npm run dev
# buka http://localhost:3000 → Daftar / Masuk
```

### Script lain

```bash
npm run build      # prisma generate + next build (produksi)
npm run start      # jalankan build produksi
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run db:push    # sinkronkan schema Prisma ke database
```

## Setup Awal

1. Copy `.env.example` → `.env` (sudah ada `.env` untuk dev).
2. Isi `AUTH_SECRET` dengan string acak di produksi.
3. `npm install` lalu `npm run db:push`.

## Struktur Penting

| Path | Fungsi |
|---|---|
| `src/auth.ts` | Konfigurasi Auth.js (credentials + JWT) |
| `src/proxy.ts` | Proteksi route (`/dashboard` wajib login) |
| `src/actions/auth.ts` | Register, login, logout, save/reset wedding |
| `prisma/schema.prisma` | Skema DB: User, Wedding, Budget, Guest, dll. |
| `src/components/dashboard/DashboardClient.tsx` | Seluruh UI dashboard (9 tab) |
| `src/lib/seed-data.ts` | Data demo saat register |

## Catatan

- **Stack**: Next.js 16 + React + Tailwind + Auth.js (next-auth beta) + Prisma 6 + SQLite.
- **Multi-tenant**: 1 akun = 1 data wedding. Data di-bawah `userId`, query selalu di-guard session.
- **Auto-save**: edit di UI → debounce ~700ms → `saveWeddingAction` (Server Actions + Zod validation).
- **File HTML lama** (`sistem_manajemen_wedding_planner.html`) tetap di root sebagai referensi visual.
- **Prisma**: sengaja pakai v6 (stable) — v8 RC CLI-nya beda, dokumentasi sedikit.
- **UI**: di-port dari Vue single-file → React; class Tailwind dipertahankan agar visual identik.

## Produksi (Server Sendiri)

1. Ganti `DATABASE_URL` ke PostgreSQL:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/nikahplan"
   ```
2. Jalankan `npx prisma migrate deploy` (atau `db:push` untuk dev).
3. Set `AUTH_SECRET` acak panjang.
4. Build & jalankan:
   ```bash
   npm run build
   npm run start
   ```
5. Opsional: PM2 / Docker / reverse proxy (Nginx).

## Akun Tes (boleh dihapus)

- `test@nikahplan.dev` / `password123`
- `userb@nikahplan.dev` / `password123`

## Fitur Sudah Ada

- Register / login / logout (Auth.js + bcrypt)
- Proteksi `/dashboard` tanpa session → redirect `/login`
- 9 tab: Dashboard, Mempelai, Budget, Seserahan, Vendor, Administrasi KUA, Undangan, Timeline, Rundown
- Export / import JSON, reset data demo
- Toast notifikasi, auto-save indicator (Tersimpan / Menyimpan...)
- **Backfill data default** (sesuai HTML base) untuk mahar, vendor, KUA, timeline, rundown — kalau list kosong, diisi otomatis saat dashboard dibuka
- **Placeholder input** di modal & rundown/panitia (contoh data dari HTML base)
- **Nav hamburger (drawer)** di mobile/tablet: icon ☰ di header → slide menu dari kiri; desktop tetap sidebar sticky (`lg:`)

## Belum / Ide Phase 2

- Verifikasi email, lupa password
- Google OAuth
- Workspace / role (multi-anggota)
- Billing / langganan SaaS
