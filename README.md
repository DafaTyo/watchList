# Nixtio Watch

Website watchlist untuk mencatat film, serial, dan anime lengkap dengan progres episode, catatan pribadi, dan daftar link tempat menonton. Dibangun menggunakan Next.js (App Router) + TypeScript, Tailwind CSS v4, Prisma 6, MySQL 8, dan Better Auth.

| Dokumen | Isi |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Kebutuhan produk, fitur, kriteria penerimaan, data model, rencana rilis |
| [DESIGN.md](DESIGN.md) | Warna, tipografi, komponen, layout responsif |
| [prisma/schema.prisma](prisma/schema.prisma) | Skema database |
| [CLAUDE.md](CLAUDE.md) | Aturan kerja dan batasan teknis |

## Prasyarat
- Node.js LTS terbaru (direkomendasikan Node 20/22/24)
- MySQL 8.0.16+ lokal yang sedang berjalan (untuk fitur `CHECK` constraint)
- npm

## Setup Lokal (Tanpa Docker)

### 1. Pasang dependensi
```bash
npm install
```
*(Prisma sengaja dipin ke seri 6 (`6.19.3`) di `package.json` agar sesuai dengan skema dan alur CLI Prisma 6).*

### 2. Siapkan database MySQL lokal
Buat dua database `utf8mb4` di MySQL 8 lokal Anda (satu untuk aplikasi utama, satu khusus untuk pengujian otomatis):
```sql
CREATE DATABASE IF NOT EXISTS nixtio_watch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS nixtio_watch_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Konfigurasi environment
Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL` dan `BETTER_AUTH_SECRET`:
```bash
cp .env.example .env
```
Contoh isi `.env`:
```env
DATABASE_URL="mysql://root@localhost:3306/nixtio_watch"
BETTER_AUTH_SECRET="ganti-dengan-secret-acak-minimal-32-karakter"
BETTER_AUTH_URL="http://localhost:3000"
ALLOW_REGISTRATION="true"
TMDB_API_KEY=""
```

Untuk pengujian (`npm test`), buat juga file `.env.test` yang menunjuk ke database berakhiran `_test` (tes akan menolak jalan bila nama database tidak berakhiran `_test`):
```env
DATABASE_URL="mysql://root@localhost:3306/nixtio_watch_test"
BETTER_AUTH_SECRET="secret-untuk-pengujian-minimal-32-karakter"
BETTER_AUTH_URL="http://localhost:3000"
ALLOW_REGISTRATION="true"
```

### 4. Terapkan migrasi database
Migrasi awal di `prisma/migrations/20261104130151_init/migration.sql` sudah mencakup tabel Better Auth (`user`, `session`, `account`, `verification`, `rateLimit`), tabel domain (`titles`, `watch_links`), serta dua `CHECK` constraint (`chk_titles_rating` dan `chk_titles_episode_current`).

Terapkan ke database utama:
```bash
npx prisma migrate deploy
npx prisma generate
```
Untuk database pengujian (`nixtio_watch_test`), terapkan migrasi yang sama sebelum menjalankan `npm test`.

### 5. Jalankan aplikasi
```bash
npm run dev
```
Buka http://localhost:3000.

## Operasional
- **Kontrol Registrasi (`ALLOW_REGISTRATION`)**: Set `ALLOW_REGISTRATION="false"` di `.env` produksi setelah akun yang dibutuhkan selesai dibuat. Baik halaman `/register` maupun endpoint `/api/auth/sign-up/email` akan menolak pendaftaran baru.
- **Reset Password Manual (Tanpa Email di MVP)**: Gunakan skrip admin `scripts/reset-password.ts` yang mengubah password lewat API internal Better Auth (`auth.$context`) sekaligus mencabut seluruh sesi aktif pengguna tersebut:
  ```bash
  node --env-file=.env scripts/reset-password.ts user@example.com PasswordBaru123!
  ```
- **Hapus akun / ekspor data / pencarian TMDB**: Masuk ruang lingkup P1 (belum dikerjakan di MVP).

## Perintah Penting
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan (`next dev --webpack`) |
| `npm run build` | Membangun bundel produksi (`next build --webpack`) |
| `npm start` | Menjalankan server produksi hasil build |
| `npm run lint` | Memeriksa kode dengan ESLint |
| `npm test` | Menjalankan tes integrasi Vitest terhadap `nixtio_watch_test` |
| `npx prisma migrate dev` | Membuat/menerapkan migrasi di lingkungan pengembangan |
| `npx prisma migrate deploy` | Menerapkan migrasi di lingkungan produksi/tes |
| `npx prisma studio` | Membuka antarmuka tabel Prisma Studio |
