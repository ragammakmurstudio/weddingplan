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
| `src/app/api/webhook/lynk/route.ts` | Webhook lynk.id → insert `Purchase` |
| `scripts/purchases.mjs` | `--add` / `--list` / `--list-users` / `--make-admin` |
| `src/app/admin/page.tsx` | Admin panel (wajib role=admin) |
| `src/components/admin/AdminPanel.tsx` | Chart Recharts + kelola user & pembelian |
| `src/actions/password.ts` | Alur lupa/reset password via email link |

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

## Menjual Akses (lynk.id — sekali bayar, selamanya)

Alur: pembeli bayar di lynk.id → webhook mencatat pembelian di tabel `Purchase` → pembeli **daftar pakai email yang sama** → akun aktif selamanya. Akun lama tetap jalan tanpa gate.

### Setup sekali
1. Isi `NEXT_PUBLIC_LYNK_URL` (link checkout produk) di `.env` + Vercel.
2. lynk.id → Dashboard → **Webhook** → URL: `https://<domain>/api/webhook/lynk` → Simpan → salin **merchant key** (muncul setelah URL disimpan).
3. Set env `LYNK_MERCHANT_KEY` di `.env` + Vercel → redeploy.
4. Supabase SQL Editor → paste `supabase_migration.sql` lagi → Run (tabel `Purchase` ditambahkan di bawah file).

### Operasional
- Pembeli daftar dengan **email yang sama** seperti saat checkout lynk.id.
- Entitlement manual (test/teman): `node scripts/purchases.mjs --add email@x.com "catatan"`
- Cek daftar pembelian: `node scripts/purchases.mjs --list`
- Test pipeline: beli produk harga minimal 1× → cek log Vercel cari `[lynk-webhook]` → `--list`.

### Troubleshooting
- Signature invalid → cocokkan `amount`/`refId`/`message_id` dari log dengan `LYNK_MERCHANT_KEY`.
- Log payload tidak memuat `email` → sementara pakai `--add` manual untuk pembeli terdampak; kembangkan klaim via `refId` struk email lynk.id.

## Admin Panel & Reset Password

### Setup sekali
1. Supabase SQL Editor → paste `supabase_migration.sql` lagi → Run (kolom `role` + tabel `PasswordResetToken` ditambah di bawah file).
2. Set role admin (ganti dengan email kamu):
   ```bash
   node scripts/purchases.mjs --make-admin ragammakmurstudio@gmail.com
   ```
3. Buat **Gmail App Password**: Google Account → Security → 2-Step Verification (aktifkan) → App passwords → buat nama `nikahplan` → salin 16 karakter.
4. Set env di `.env` **dan** Vercel → redeploy:
   - `APP_URL` = `https://weddingplan-livid.vercel.app`
   - `SMTP_HOST` = `smtp.gmail.com`, `SMTP_PORT` = `587`
   - `SMTP_USER` = `ragammakmurstudio@gmail.com`
   - `SMTP_PASS` = App Password dari langkah 3
   - `SMTP_FROM` = `NikahPlan <ragammakmurstudio@gmail.com>`

### Pakai
- Buka `/admin` (login pakai akun admin; non-admin otomatis dilempar ke `/dashboard`).
- Chart: pie status pembelian, bar user baru/minggu, line kumulatif30 hari.
- Kelola user: **Kirim link reset** (email ke user), **Reset PW** (admin ketik password baru), **Hapus** (permanen, data wedding ikut terhapus).
- Kelola akses: **+ Tambah Akses** (grant manual), **Revoke** (cabut entitlement yang belum terpakai).
- User lupa password: halaman `/lupa-password` (link ada di `/login`) → email link → `/reset-password?token=...` → password baru (berlaku30 menit, sekali pakai).

### Operasional
- Cek semua user: `node scripts/purchases.mjs --list-users`

## Fitur Sudah Ada

- Register (wajib punya pembelian di lynk.id) / login / logout (Auth.js + bcrypt)
- Proteksi `/dashboard` tanpa session → redirect `/login`
- 9 tab: Dashboard, Mempelai, Budget, Seserahan, Vendor, Administrasi KUA, Undangan, Timeline, Rundown
- Reset data demo (dengan popup konfirmasi)
- Toast notifikasi, auto-save indicator (Tersimpan / Menyimpan...)
- **Backfill data default** (sesuai HTML base) untuk mahar, vendor, KUA, timeline, rundown — kalau list kosong, diisi otomatis saat dashboard dibuka
- **Placeholder input** di modal & rundown/panitia (contoh data dari HTML base)
- **Nav hamburger (drawer)** di mobile/tablet: icon ☰ di header → slide menu dari kiri; desktop tetap sidebar sticky (`lg:`)

## Belum / Ide Phase 2

- Verifikasi email, Google OAuth
- Disable flag akun (non-aktifkan tanpa hapus)
- Workspace / role (multi-anggota)
- Klaim otomatis via `refId` kalau payload webhook lynk.id tidak memuat email
- Log viewer webhook lynk.id di admin panel
