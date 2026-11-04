# PRD — Watchlist App (nama kerja: **Nixtio Watch**)

| | |
|---|---|
| Versi | 1.0 (sudah diaudit) |
| Tanggal | 4 November 2026 |
| Status | Siap dipakai untuk implementasi |
| Dokumen terkait | [DESIGN.md](../DESIGN.md), [README.md](../README.md), [schema.prisma](../prisma/schema.prisma) |

---

## 1. Ringkasan

Website watchlist untuk mencatat film, serial, dan anime yang ingin, sedang, atau sudah ditonton. Selain fitur watchlist standar (status, progres, rating), setiap judul punya **catatan** dan **daftar link tempat menonton**, jadi pengguna tidak perlu mencari ulang di mana judul itu bisa ditonton.

Tampilan mengikuti gambar referensi: layout dua panel, hero visual di kiri dengan kartu statistik mengambang, panel putih di kanan berisi judul, dua angka besar, daftar berbentuk pil, dan tombol CTA gradient teal. Detail visual ada di `DESIGN.md`.

## 2. Tujuan & Metrik Keberhasilan

**Tujuan**
1. Menambah, mengubah, dan menghapus judul dengan cepat.
2. Menyimpan catatan dan beberapa link nonton per judul.
3. Interaktif dan nyaman dipakai di ponsel maupun desktop.

**Metrik (diuji manual sebelum rilis)**

| Metrik | Cara uji |
|---|---|
| Tambah judul manual ≤ 30 detik | Stopwatch, 3 kali percobaan, dari klik "Tambah Judul" sampai judul muncul di daftar. Median ≤ 30 detik. |
| Halaman Watchlist cepat dimuat | Lighthouse mobile (throttling bawaan), 200 judul: LCP ≤ 2,5 detik. Target, bukan gerbang rilis. |
| Responsif | Tidak ada scroll horizontal pada lebar 360 px; semua aksi P0 bisa dilakukan di 360 px. |
| Aksesibilitas | Lighthouse Accessibility ≥ 90. Target, bukan gerbang rilis. |

## 3. Target Pengguna & Model Akses

Individu yang rutin menonton dan butuh satu tempat rapi untuk daftar tontonan. Tidak ada peran admin.

- **Multi-pengguna.** Setiap pengguna hanya melihat data miliknya sendiri.
- **Registrasi dikontrol env `ALLOW_REGISTRATION`.** Default `true` di lokal, `false` di produksi setelah akun yang dibutuhkan dibuat. Ini membatasi risiko penyalahgunaan tanpa perlu fitur tambahan.
- **Tidak ada pemulihan password di MVP** (tanpa email). Reset dilakukan manual lewat skrip admin/CLI. Konsekuensi ini diterima dan dicatat di README.

## 4. Ruang Lingkup

### 4.1 In scope (MVP)

**P0 — wajib**

| ID | Fitur | Deskripsi |
|---|---|---|
| F1 | Registrasi, login, logout | Email + password. Sesi via cookie. |
| F2 | CRUD judul | Judul (maks 200 karakter), tipe (`movie` / `series` / `anime`), status, tahun (opsional), rating 1–10 (opsional), poster URL (opsional, lihat F2a). Maks 500 judul per pengguna. |
| F2a | Poster | `poster_url` opsional, wajib `https`, maks 2.048 karakter. Dirender dengan tag `<img>` biasa (`loading="lazy"`, `referrerpolicy="no-referrer"`), bukan image optimizer Next.js. Jika kosong atau gagal dimuat, tampilkan placeholder. |
| F3 | Status | `planned`, `watching`, `completed`, `on_hold`, `dropped`. Default `planned`. |
| F4 | Progres episode | Hanya untuk `series` dan `anime`: `episode_current` dan `episode_total` (opsional). Aturan di bawah tabel. |
| F5 | Catatan | Teks bebas per judul, maks 2.000 karakter. Dirender sebagai teks; URL `http(s)` di dalamnya otomatis menjadi tautan yang bisa diklik (linkify aman, tanpa `dangerouslySetInnerHTML`, `target="_blank"`, `rel="noopener noreferrer"`). |
| F6 | Link nonton | Banyak link per judul, **tambah, ubah, hapus**. Label wajib maks 40 karakter (mis. "Netflix"), URL `http/https` maks 2.048 karakter. Maks 10 link per judul. Urutan menurut waktu dibuat. Dibuka di tab baru dengan `rel="noopener noreferrer"`. |
| F7 | Cari, filter, urut | Cari berdasarkan judul; filter status dan tipe; urut berdasarkan terakhir diubah, judul, rating (judul tanpa rating di akhir). Dilakukan di klien dari data yang sudah dimuat. |
| F8 | Ringkasan statistik | Dua angka besar: **Selesai** (`completed`) dan **Rencana** (`planned`). Status lain (`watching`, `on_hold`, `dropped`) tampil sebagai chip kecil dengan jumlahnya. Dihitung di server dengan `COUNT ... GROUP BY status`, bukan dari baris yang dimuat. |
| F9 | Responsif | Desktop: dua panel. Ponsel: satu kolom. Dialog tambah/ubah memakai satu komponen responsif (modal di desktop, bottom sheet di ponsel). |

