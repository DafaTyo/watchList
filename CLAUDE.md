# CLAUDE.md — aturan kerja untuk asisten coding

Baca dulu: `docs/PRD.md` (apa yang dibangun) dan `DESIGN.md` (bagaimana tampilannya). Jika keduanya bertentangan dengan permintaan, tanyakan; jangan menebak.

## Prinsip
- **Jangan over-engineer.** Satu aplikasi Next.js, satu database MySQL. Tanpa Redux/Zustand, GraphQL, tRPC, Redis, UI library berat. Tambah dependensi hanya bila benar-benar perlu, dan sebutkan alasannya.
- Kerjakan per fase di PRD §10. Jangan mengerjakan fitur P1 (F10–F13) kecuali diminta.
- Bahasa UI: Indonesia. Kode, nama variabel, komit: Inggris.

## Aturan teknis
- TypeScript ketat. Server Actions **hanya untuk mutasi**; baca data di Server Component.
- Setiap Server Action memanggil `requireUser()` lebih dulu. Jangan percaya ID dari klien.
- Query `titles` selalu menyaring `user_id` sesi. Operasi `watch_links` selalu lewat `titles.user_id`.
- Validasi semua input dengan Zod di server (panjang, rentang, URL `http/https`; `poster_url` hanya `https`).
- Catatan dirender sebagai teks. Linkify aman saja; jangan pakai `dangerouslySetInnerHTML`.
- Poster memakai `<img>` biasa (`referrerpolicy="no-referrer"`, `loading="lazy"`), bukan image optimizer.
- Batas: 500 judul/pengguna, 10 link/judul, dicek di server dalam transaksi.
- `+1` episode harus atomik di SQL (lihat PRD F4).
- Rahasia hanya lewat env. Jangan commit `.env`.

## Gaya UI
- Gunakan token di `DESIGN.md` lewat konfigurasi tema Tailwind; jangan menulis hex langsung di komponen.
- Komponen kecil dan terpisah: `StatCard`, `TitleRow`, `StatusBadge`, `TitleDialog`, `LinkList`, `EmptyState`.
- Uji di lebar 360 px, tanpa scroll horizontal; target sentuh ≥ 44 px.
- Jangan menyalin aset dari gambar referensi (karakter, logo).

## Sebelum selesai
1. `npm run lint` dan `npm run build` lolos.
2. Kriteria penerimaan yang relevan di PRD §5 diuji, termasuk US9 (akses lintas pengguna) bila menyentuh data.
3. Ringkas perubahan dan hal yang belum dikerjakan dalam beberapa kalimat.
