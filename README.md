# Dashboard Akademik Nesaciba

Dashboard akademik SMPN 1 Cibalong — aplikasi web untuk mengelola dan memantau data akademik: angkatan, kelas, siswa, nilai, dan kehadiran, lengkap dengan manajemen RBAC (user, role, permission, menu, rute) serta import data dari Excel.

Dibangun dengan **Next.js 16**, **React 19**, dan menyimpan data di **PostgreSQL**.

## Teknologi

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- PostgreSQL + driver `pg` (node-postgres)
- Tailwind CSS 4 / shadcn/ui
- Recharts (grafik), Zod (validasi), jose (sesi JWT via cookie)
- `@e965/xlsx` (import Excel)

Nama tampilan aplikasi di UI adalah **SINAR**. Antarmuka hanya memiliki
tema terang.

## Arsitektur Data

Aplikasi memakai pola data layer di `src/lib/db/` yang membaca/menulis seluruh dataset ke **PostgreSQL** dalam satu transaksi (`getDb()` / `persist()` / `resetDb()`). Schema ada di `src/lib/db/schema.sql`.

## Persyaratan

- Node.js 20+
- PostgreSQL 14+ (lingkungan pengembangan saat ini memakai 17.6)

## Setup

1. **Install dependensi**
   ```bash
   npm install
   ```

2. **Buat file `.env`** (salin dari `.env.example`) dan set `DATABASE_URL`:
   ```
   # .env
   SESSION_SECRET=<random-64-hex>
   COOKIE_SECURE=false
   DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/nesaciba
   ```

3. **Siapkan database** (buat schema lalu isi data awal):
   ```bash
   npm run db:migrate   # terapkan schema.sql (15 tabel)
   npm run db:seed      # isi RBAC + 13 mapel, data akademik kosong
   # atau sekali jalan:
   npm run db:reset
   ```
   > Catatan: `db:migrate` untuk setup database baru. Data akademik sengaja kosong dan diisi langsung oleh operator melalui aplikasi.
   > Mapel default berisi 13 entri: 11 mapel kurikulum aktif (PABP, PPKn, BIN, MTK, IPA, IPS, BIG, MUS, PJK, INF, SUN) plus SBK dan PRK yang merupakan mapel kurikulum lama. Katalog bersifat global, dan grafik menyembunyikan otomatis mapel yang tidak punya nilai pada angkatan terpilih.

4. **Jalankan aplikasi**
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000

## Akun Login Default

| Peran      | Email                          | Password    |
|------------|--------------------------------|-------------|
| Superadmin | `superadmin@nesaciba.sch.id`   | `26adm0828` |
| Operator   | `operator@nesaciba.sch.id`     | `admin`     |
| Guru       | `guru@nesaciba.sch.id`         | `admin`     |

> Ganti password di produksi.

## Script

| Perintah        | Fungsi                                  |
|-----------------|-----------------------------------------|
| `npm run dev`   | Jalankan server development              |
| `npm run build` | Build produksi                           |
| `npm run start` | Jalankan server produksi                 |
| `npm run lint`  | Jalankan ESLint                          |
| `npm run typecheck` | Cek tipe tanpa emit                    |
| `npm run test`  | Jalankan unit test (`node --test`)       |
| `npm run db:migrate` | Terapkan schema ke database          |
| `npm run db:seed`    | Isi data awal (RBAC + mapel)         |
| `npm run db:reset`   | migrate + seed sekali jalan          |

## Testing

Test menggunakan `node:test` + `tsx`, tanpa framework tambahan. Berkas
`*.test.ts` ditempatkan berdampingan dengan modul yang diuji:

- `src/lib/db/normalize.test.ts`, `src/lib/db/write.test.ts`
- `src/lib/import/validate.test.ts`, `mapel-resolver.test.ts`, `apply.test.ts`
- `src/lib/siswa-search.test.ts`
- `src/server/service/statistics.test.ts`

Modul yang diuji sengaja dibuat murni (tanpa I/O, tanpa `"use server"`) agar
dapat diuji tanpa database.

## Migrasi Database

`npm run db:migrate` hanya menerapkan `src/lib/db/schema.sql`. Perubahan
schema berikutnya diletakkan di `src/lib/db/migrations/` dan **dijalankan
manual** lewat `psql` atau DBeaver — belum ada migration runner.

| Berkas | Isi | Status |
|---|---|---|
| `001_unique_constraints.sql` | UNIQUE untuk `NilaiSiswa`, `KehadiranSiswa`, `Kelas` | belum dijalankan |

Lihat `src/lib/db/migrations/README.md` untuk urutan, pemeriksaan duplikat yang
wajib dijalankan lebih dulu, dan rollback.

## Struktur

- `src/app` — halaman & route API (App Router)
- `src/components` — komponen UI
- `src/lib/db` — data layer + schema + seed
- `src/lib/import` — validasi, resolusi kolom mapel, dan penulisan hasil impor
- `src/lib/auth` — autentikasi & otorisasi
- `src/lib/master`, `src/lib/siswa`, `src/lib/admin` — action per modul
- `src/server/service` — logika statistik/dashboard
- `src/proxy.ts` — proteksi rute berbasis sesi (pengganti `middleware.ts` di Next 16)
- `src/scripts` — CLI utilitas database
- `docs` — PRD, roadmap ML, dan protokol evaluasi
- `*.test.ts` — unit test, berdampingan dengan modul yang diuji

## Dokumen

| Dokumen | Isi |
|---|---|
| `docs/PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md` | PRD aktif, sudah selaras dengan implementasi |
| `docs/PRD_Dashboard_Akademik_SMPN1_Cibalong_v0.3.md` | Versi lama, sudah digantikan v1.0 |
| `docs/ML_Roadmap_Capstone.md` | Rencana penerapan machine learning |
| `docs/Protokol_Evaluasi_A1.md` | Protokol evaluasi yang dibekukan sebelum training |

## Catatan Batasan

- Password di-hash dengan SHA-256 **tanpa salt**. Ini batasan yang diketahui,
  bukan rekomendasi; migrasi ke bcrypt/argon2 masih menjadi fase lanjutan.
- Pola persistensi menulis ulang seluruh tabel (`TRUNCATE ... CASCADE` lalu
  insert ulang dalam satu transaksi). Diterima untuk skala sekolah, tetapi
  perlu ditinjau bila volume data bertambah.