**Aturan F4**
- `+1` dieksekusi atomik di server: `UPDATE ... SET episode_current = episode_current + 1 WHERE id = ? AND user_id = ? AND (episode_total IS NULL OR episode_current < episode_total)`. Klik ganda cepat tidak melewati total.
- `+1` pertama pada judul `planned` mengubah status menjadi `watching`.
- Saat `episode_current` mencapai `episode_total`, status otomatis menjadi `completed` (tanpa dialog); pengguna bisa mengubahnya manual.
- Tersedia tombol `−1` untuk koreksi (minimum 0).
- Validasi: `episode_current ≤ episode_total` bila total diisi. Jika total diedit di bawah `episode_current`, simpan ditolak dengan pesan jelas.
- Untuk `movie`, field episode tidak ditampilkan dan tidak dipakai.

**P1 — boleh menyusul setelah MVP**

| ID | Fitur | Deskripsi |
|---|---|---|
| F10 | Pencarian metadata TMDB | Cari judul lewat TMDB API untuk mengisi judul, tahun, poster. Entri manual tetap ada. Kunci API hanya di server. |
| F11 | Ekspor data | Unduh daftar sebagai JSON/CSV. |
| F12 | Ganti password, hapus akun | Tidak ada di MVP; sampai ada, reset dan hapus akun dilakukan lewat skrip admin. |
| F13 | Season, tanggal mulai/selesai | Metadata tambahan per judul. |

### 4.2 Non-goals (sengaja tidak dibuat)
- Fitur sosial (follow, berbagi daftar, komentar, leaderboard).
- Rekomendasi/AI, notifikasi, verifikasi email, lupa password via email.
- Login sosial (Google/GitHub), 2FA.
- Mode gelap, multi-bahasa (UI Bahasa Indonesia), zona waktu khusus (tampilan memakai zona waktu browser).
- Aplikasi native, PWA offline.
- Tag/genre custom, koleksi bertingkat, pagination (semua judul dimuat sekaligus, batas 500).
- Pengambilan otomatis (scraping) ketersediaan di platform streaming.

## 5. User Story & Kriteria Penerimaan

Format: Given / When / Then agar bisa diuji.

| # | Sebagai pengguna, saya ingin… | Kriteria penerimaan |
|---|---|---|
| US1 | mendaftar dan masuk | **Given** email belum terdaftar dan `ALLOW_REGISTRATION=true`, **when** mendaftar dengan password 8–128 karakter, **then** akun dibuat dan saya masuk. Email dinormalisasi (trim, huruf kecil). Salah email atau password menampilkan satu pesan generik yang sama. Mengakses halaman Watchlist tanpa login diarahkan ke halaman login. Dengan `ALLOW_REGISTRATION=false`, halaman dan endpoint daftar menolak pendaftaran. |
| US2 | menambah judul | **Given** form terbuka, **when** judul kosong, **then** simpan ditolak dengan pesan di field. **When** simpan berhasil, **then** judul muncul di daftar tanpa reload halaman penuh dan berstatus `planned`. Pada 500 judul, simpan ditolak dengan pesan batas. |
| US3 | mengubah status dan progres | **Given** judul `series` dengan total 12 dan current 11, **when** `+1`, **then** current 12 dan status `completed`; **when** `+1` lagi, **then** tidak berubah. **Given** judul `planned`, **when** `+1` pertama, **then** status `watching`. Perubahan tampil setelah server mengonfirmasi (tanpa pembaruan optimistik di MVP) dan gagal dengan pesan bila server menolak. |
| US4 | menyimpan catatan dan link nonton | **When** menambah link dengan skema selain `http`/`https`, **then** ditolak. Link terbuka di tab baru dengan `rel="noopener noreferrer"`. Catatan berisi `<script>` ditampilkan sebagai teks, tidak dieksekusi. URL di catatan bisa diklik. Link ke-11 ditolak. |
| US5 | mencari dan memfilter | **Given** 200 judul, **when** mengetik di kolom cari atau mengganti filter, **then** daftar diperbarui ≤ 100 ms pada laptop menengah. Hasil kosong menampilkan pesan dan ajakan menambah judul. |
| US6 | menghapus judul | **When** menekan hapus, **then** dialog konfirmasi menyebut judul dan jumlah link yang ikut terhapus. Setelah konfirmasi, judul dan link terkait hilang permanen. |
| US7 | memakai di ponsel | Semua aksi P0 bisa dilakukan pada lebar 360 px; target sentuh ≥ 44 px; tidak ada scroll horizontal. |
| US8 | melihat ringkasan | Angka Selesai/Rencana dan chip status sama dengan jumlah data aktual dan berubah setelah status diubah. |
| US9 | data saya aman dari pengguna lain | **Given** pengguna B login, **when** B memanggil baca/ubah/hapus pada ID judul atau link milik A, **then** hasilnya 404/ditolak dan data A tidak berubah. Minimal satu tes integrasi mencakup ini untuk judul **dan** link. |

