# DESIGN.md — Nixtio Watch

Panduan visual untuk implementasi. Sumber: gambar referensi (dashboard dua panel dengan hero karakter 3D, kartu statistik, daftar pil, CTA teal). Nilai warna dan ukuran di bawah adalah **estimasi dari gambar**; sesuaikan bila ada aset desain asli.

Dokumen terkait: [PRD](docs/PRD.md) (pemetaan elemen referensi ke fitur ada di PRD §6).

---

## 1. Prinsip

1. **Lembut dan membulat**: radius besar di mana-mana, tanpa sudut tajam.
2. **Dua panel**: hero visual (gelap, ekspresif) bersanding dengan panel informasi (putih, bersih).
3. **Angka sebagai bintang**: statistik ditampilkan sangat besar dan tebal.
4. **Satu aksen**: teal untuk aksi utama dan status positif; sisanya netral.
5. **Ringan**: tanpa library UI; semua komponen dibuat dari utility Tailwind.

## 2. Warna

### 2.1 Token

| Token | Hex | Pemakaian |
|---|---|---|
| `bg-page` | `#E9F5F1` | Latar halaman (mint sangat muda, gradasi halus ke putih) |
| `surface` | `#FFFFFF` | Panel kanan, kartu, dialog |
| `surface-soft` | `#F4F5F5` | Baris pil, input |
| `hero-from` | `#8C8C8C` | Gradasi hero (atas) |
| `hero-to` | `#C9C9C9` | Gradasi hero (bawah) |
| `ink` | `#0F0F10` | Teks utama, tombol ikon gelap, logo |
| `ink-muted` | `#6B7280` | Teks sekunder, label kecil |
| `line` | `#E5E7EB` | Garis pemisah, border pil |
| `teal-500` | `#2FA89A` | Aksen utama, status Selesai |
| `teal-400` | `#4CD3A8` | Badge positif, ujung gradasi CTA |
| `teal-600` | `#23867B` | Hover/aktif aksen |
| `neutral-badge` | `#D9D9D9` | Badge status netral |
| `orange-500` | `#F5A623` | Aksen sekunder (ikon, peringatan ringan) |
| `red-500` | `#E5322D` | Hapus, error |

### 2.2 Status judul

| Status | Badge latar | Badge teks |
|---|---|---|
| `completed` | `teal-400` | `ink` |
| `watching` | `orange-500` @ 20% | `#9A5B00` |
| `planned` | `neutral-badge` | `ink` |
| `on_hold` | `#DDE6FF` | `#2F3F8F` |
| `dropped` | `red-500` @ 15% | `#A11C18` |

Status **tidak boleh** dibedakan hanya dengan warna: selalu sertakan teks label.

### 2.3 Gradasi
- **CTA**: `linear-gradient(90deg, #5CC9A7 0%, #2FA89A 100%)`, teks `ink`.
- **Hero**: `linear-gradient(180deg, #8C8C8C 0%, #C9C9C9 100%)` dengan vinyet halus di tepi.
- **Latar halaman**: `radial-gradient(circle at 100% 0%, #D4EFE6 0%, #E9F5F1 40%, #FFFFFF 100%)`.

Kontras: teks `ink` di atas semua badge dan CTA di atas harus ≥ 4.5:1; periksa saat implementasi.

## 3. Tipografi

| Peran | Font | Ukuran / berat |
|---|---|---|
| UI & isi | **Outfit** (`next/font`) | 14–16 px, 400/500 |
| Judul panel ("Watchlist 2026") | **Orbitron** (hanya judul; font berkarakter kotak seperti di gambar) | 28–32 px, 700, huruf kapital, letter-spacing 0.04em |
| Angka statistik besar | Outfit | 56–72 px desktop, 44–52 px ponsel, 700 |
| Angka kartu mengambang | Outfit | 32–36 px, 600 |
| Label kecil | Outfit | 11–12 px, 500, `ink-muted` |

