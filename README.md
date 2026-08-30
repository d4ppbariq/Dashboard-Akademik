# Dashboard Akademik Nesaciba

Dashboard akademik SMPN 1 Cibalong — aplikasi web untuk mengelola dan memantau data akademik: angkatan, kelas, siswa, nilai, dan kehadiran, lengkap dengan manajemen RBAC (user, role, permission, menu, rute) serta import data dari Excel.

Dibangun dengan **Next.js 16**, **React 19**, dan menyimpan data di **PostgreSQL**.

## Teknologi

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- PostgreSQL 17 + driver `pg` (node-postgres)
- Tailwind CSS / shadcn/ui
- Zod (validasi), jose (sesi JWT via cookie)
- `@e965/xlsx` (import Excel)

## Arsitektur Data

Aplikasi memakai pola data layer di `src/lib/db/` yang membaca/menulis seluruh dataset ke **PostgreSQL** dalam satu transaksi (`getDb()` / `persist()` / `resetDb()`). Schema ada di `src/lib/db/schema.sql`.

## Persyaratan

- Node.js 20+
- PostgreSQL 14+

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
   npm run db:migrate   # terapkan schema.sql
   npm run db:seed      # isi RBAC + 11 mapel, data akademik kosong
   # atau sekali jalan:
   npm run db:reset
   ```
   > Catatan: `db:migrate` untuk setup database baru. Data akademik sengaja kosong dan diisi langsung oleh operator melalui aplikasi.

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
| `npm run db:migrate` | Terapkan schema ke database          |
| `npm run db:seed`    | Isi data awal (RBAC + mapel)         |
| `npm run db:reset`   | migrate + seed sekali jalan          |

## Struktur

- `src/app` — halaman & route API (App Router)
- `src/components` — komponen UI
- `src/lib/db` — data layer + schema + seed
- `src/lib/auth` — autentikasi & otorisasi
- `src/server/service` — logika statistik/dashboard
- `src/scripts` — CLI utilitas database