## 6. Alur & Pemetaan Desain

**Alur utama**
1. Login atau daftar, lalu masuk ke halaman **Watchlist**.
2. Halaman Watchlist: kiri hero judul sorotan, kanan statistik, filter, dan daftar.
3. **Tambah Judul** membuka dialog, lalu simpan.
4. Klik baris judul membuka panel detail: catatan, link nonton, edit progres/status.

**Pemetaan gambar referensi ke aplikasi**

| Gambar referensi | Di aplikasi |
|---|---|
| Hero 3D karakter (BMO) di panel abu-abu | Poster **judul sorotan** (lihat aturan di bawah) di atas latar gradasi |
| Kartu mengambang "Attack 127" dan "Protection 395" | Dua kartu: **Sedang ditonton** (jumlah) dan **Total judul** |
| Judul "BMO 2023" | "Watchlist {tahun berjalan}" |
| Angka besar Win 79 / Lose 28 | Angka besar **Selesai** / **Rencana** |
| Daftar pil pertandingan dengan badge +78 / −69 dan avatar | Daftar pil judul: poster kecil, nama, badge status, progres (mis. 9/15), ikon link bila ada link |
| Tombol CTA gradient teal "Find Opponent" | CTA "Tambah Judul" |
| Tab lengkung `>` `<` di tepi panel | Tombol buka/tutup panel (ponsel: buka detail/daftar) |

**Aturan judul sorotan**: judul `watching` dengan `updated_at` terbaru; jika tidak ada, judul dengan `updated_at` terbaru; jika daftar kosong, ilustrasi keadaan kosong dengan ajakan menambah judul. Menambah, mengubah, atau menghapus link ikut memperbarui `titles.updated_at`.

## 7. Data Model (MySQL)

Semua tabel `utf8mb4` (`utf8mb4_unicode_ci`) agar judul berhuruf Jepang/emoji aman. Skema lengkap di `prisma/schema.prisma`.

**Tabel auth** (`User`, `Session`, `Account`, `Verification`) dibuat dan dikelola oleh library auth (lihat §8); hasil generate CLI-nya adalah sumber kebenaran.

**titles**: `id`, `user_id` (FK, cascade), `name` VARCHAR(200), `type` ENUM, `status` ENUM, `year?`, `poster_url?` VARCHAR(2048), `rating?` TINYINT (1–10), `episode_current` INT (default 0), `episode_total?` INT, `notes?` TEXT, `created_at`, `updated_at`.

**watch_links**: `id`, `title_id` (FK, cascade), `label` VARCHAR(40), `url` VARCHAR(2048), `created_at`.

Aturan:
- Index `titles(user_id, status)` dan `titles(user_id, updated_at)`; index FK `watch_links(title_id)`.
- Setiap Server Action memanggil `requireUser()` sebelum menyentuh data. ID dari klien tidak dipercaya.
- Query `titles` wajib menyaring `user_id` sesi. Operasi `watch_links` wajib join ke `titles.user_id = sesi`.
- Validasi di server dengan Zod (rentang, panjang, skema URL). Batas 10 link/judul dan 500 judul/pengguna dicek di server dalam transaksi.
- CHECK constraint (`rating BETWEEN 1 AND 10`, `episode_current >= 0`) ditambahkan lewat migrasi SQL mentah, karena Prisma tidak mendukungnya di skema.

