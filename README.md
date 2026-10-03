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

2. **Buat file `.env`** (salin dari `.env.example`). Semua variabel di bawah wajib
   diisi; `SESSION_SECRET` minimal 32 karakter, `COOKIE_SECURE` harus tepat
   `"true"` atau `"false"`:
   ```
   # .env
   SESSION_SECRET=<random-64-hex>
   COOKIE_SECURE=false
   DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/nesaciba
   SEED_SUPERADMIN_PASSWORD=<password-akun-superadmin>
   SEED_OPERATOR_PASSWORD=<password-akun-operator>
   SEED_GURU_PASSWORD=<password-akun-guru>
   ```
   > Tidak ada nilai cadangan di dalam kode. `SESSION_SECRET` dan `COOKIE_SECURE`
   > yang kosong membuat aplikasi **gagal menyala** dengan pesan yang menyebut
   > variabelnya, bukan berjalan dengan nilai yang tidak aman.
   > `COOKIE_SECURE=false` hanya untuk aplikasi yang diakses via HTTP (LAN tanpa
   > TLS). Akses lewat HTTPS memakai `true`.
   > Generate `SESSION_SECRET`:
   > `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **Siapkan database** (buat schema lalu isi data awal):
   ```bash
   npm run db:migrate   # terapkan schema.sql (15 tabel)
   npm run db:seed      # isi RBAC + 13 mapel, data akademik kosong
   # atau sekali jalan:
   npm run db:reset
   ```
   > Catatan: `db:migrate` untuk setup database baru. Data akademik sengaja kosong dan diisi langsung oleh operator melalui aplikasi.
   > Mapel default berisi 13 entri: 11 mapel kurikulum aktif (PABP, PPKn, BIN, MTK, IPA, IPS, BIG, MUS, PJK, INF, SUN) plus SBK dan PRK yang merupakan mapel kurikulum lama. Katalog bersifat global, dan grafik menyembunyikan otomatis mapel yang tidak punya nilai pada angkatan terpilih.
   > `db:seed` membaca password akun awal dari `SEED_*` di `.env`, lalu
   > menyimpannya sebagai hash. Password tidak pernah dicetak ke konsol dan tidak
   > ada yang tersimpan di repositori.

4. **Jalankan aplikasi**
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000

## Akun Login Default

| Peran      | Email                        | Password              |
|------------|------------------------------|-----------------------|
| Superadmin | `superadmin@nesaciba.sch.id` | `SEED_SUPERADMIN_PASSWORD` |
| Operator   | `operator@nesaciba.sch.id`   | `SEED_OPERATOR_PASSWORD`   |
| Guru       | `guru@nesaciba.sch.id`       | `SEED_GURU_PASSWORD`       |

> Password tidak disimpan di repositori, dalam bentuk apa pun. Nilai diambil dari
> variabel `SEED_*` di `.env` lalu di-hash saat `npm run db:seed` berjalan.
> Tiga nilai terpisah, bukan satu untuk semua, agar kelalaian pada satu akun tidak
> membuka akun lain.
>
> Variabel `SEED_*` hanya dibaca saat tabel `Role` masih kosong, yaitu pada
> `db:seed`/`db:reset` atau pada database yang benar-benar baru. Mengganti isi
> `.env` tidak mengubah password pada database yang sudah berisi data.

### Mengganti password tanpa merusak data

Untuk instalasi yang sudah berjalan, **jangan** memakai `db:reset` hanya demi
mengganti password — perintah itu menulis ulang seluruh tabel dan menghapus data
akademik. Gunakan saja **Manajemen User → ikon kunci** pada baris akun yang
dituju; dialognya tersedia untuk semua akun, termasuk akun Anda sendiri.

### Pemulihan bila password superadmin hilang

Tidak ada pemulihan password dari dalam aplikasi. Repo ini masih memakai
SHA-256 tanpa salt, jadi hash-nya dapat dihitung di luar aplikasi. Hitung hash
password baru:

```powershell
$p='PasswordBaruAnda'
$sha=[System.Security.Cryptography.SHA256]::Create()
($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($p)) | ForEach-Object { $_.ToString('x2') }) -join ''
```

Lalu jalankan di DBeaver:

```sql
UPDATE "User" SET password_hash = '<hasil perintah di atas>'
WHERE email = 'superadmin@nesaciba.sch.id';
```

Data layer tidak menyimpan cache, jadi perubahan langsung berlaku pada request
berikutnya tanpa restart server.

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
- `src/lib/auth/token.test.ts`, `route-access.test.ts`, `login-throttle.test.ts`, `password-policy.test.ts`
- `src/server/service/statistics.test.ts`

Modul yang diuji sengaja dibuat murni (tanpa I/O, tanpa `"use server"`) agar
dapat diuji tanpa database. Bagian session, throttle login, dan keputusan akses
rute karena itu dipisah ke `src/lib/auth/token.ts`, `login-throttle.ts`, dan
`route-access.ts`, lalu diimpor oleh modul yang menyentuh `next/headers`.

## Migrasi Database

`npm run db:migrate` hanya menerapkan `src/lib/db/schema.sql`. Perubahan
schema berikutnya diletakkan di `src/lib/db/migrations/` dan **dijalankan
manual** lewat `psql` atau DBeaver — belum ada migration runner.

| Berkas | Isi | Status |
|---|---|---|
| `001_unique_constraints.sql` | UNIQUE untuk `NilaiSiswa`, `KehadiranSiswa`, `Kelas` | belum dijalankan |
| `002_api_siswa_route.sql` | Daftarkan `GET /api/siswa/[id]` di tabel `Route` + grant operator & guru | belum dijalankan |

> `002` **wajib** dijalankan pada instalasi yang sudah ada. `hasRouteAccess` kini
> fail-closed: path yang tidak terdaftar di `Route` berarti ditolak, bukan
> otomatis dibuka. Tanpa migrasi ini, `/api/siswa/[id]` akan menjawab 403 untuk
> semua role, termasuk guru.

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
| `docs/TEMUAN_Keamanan_Sesi_JWT.md` | Temuan keamanan sesi/RBAC + rencana perbaikannya |

## Catatan Batasan

- Password di-hash dengan SHA-256 **tanpa salt**. Ini batasan yang diketahui,
  bukan rekomendasi; migrasi ke bcrypt/argon2 dengan pola *upgrade-on-login*
  masih menjadi fase lanjutan. Kebijakan panjang (minimal 8 karakter) sudah
  ditegakkan, tetapi tidak memperbaiki hash yang lemah itu.
- Penghitung percobaan login disimpan di memori, jadi hilang saat server
  restart atau saat build ulang. Batasnya 5 percobaan per akun dan 20 per IP
  dalam jendela 15 menit. Penghitung per IP bergantung pada `X-Forwarded-For`,
  yang bisa dipalsukan tanpa reverse proxy; penghitung per akun tetap menjadi
  batas utama. Upaya login gagal tidak ditulis ke audit log, karena `persist()`
  menulis ulang seluruh tabel dan akan menambah beban yang justru ingin
  dibatasi.
- Logout menghapus cookie, tetapi tidak mencabut token yang sudah dibagikan.
  Mengganti `SESSION_SECRET` adalah satu-satunya cara memutus seluruh sesi.
  Akun yang dinonaktifkan langsung kehilangan akses pada request berikutnya.
- Sesi berlaku 7 hari tanpa perpanjangan otomatis. Angka ini adalah keputusan
  tingkat produk untuk perangkat bersama di sekolah, bukan konstanta teknis.
  Nilainya dibaca dari satu tempat, `SESSION_TTL_HARI` di
  `src/lib/auth/token.ts`.
- Jalur HTTP tanpa TLS (LAN sekolah) berarti cookie sesi dikirim dalam teks
  biasa. Atribut `httpOnly` tidak menolong untuk itu. Bila memungkinkan, sajikan
  aplikasi lewat HTTPS dan set `COOKIE_SECURE=true`.
- Pola persistensi menulis ulang seluruh tabel (`TRUNCATE ... CASCADE` lalu
  insert ulang dalam satu transaksi). Diterima untuk skala sekolah, tetapi
  perlu ditinjau bila volume data bertambah.


