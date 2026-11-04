# Nixtio Watch

Website watchlist (film, serial, anime) dengan catatan dan link tempat menonton. Next.js + Tailwind + Prisma + MySQL.

| Dokumen | Isi |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Kebutuhan produk, fitur, kriteria penerimaan, data model, rencana rilis |
| [DESIGN.md](DESIGN.md) | Warna, tipografi, komponen, layout responsif |
| [prisma/schema.prisma](prisma/schema.prisma) | Skema database |
| [CLAUDE.md](CLAUDE.md) | Aturan kerja untuk asisten coding |

## Prasyarat
- Node.js LTS terbaru
- Docker (untuk MySQL lokal)
- npm (atau pnpm)

## Setup dari nol

Folder ini berisi dokumen dan konfigurasi saja. Buat aplikasinya dulu, lalu salin file-file ini ke dalamnya.

### 1. Buat aplikasi
```bash
npx create-next-app@latest nixtio-watch --typescript --tailwind --eslint --app --src-dir
```
Lalu salin `docs/`, `DESIGN.md`, `CLAUDE.md`, `prisma/`, `docker-compose.yml`, `.env.example` ke dalam `nixtio-watch/` (gabungkan `.gitignore` jika perlu). Cek versi yang terpasang dan pin (PRD §8).

### 2. Pasang dependensi
```bash
npm install @prisma/client@6 zod lucide-react better-auth
npm install -D prisma@6
```
Prisma sengaja dipin ke seri 6: saat dokumen ini dibuat, tag `latest` di npm menunjuk ke rilis 8.0 RC dengan alur CLI berbeda, dan `schema.prisma` di sini memakai `url = env(...)` gaya Prisma 6. Naik versi mayor Prisma = pekerjaan terpisah.

### 3. Environment dan database
```bash
cp .env.example .env        # isi BETTER_AUTH_SECRET
docker compose up -d        # MySQL lokal
```

### 4. Skema, auth, dan CHECK constraint
1. Konfigurasikan Better Auth (email + password, Prisma adapter, provider `mysql`, rate limit dengan penyimpanan database, `disableSignUp` dari `ALLOW_REGISTRATION`) mengikuti dokumentasi resminya.
2. Jalankan CLI generate milik Better Auth dan samakan model `User`, `Session`, `Account`, `Verification` (dan `RateLimit` bila dipakai) di `prisma/schema.prisma` dengan hasilnya.
3. Buat migrasi tanpa menerapkannya, supaya CHECK bisa ditambahkan:
   ```bash
   npx prisma migrate dev --create-only --name init
   ```
4. Tambahkan di akhir file `migration.sql` yang dihasilkan:
   ```sql
   ALTER TABLE `titles` ADD CONSTRAINT `chk_titles_rating` CHECK (`rating` IS NULL OR (`rating` BETWEEN 1 AND 10));
   ALTER TABLE `titles` ADD CONSTRAINT `chk_titles_episode_current` CHECK (`episode_current` >= 0);
   ```
5. Terapkan:
   ```bash
   npx prisma migrate dev
   ```

### 5. Jalankan
```bash
npm run dev
```
Buka http://localhost:3000.

## Urutan pengerjaan
Ikuti fase di PRD §10: 0a Setup → 0b Auth → 1 Inti → 2 Catatan & link → 3a Polish → 3b Rilis.

## Operasional
- **Registrasi**: set `ALLOW_REGISTRATION="false"` di produksi setelah akun dibuat.
- **Lupa password**: tidak ada pemulihan via email di MVP. Buat skrip admin kecil (mis. `scripts/reset-password.ts`) yang mengatur ulang password lewat API server auth; jangan mengubah hash langsung di database.
- **Hapus akun / ekspor data**: belum ada di MVP (PRD F11, F12).

## Skrip yang disarankan
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` / `npm start` | Build dan jalankan produksi |
| `npm run lint` | ESLint |
| `npx prisma migrate dev` | Terapkan migrasi di lokal |
| `npx prisma migrate deploy` | Terapkan migrasi di produksi |
| `npx prisma studio` | Lihat data |
