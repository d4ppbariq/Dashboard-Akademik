# Dashboard Akademik Nesaciba

Dashboard akademik SMPN 1 Cibalong - aplikasi web untuk mengelola dan memantau data akademik: angkatan, kelas, siswa, nilai, dan kehadiran, lengkap dengan manajemen RBAC (user, role, permission, menu, rute) serta import data dari Excel.

Dibangun dengan **Next.js 16**, **React 19**, dan menyimpan data di **PostgreSQL**.

## Teknologi

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- PostgreSQL + driver `pg` (node-postgres)
- Tailwind CSS 4 / shadcn/ui
- Recharts (grafik), Zod (validasi), jose (sesi JWT via cookie)
- `@e965/xlsx` (import Excel)

Nama tampilan aplikasi di UI adalah **SINAR**. Antarmuka hanya memiliki tema terang.

## Arsitektur Data

Aplikasi memakai pola data layer di `src/lib/db/` yang membaca/menulis seluruh dataset ke **PostgreSQL** dalam satu transaksi (`getDb()` / `persist()` / `resetDb()`). Schema ada di `src/lib/db/schema.sql`.

## Persyaratan

- Node.js **20.12+** (disarankan Node.js 22 LTS)
- PostgreSQL **14+** (lingkungan pengembangan saat ini memakai 17.6)
- Git dan npm
- `psql` atau DBeaver/pgAdmin untuk membuat database

> Node.js 20.12+ diperlukan karena CLI database memakai `process.loadEnvFile`.

## Setup dari Nol untuk Collaborator

### 1. Clone dan install dependensi

```bash
git clone <URL_REPOSITORY>
cd "DASHBOARD AKADEMIK NESACIBA"
npm ci
```

Gunakan `npm ci` agar versi dependensi sama dengan `package-lock.json`.

### 2. Siapkan PostgreSQL

Pastikan service PostgreSQL sudah berjalan. Buat role dan database (ganti password contoh):

```bash
psql -U postgres -c "CREATE ROLE nesaciba LOGIN PASSWORD 'ganti-password-kuat';"
psql -U postgres -c "CREATE DATABASE nesaciba OWNER nesaciba;"
```