Jika Orbitron terasa berlebihan saat dicoba, ganti dengan Outfit 700 uppercase; jangan menambah font ketiga.

## 4. Bentuk, Radius, Bayangan, Spasi

| Token | Nilai |
|---|---|
| `radius-panel` | 40 px (panel hero dan panel kanan) |
| `radius-card` | 24 px (kartu mengambang, dialog) |
| `radius-pill` | 9999 px (baris daftar, badge, tombol) |
| `radius-input` | 16 px |
| Bayangan kartu | `0 8px 24px rgba(15,15,16,0.08)` |
| Bayangan hero | `0 20px 60px rgba(15,15,16,0.18)` |
| Skala spasi | kelipatan 4 px; jarak antar-panel 16–24 px; padding panel 24–32 px |

Tailwind: petakan token warna, radius, dan font ke konfigurasi tema (`@theme` pada v4 atau `theme.extend` pada v3).

## 5. Layout Desktop (≥ 1024 px)

```
┌───────────────────────────────┬───────────────────────┐
│  HERO (flex-1, radius 40)     │  PANEL KANAN (±420px) │
│  [logo]            [menu]     │  WATCHLIST 2026       │
│                               │  Selesai │ Rencana    │
│        poster judul           │   79    │   28        │
│        sorotan                │  [chip status kecil]  │
│  ┌──────────┐   ┌──────────┐  │  [cari] [filter]      │
│  │ Sedang   │   │ Total    │  │  ( pil judul )        │
│  │ ditonton │   │ judul    │  │  ( pil judul )        │
│  └──────────┘   └──────────┘  │  ( pil judul )        │
│                               │  [ Tambah Judul ]     │
└───────────────────────────────┴───────────────────────┘
```

- Kontainer: tinggi `100dvh` dikurangi margin; maks lebar 1440 px, di tengah.
- Hero: gradasi abu, poster ditaruh tengah dengan bayangan lembut; dua kartu mengambang di sudut kiri-bawah dan kanan-bawah.
- Panel kanan: putih, daftar menggulung di dalam panel (header dan CTA tetap terlihat).
- Tab lengkung di tepi antar-panel (seperti `>` dan `<` pada gambar) membuka/menutup panel detail.

## 6. Komponen

### 6.1 Tombol ikon gelap (logo, menu)
Kotak 40×40, `radius 14`, latar `ink`, ikon putih. Tombol menu kedua: kotak putih dengan ikon gelap.

### 6.2 Kartu mengambang (StatCard)
Putih, `radius-card`, bayangan kartu, lebar ±120–140 px. Angka besar di kiri atas, ikon kecil di kanan atas, label kecil di kiri bawah. Latar boleh gradasi putih ke mint sangat muda.

### 6.3 Blok angka statistik
Dua kolom dengan garis vertikal tipis di tengah. Label kecil di atas ("Selesai", "Rencana"), angka sangat besar di bawahnya. Chip status lain (Menonton, Ditahan, Dibuang) satu baris di bawahnya, `radius-pill`, teks 12 px.

### 6.4 Baris judul (TitleRow / pil)
- Bentuk pil, latar `surface-soft`, border `line`, tinggi ±56 px (ponsel ≥ 64 px).
- Kiri: poster kecil bulat/rounded 40 px (fallback inisial). Tengah: nama (1 baris, terpotong dengan elipsis) dan baris kecil `tipe · tahun`. Kanan: progres (`9/15`) dan ikon link bila ada.
- **Badge status** menempel di sudut kiri-atas pil, kecil (seperti badge `+78` pada gambar); teks status kecil di atas pil di tengah (seperti label "Win"/"Lose").
- Hover: naik 1 px, bayangan kartu. Aktif/terpilih: border `teal-500`.
- Seluruh pil dapat difokuskan dan dibuka dengan Enter/Space.

