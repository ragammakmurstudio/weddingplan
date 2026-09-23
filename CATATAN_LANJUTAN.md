# Catatan Lanjutan — Admin Panel & Reset Password
Update terakhir: 23 Sep 2026 (sebelum pindah komputer)

## Status

### Selesai & sudah di-push (branch `feat/admin-panel`, commit 343fc3a)
- [x] Migrasi SQL Supabase TERJALAN (kolom `role` + tabel `PasswordResetToken` sudah ada —
      terverifikasi via `--list-users`, semua user role=`user`)
- [x] Fitur `/admin`: stat card, chart pie/bar/line (Recharts), tabel user
      (kirim link reset / reset PW / hapus), tabel pembelian (+ tambah akses / revoke)
- [x] Alur lupa/reset password: `/lupa-password` → email link → `/reset-password?token=...`
      (SHA-256, 30 menit, sekali pakai); link "Lupa password?" di halaman login
- [x] `scripts/purchases.mjs` → `--make-admin`, `--list-users`
- [x] `CARA_JALAN.md` sudah lengkap SOP admin & reset password
- [x] lint 0 error / typecheck ✓ / build ✓ (route `/admin`, `/lupa-password`, `/reset-password` jadi)

### Data saat ini di Supabase
- User (1): `juliobantek@gmail.com` | role=`user` | "Mafa Oji Subehti"
- Purchase (1): `juliobantek@gmail.com` | refId `3d19379183c393c8a6f53a8e5f708b98` | sudah dipakai
- Belum ada akun admin → semua akses `/admin` akan dilempar ke `/dashboard`

## TODO (lanjutan di komputer lain)

### 1. Buat akun jadi ADMIN — gagal sebelumnya karena email belum terdaftar
Email `ragammakmurstudio@gmail.com` BELUM punya akun, jadi `--make-admin` error.
Pilih salah satu:
- **[recommended]** Promosikan akun existing:
  ```bash
  node scripts/purchases.mjs --make-admin juliobantek@gmail.com
  ```
  lalu logout + login ulang (session JWT perlu refresh supaya role=admin kebaca).
- Atau daftarkan akun `ragammakmurstudio@gmail.com` dulu:
  ```bash
  node scripts/purchases.mjs --add ragammakmurstudio@gmail.com "owner"
  ```
  → daftar di `/login`→`/daftar` (`/register`) pakai email itu → `--make-admin` email itu.

### 2. Email SMTP (WAJIB kalau mau fitur "Lupa password" via email jalan)
Fungsi: kirim email berisi link reset password. Tanpa ini, user tidak bisa reset
sendiri (tapi ADMIN TETAP BISA reset password user via tombol "Reset PW" di panel —
fitur itu tidak butuh email).

Buat Gmail App Password:
1. Google Account → Security → aktifkan **2-Step Verification** dulu
2. Security → **App passwords** → name `nikahplan` → copy 16 karakter
3. Isi env (di `.env` lokal + Vercel Environment Variables → redeploy):
   ```
   APP_URL="https://weddingplan-livid.vercel.app"
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="ragammakmurstudio@gmail.com"
   SMTP_PASS="<16 karakter App Password>"
   SMTP_FROM="NikahPlan <ragammakmurstudio@gmail.com>"
   ```
   Catatan: `.env` tidak ikut ke-git (gitignore) → wajib isi ulang di komputer baru.

### 3. Merge ke produksi (setelah langkah 1)
```bash
git checkout main
git merge feat/admin-panel
git push origin main
```
Vercel auto-deploy → test di https://weddingplan-livid.vercel.app :
- login akun admin → buka `/admin`
- buka `/lupa-password` → cek email masuk → klik link → ganti password

## Info penting
- Repo: https://github.com/ragammakmurstudio/weddingplan (branch: `feat/admin-panel`)
- Produksi: https://weddingplan-livid.vercel.app (auto-deploy dari `main`)
- lynk.id checkout: https://lynk.id/ruangmenujutenang/6dzey49ookx8/checkout
- Webhook: POST /api/webhook/lynk (signature = sha256(amount+refId+message_id+merchantKey))
- Verifikasi lokal sebelum push: `npm run lint; if ($?) { npm run typecheck }; if ($?) { npm run build }`