## 8. Tech Stack

Prinsip: satu aplikasi, satu database, sesedikit mungkin dependensi. **Versi persis dicek dan dipin saat setup**, bukan ditulis di dokumen ini.

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Full-stack satu repo. Server Actions **hanya untuk mutasi**; data dibaca di Server Component. |
| Styling | Tailwind CSS | Diwajibkan. Pada Tailwind v4 token dipetakan lewat `@theme` di CSS; pada v3 lewat `tailwind.config`. |
| Database | MySQL 8 | Diwajibkan. MySQL 8.0.16+ dibutuhkan untuk CHECK constraint. |
| ORM | Prisma, **dipin ke seri 6** | Skema deklaratif dan migrasi. Tag `latest` npm saat dokumen ini dibuat menunjuk ke 8.0 RC dengan alur CLI berbeda; jangan naik mayor tanpa tugas migrasi terpisah. |
| Auth | **Better Auth** (email + password, Prisma adapter, sesi di database) | Auth.js v5 tidak dipilih: rilis v5 masih berstatus beta dan proyeknya diumumkan bergabung ke Better Auth ([diskusi resmi](https://github.com/nextauthjs/next-auth/discussions/13252)). Rate limit login/daftar memakai fitur bawaan dengan penyimpanan di database. Pendaftaran dimatikan lewat opsi bawaan yang dipetakan dari `ALLOW_REGISTRATION`. Fallback jika integrasi > 0,5 hari: sesi buatan sendiri dengan `jose` + tabel `sessions`. |
| Validasi | Zod | Di server dan klien. |
| Ikon / font | `lucide-react`, `next/font` (Outfit) | Ringan. |
| Dev environment | Docker Compose (hanya MySQL) | Satu perintah. |

Tidak dipakai agar tidak over-engineer: Redux/Zustand, GraphQL, tRPC, microservice, Redis, UI library berat, E2E test di MVP.

Struktur folder yang disarankan:

```
src/
  app/
    (auth)/login, register
    (app)/watchlist
    api/auth/[...all]      # handler auth
    api/tmdb/search        # hanya jika F10 dikerjakan
  components/              # TitleRow, StatCard, TitleDialog, LinkList, ...
  lib/                     # db.ts, auth.ts, validators.ts, session.ts (requireUser)
  actions/                 # server actions: titles.ts, links.ts
prisma/
  schema.prisma
docs/
```

## 9. Kebutuhan Non-Fungsional

- **Keamanan**
  - Password di-hash oleh library auth (algoritma bawaan yang kuat); panjang 8–128 karakter.
  - Cookie sesi `httpOnly`, `secure` di produksi, `sameSite=lax`; sesi berlaku 30 hari; logout menghapus sesi di database.
  - Rate limit login dan registrasi aktif sejak Fase 0b.
  - Respons login tidak membedakan "email tidak ada" dan "password salah".
  - Produksi mengirim header dasar: CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.
  - Rahasia hanya lewat environment variable.
  - Poster tidak pernah dipakai di `style="background-image:url(...)"` tanpa escaping.
- **Performa**: semua judul dimuat sekaligus (maks 500), cari/filter/urut di klien, statistik lewat query agregat; tidak ada polling.
- **Aksesibilitas**: kontras teks ≥ 4.5:1, fokus terlihat, navigasi keyboard untuk dialog dan daftar, label form, `prefers-reduced-motion` dihormati.
- **Kompatibilitas**: Chrome dan Safari versi terbaru, iOS Safari, Chrome Android.
- **Pemeliharaan**: ESLint + Prettier; migrasi lewat Prisma Migrate.

## 10. Rencana Rilis

Estimasi untuk 1 developer penuh waktu, tanpa buffer. Tambahkan sekitar 30% buffer. Total sekitar 10–13 hari kerja sebelum buffer.

| Fase | Isi | Estimasi |
|---|---|---|
| 0a — Setup | Repo, Tailwind token (DESIGN.md), Docker MySQL, Prisma migrate | 1 hari |
| 0b — Auth | F1, `requireUser()`, rate limit, flag registrasi, tes otorisasi dasar | 2–3 hari |
| 1 — Inti | F2, F2a, F3, F4, F7, F8, dialog responsif | 3–4 hari |
| 2 — Catatan & link | F5, F6, panel detail, judul sorotan | 1–2 hari |
| 3a — Polish | F9 penuh, keadaan kosong/error/loading, aksesibilitas | 2 hari |
| 3b — Rilis | Deploy, header keamanan, smoke test, tes US9 | 1 hari |
| 4 — P1 | F10, F11, F12, F13 | opsional |

Target hosting diputuskan **sebelum Fase 3b** (asumsi: host Node apa pun + MySQL terkelola); tidak ada keputusan teknis di fase awal yang bergantung padanya.

## 11. Risiko & Asumsi

| Risiko / Asumsi | Penanganan |
|---|---|
| Better Auth relatif baru; API bisa berubah | Pin versi, ikuti dokumentasi resmi; fallback `jose` + tabel `sessions` (§8). |
| Rate limit bawaan perlu diverifikasi sesuai versi yang terpasang | Uji manual di Fase 0b (percobaan login gagal berulang ditolak). |
| Poster dari URL luar bisa mati atau diblok hotlink | Placeholder saat gagal; `<img>` biasa tanpa optimizer. |
| Desain referensi untuk dashboard game, bukan watchlist | Dipetakan di §6; elemen 3D karakter diganti poster. |
| Tanpa pemulihan password, pengguna yang lupa password kehilangan akses | Diterima; reset manual lewat skrip (README). Registrasi dibatasi di produksi. |
| Estimasi waktu mengasumsikan 1 developer berpengalaman dengan stack ini | Lihat §10; tambahkan buffer. |

## 12. Pertanyaan Terbuka
1. Target hosting produksi (diputuskan sebelum Fase 3b).
2. Apakah F10 (TMDB) dikerjakan segera setelah MVP, atau ditunda.

---

## Lampiran A — Ringkasan Audit

PRD draft 0.1 diaudit oleh peninjau independen terhadap persyaratan awal. Temuan dan penyelesaiannya:

| # | Temuan (severity) | Penyelesaian di versi 1.0 |
|---|---|---|
| 1 | Satu/multi-pengguna belum final, bertabrakan dengan non-goals (tinggi) | §3: multi-pengguna, flag `ALLOW_REGISTRATION`, tanpa pemulihan password |
| 2 | Kepemilikan `watch_links` tidak dijaga, tanpa tes IDOR (tinggi) | §7 aturan join + `requireUser()`; US9 |
| 3 | Whitelist domain gambar tidak mungkin untuk URL bebas (tinggi) | F2a: `https`, `<img>` biasa, tanpa optimizer |
| 4 | Angka performa dan pagination tidak sinkron (tinggi) | Tanpa pagination, klien-side, statistik agregat, US5 ≤ 100 ms |
| 5 | Rate limit di memori tidak andal (sedang) | Rate limit bawaan auth dengan penyimpanan database, Fase 0b |
| 6 | Logika progres ambigu (sedang) | Aturan F4 lengkap |
| 7 | Estimasi menyesatkan (sedang) | §10: asumsi, fase dipecah, buffer |
| 8 | Referensi desain tidak ditelusuri (sedang) | §6 tabel pemetaan dan aturan judul sorotan |
| 9 | Kriteria tidak terukur (sedang) | Given/When/Then dan protokol uji metrik |
| 10 | CRUD link dan linkify catatan belum ada (sedang) | F5 dan F6 diperluas; ganti password dan hapus akun ke P1 |
| 11 | Detail auth kurang (sedang) | §3, §9 (panjang password, normalisasi email, umur sesi, header) |
| 12 | Data model kurang tegas (sedang) | §7: utf8mb4, panjang kolom, ENUM, CHECK, kuota |
| 13 | Pilihan teknologi berisiko (sedang) | §8: Better Auth, versi dipin saat setup, Server Actions hanya mutasi |
| 14 | Scope creep ringan (rendah) | Pagination dihapus, kompatibilitas diringkas, satu dialog responsif, Lighthouse jadi target |
| 15 | Inkonsistensi kecil (rendah) | Q1/Q2 ditutup, zona waktu di non-goals, konfirmasi hapus menyebut jumlah link |

Catatan: peninjau tidak dapat memeriksa `DESIGN.md`, `README.md`, dan `schema.prisma` karena belum ada saat audit; konsistensi dokumen-dokumen itu dengan PRD diperiksa terpisah pada tahap akhir.