### 6.5 Tombol CTA ("Tambah Judul")
Lebar penuh panel, tinggi 56 px, `radius-pill`, gradasi CTA, teks `ink` 600, ikon di kanan (di gambar: ikon tengkorak; ganti `Plus`). Hover: gradasi sedikit lebih gelap. Fokus: ring `teal-600` 3 px.

### 6.6 Input pencarian dan filter
`radius-input`, latar `surface-soft`, tanpa border sampai fokus (ring teal). Filter status/tipe berupa chip pil yang bisa dipilih (satu baris, bisa digeser horizontal di ponsel).

### 6.7 Dialog tambah/ubah (TitleDialog)
Satu komponen responsif: modal tengah ≤ 520 px di desktop (`radius-card`), bottom sheet penuh lebar dengan sudut atas 32 px di ponsel. Bagian: data judul, progres (hanya series/anime), catatan, daftar link (tambah/ubah/hapus). Tombol simpan memakai gaya CTA; hapus memakai teks `red-500` dengan konfirmasi.

### 6.8 Panel detail
Muncul di atas daftar (desktop: menggantikan isi panel kanan dengan tombol kembali; ponsel: layar penuh). Isi: poster, status, progres dengan `+1` / `−1`, catatan (dengan URL yang dapat diklik), daftar link berbentuk pil kecil yang membuka tab baru.

### 6.9 Keadaan khusus
- **Kosong**: ilustrasi sederhana di area hero, teks ajakan di panel kanan, CTA tetap terlihat.
- **Memuat**: skeleton berbentuk pil abu-abu berdenyut halus.
- **Error**: banner `red-500` @ 10% dengan teks dan tombol coba lagi.
- **Poster gagal**: kotak `surface-soft` dengan inisial judul.

## 7. Gerak

- Durasi 150–250 ms, easing `ease-out`.
- Transisi hover/fokus, dialog fade+scale 0.98→1, bottom sheet geser dari bawah, angka statistik berganti dengan fade singkat.
- Hormati `prefers-reduced-motion`: matikan geser dan skala, sisakan fade.

## 8. Responsif

| Breakpoint | Perilaku |
|---|---|
| ≥ 1024 px | Dua panel berdampingan (§5) |
| 768–1023 px | Hero lebih pendek di atas (±280 px), panel kanan di bawahnya, satu kolom |
| < 768 px | Satu kolom: hero ringkas (poster + dua kartu kecil dalam satu baris), blok angka, filter geser horizontal, daftar pil; CTA melayang di bawah (sticky, tinggi 56 px, aman terhadap safe-area iOS) |

Aturan wajib: tanpa scroll horizontal pada 360 px; target sentuh ≥ 44 px; teks isi ≥ 14 px; dialog menjadi bottom sheet di bawah 768 px.

## 9. Aksesibilitas

- Kontras teks ≥ 4.5:1 (komponen besar ≥ 3:1).
- Fokus selalu terlihat (ring `teal-600`, offset 2 px).
- Dialog menjebak fokus, bisa ditutup dengan Esc, mengembalikan fokus ke pemicunya.
- Semua input punya label; pesan error terhubung via `aria-describedby`.
- Gambar poster memakai `alt` berisi nama judul; ikon dekoratif `aria-hidden`.
- Informasi tidak bergantung pada warna saja (§2.2).

## 10. Catatan Implementasi

- Ikon: `lucide-react` (Plus, Search, Link, Menu, Trash2, ChevronLeft/Right).
- Poster: tag `<img>` biasa dengan `referrerpolicy="no-referrer"` dan `loading="lazy"` (lihat PRD F2a).
- Jangan menyalin aset dari gambar referensi (karakter, logo "N"); logo dan ilustrasi dibuat sendiri.
- Prioritaskan komponen kecil dan terpisah: `StatCard`, `TitleRow`, `StatusBadge`, `TitleDialog`, `LinkList`, `EmptyState`.