Di Windows, jika `psql` tidak ada di `PATH`, gunakan path instalasi PostgreSQL, misalnya:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE ROLE nesaciba LOGIN PASSWORD 'ganti-password-kuat';"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE nesaciba OWNER nesaciba;"
```

Alternatifnya, buat role dan database lewat DBeaver/pgAdmin.

### 3. Buat file `.env`

```powershell
Copy-Item .env.example .env
```

Atau di bash:

```bash
cp .env.example .env
```

Isi variabel wajib di `.env`:

```env
SESSION_SECRET=<random-64-hex>
COOKIE_SECURE=false
DATABASE_URL=postgres://nesaciba:ganti-password-kuat@localhost:5432/nesaciba
SEED_SUPERADMIN_PASSWORD=<password-akun-superadmin>
SEED_OPERATOR_PASSWORD=<password-akun-operator>
SEED_GURU_PASSWORD=<password-akun-guru>
```

Variabel opsional untuk pipeline ML:

```env
ML_DATABASE_URL=
POST_DATABASE_URL=
```

Catatan:

- `SESSION_SECRET` minimal 32 karakter. Generate dengan:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `COOKIE_SECURE` harus tepat `"true"` atau `"false"`. Gunakan `false` hanya untuk HTTP/LAN tanpa TLS.
- Jika password database mengandung karakter khusus, URL-encode nilainya di `DATABASE_URL`.
- `SEED_*` hanya dipakai saat seed pertama. Ganti isinya tidak mengubah password pada database yang sudah berisi data.
- Jangan commit `.env`.

### 4. Setup database

Untuk database baru yang masih kosong:

```bash
npm run db:setup
```

Perintah ini menjalankan:

1. `schema.sql` (schema dasar)
2. seed RBAC, akun awal, dan mapel default
3. seluruh migrasi di `src/lib/db/migrations/` secara berurutan

`db:setup` menolak berjalan jika tabel `"Role"` sudah ada, supaya tidak menimpa data yang sudah terisi.

Alternatif manual:

```bash
npm run db:migrate
npm run db:seed
psql -U nesaciba -d nesaciba -f src/lib/db/migrations/001_unique_constraints.sql
psql -U nesaciba -d nesaciba -f src/lib/db/migrations/002_api_siswa_route.sql
psql -U nesaciba -d nesaciba -f src/lib/db/migrations/003_prediksi.sql
psql -U nesaciba -d nesaciba -f src/lib/db/migrations/004_prediksi_route.sql
```

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka http://localhost:3000

## Akun Login Default

| Peran      | Email                        | Password                    |
|------------|------------------------------|-----------------------------|
| Superadmin | `superadmin@nesaciba.sch.id` | `SEED_SUPERADMIN_PASSWORD`  |
| Operator   | `operator@nesaciba.sch.id`   | `SEED_OPERATOR_PASSWORD`    |
| Guru       | `guru@nesaciba.sch.id`       | `SEED_GURU_PASSWORD`        |

> Password tidak disimpan di repositori dalam bentuk apa pun. Nilai diambil dari
> variabel `SEED_*` di `.env` lalu di-hash saat seed berjalan. Tiga nilai
> terpisah, bukan satu untuk semua, agar kelalaian pada satu akun tidak membuka
> akun lain.

## Mengganti Password Tanpa Merusak Data

Untuk instalasi yang sudah berjalan, **jangan** memakai `db:reset` atau
`db:seed` hanya demi mengganti password - perintah itu menulis ulang seluruh
tabel dan menghapus data akademik. Gunakan **Manajemen User -> ikon kunci** pada
baris akun yang dituju; dialognya tersedia untuk semua akun, termasuk akun Anda
sendiri.

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

| Perintah             | Fungsi                                                              |
|----------------------|---------------------------------------------------------------------|
| `npm run dev`        | Jalankan server development                                          |
| `npm run build`      | Build produksi                                                       |
| `npm run start`      | Jalankan server produksi                                             |
| `npm run lint`       | Jalankan ESLint                                                      |
| `npm run typecheck`  | Cek tipe tanpa emit                                                  |
| `npm run test`       | Jalankan unit test (`node --test`)                                   |
| `npm run db:setup`   | Schema + seed + semua migrasi (khusus database kosong)               |
| `npm run db:migrate` | Terapkan `schema.sql` saja                                           |
| `npm run db:seed`    | Isi ulang data awal; menimpa seluruh tabel                           |
| `npm run db:reset`   | `db:migrate` + `db:seed`; menimpa data, tanpa menjalankan migrasi     |

> Untuk database baru, gunakan `npm run db:setup`. `db:reset` tidak menjalankan
> file migrasi di `src/lib/db/migrations/`.

## Testing

Test menggunakan `node:test` + `tsx`, tanpa framework tambahan. Berkas
`*.test.ts` ditempatkan berdampingan dengan modul yang diuji:

- `src/lib/db/normalize.test.ts`, `src/lib/db/write.test.ts`
- `src/lib/import/validate.test.ts`, `mapel-resolver.test.ts`, `apply.test.ts`
- `src/lib/siswa-search.test.ts`
- `src/lib/auth/token.test.ts`, `route-access.test.ts`, `login-throttle.test.ts`, `password-policy.test.ts`
- `src/server/service/statistics.test.ts`
- `src/server/service/prediksi.test.ts`

Modul yang diuji sengaja dibuat murni (tanpa I/O, tanpa `"use server"`) agar
dapat diuji tanpa database. Bagian session, throttle login, dan keputusan akses
rute karena itu dipisah ke `src/lib/auth/token.ts`, `login-throttle.ts`, dan
`route-access.ts`, lalu diimpor oleh modul yang menyentuh `next/headers`.

## Migrasi Database

`npm run db:setup` sudah menjalankan seluruh migrasi untuk database baru.
Perubahan schema berikutnya diletakkan di `src/lib/db/migrations/` dan
**dijalankan manual** lewat `psql` atau DBeaver - belum ada migration runner
terpisah.

| Berkas | Isi | Status |
|---|---|---|
| `001_unique_constraints.sql` | UNIQUE untuk `NilaiSiswa`, `KehadiranSiswa`, `Kelas` | dijalankan otomatis oleh `db:setup`; manual untuk instalasi lama |
| `002_api_siswa_route.sql` | Daftarkan `GET /api/siswa/[id]` di tabel `Route` + grant operator & guru | dijalankan otomatis oleh `db:setup`; wajib untuk instalasi lama |
| `003_prediksi.sql` | Tabel `Prediksi` untuk hasil model ML | dijalankan otomatis oleh `db:setup`; wajib untuk fitur `/prediksi` |
| `004_prediksi_route.sql` | Daftarkan `/prediksi` di `Route` + `Menu` dan grant role | dijalankan otomatis oleh `db:setup`; idempoten |

Contoh menjalankan manual di PowerShell:

```powershell
psql $env:DATABASE_URL -f src/lib/db/migrations/001_unique_constraints.sql
psql $env:DATABASE_URL -f src/lib/db/migrations/002_api_siswa_route.sql
psql $env:DATABASE_URL -f src/lib/db/migrations/003_prediksi.sql
psql $env:DATABASE_URL -f src/lib/db/migrations/004_prediksi_route.sql
```

> `002` wajib dijalankan pada instalasi yang sudah ada. `hasRouteAccess`
> fail-closed: path yang tidak terdaftar di `Route` ditolak, bukan otomatis
> dibuka.
>
> `003` wajib agar halaman `/prediksi` tidak gagal karena tabel `"Prediksi"`
> belum ada.

Lihat `src/lib/db/migrations/README.md` untuk urutan, pemeriksaan duplikat, dan
rollback.

## Troubleshooting

### `database "nesaciba" does not exist`

Database belum dibuat. Ulangi langkah pembuatan database di PostgreSQL, lalu
sesuaikan `DATABASE_URL`.

### `SEED_SUPERADMIN_PASSWORD tidak diisi`

Isi ketiga variabel `SEED_*` di `.env` sebelum menjalankan `db:setup`,
`db:seed`, atau `db:reset`.

### `SESSION_SECRET terlalu pendek`

Gunakan minimal 32 karakter. Generate nilai baru dengan perintah di bagian
konfigurasi `.env`, lalu restart server.

### `relation "Prediksi" does not exist`

Jalankan migrasi `003_prediksi.sql`. Untuk database baru, gunakan
`npm run db:setup`.

### Port 3000 sudah dipakai

Hentikan proses `next dev` lain, atau jalankan dengan port berbeda:

```bash
npm run dev -- -p 3001
```

### Halaman protected mengembalikan 404 setelah dev server lama

Hentikan server, hapus cache dev, lalu jalankan ulang:

```powershell
Remove-Item -LiteralPath ".next\dev" -Recurse -Force
npm run dev
```

## Struktur

- `src/app` - halaman & route API (App Router)
- `src/components` - komponen UI
- `src/lib/db` - data layer + schema + seed
- `src/lib/import` - validasi, resolusi kolom mapel, dan penulisan hasil impor
- `src/lib/auth` - autentikasi & otorisasi
- `src/lib/master`, `src/lib/siswa`, `src/lib/admin` - action per modul
- `src/server/service` - logika statistik/dashboard
- `src/proxy.ts` - proteksi rute berbasis sesi (pengganti `middleware.ts` di Next 16)
- `src/scripts` - CLI utilitas database
- `docs` - PRD, roadmap ML, dan protokol evaluasi
- `*.test.ts` - unit test, berdampingan dengan modul yang diuji

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
