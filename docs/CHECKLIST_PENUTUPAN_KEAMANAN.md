# Checklist Penutupan Keamanan Sesi

Pasangan dari `docs/TEMUAN_Keamanan_Sesi_JWT.md`. Dokumen itu mencatat temuan dan
analisisnya; dokumen ini mencatat apa yang masih harus dikerjakan sebelum
perubahan dianggap selesai.

## Status verifikasi terakhir

| Pemeriksaan | Hasil |
|---|---|
| `npm run typecheck` | bersih |
| `npm run lint` | bersih |
| `npm test` | 152/152 lulus |
| `git diff --check` | bersih |

Semua perubahan masih belum di-commit.

## Ringkasan

| # | Tugas | Prioritas | Dikerjakan oleh |
|---|---|---|---|
| 1 | Jalankan `002_api_siswa_route.sql` | Tinggi | Anda (DBeaver) atau saya |
| 2 | Ganti password 3 akun awal | Tinggi | Anda (UI) |
| 3 | Uji akses per role | Tinggi | Anda (browser) |
| 4 | Isi `SEED_*` di `.env` | Rendah | Anda atau saya |
| 5 | Commit | -- | Anda |

---

## 1. Migrasi `002` (wajib)

**Kenapa wajib.** `src/components/siswa/siswa-detail-dialog.tsx:78` memanggil
`/api/siswa/${siswaId}`. Dialog itu memuat nilai dan kehadiran ketika siswa diklik
di halaman `/siswa`. Selama path itu tidak terdaftar di tabel `Route`, endpoint
menjawab 403 dan popup-nya kosong. Ini bukan hanya urusan keamanan, ini fitur yang
berhenti bekerja.

Sudah diperiksa langsung di database pada 3 Oktober 2026: `Route` berisi
`route-6`, `7`, `9`, `10`, `11`, `13`, `14`, `21`, `22` untuk API, dan
`/api/siswa/[id]` tidak ada di antaranya.

**Cara menjalankan.** Buka `src/lib/db/migrations/002_api_siswa_route.sql` di
DBeaver lalu jalankan seluruh isinya. Berkas itu idempoten, jadi aman diulang.
Proyek ini belum punya migration runner.

**Verifikasi.** Query berikut harus mengembalikan tepat 2 baris:

```sql
SELECT rr.role_id, r.path, r.method
FROM "RoleRoute" rr
JOIN "Route" r ON r.id = rr.route_id
WHERE r.path = '/api/siswa/[id]';
```

Kalau 0 baris, migrasi belum masuk. Kalau lebih dari 2, periksa
`SELECT * FROM "Route" WHERE path = '/api/siswa/[id]'` -- kemungkinan besar ada
dua baris dengan path sama karena `route-23` pernah dibuat manual.

**Kalau perlu membatalkan.** Bagian ROLLBACK di akhir berkas migrasi. Menghapus
baris `Route` mengembalikan endpoint ke fail-closed (403), bukan ke fail-open.

**Jangan** memakai `db:reset` untuk keperluan ini. Perintah itu men-truncate 15
tabel dan menghapus seluruh data akademik.

---

## 2. Ganti password 3 akun awal

**Kenapa.** Operator dan guru masih memakai satu password yang sama, `admin`
(5 karakter). Password superadmin, `26adm0828`, juga tercatat di riwayat git dan
di `docs/TEMUAN_Keamanan_Sesi_JWT.md:647`. Siapa pun yang membaca repositori ini
bisa langsung login tanpa perlu menebak.

Batas 5 percobaan per 15 menit menahan tebakan, tetapi tidak mencegah password
yang benar dalam satu percobaan. Kebijakan 8-72 karakter hanya berlaku ketika
password disetel, sehingga password lama yang lemah tidak ikut melemah sendiri.

**Cara.** Login, lalu buka `/admin/users` dan klik ikon kunci pada baris yang
dituju. Dialognya tersedia untuk semua akun, termasuk akun sendiri.

| Email | Aksi |
|---|---|
| `operator@nesaciba.sch.id` | set password baru |
| `guru@nesaciba.sch.id` | set password baru, berbeda dari operator |
| `superadmin@nesaciba.sch.id` | set password baru |

Gunakan dialog ini, bukan `db:reset` dan bukan `UPDATE` manual, karena hasilnya
ikut tercatat di audit log.

**Kalau gagal 5 kali.** Akun terkunci 15 menit dan tidak ada tombol buka di UI.
Dua jalan keluar: tunggu, atau restart `npm run dev` -- penyimpanan throttle
hanya di memori sehingga restart langsung menghapus semua penghitung. Login yang
berhasil juga mereset penghitungnya.

**Kalau password superadmin hilang.** Resep pemulihan manual ada di `README.md`.

---

## 3. Uji akses per role

**Penting.** Halaman yang tidak diizinkan akan **redirect ke `/dashboard`**,
bukan menampilkan 403. Respons 403 hanya muncul pada endpoint API. Kalau
operator membuka `/admin/users` dan mendarat kembali di `/dashboard`, itu
berarti penolakan bekerja dengan benar.

Superadmin selalu lolos dari pemeriksaan rute karena bypass eksplisit. Karena
itu, menguji hanya dengan superadmin tidak akan pernah menemukan grant yang salah.

Jumlah rute yang diizinkan saat ini, dibaca langsung dari database: operator 15,
guru 3, superadmin semuanya (bypass).

| Aksi | Operator | Guru | Superadmin |
|---|---|---|---|
| `/dashboard` terbuka | ya | ya | ya |
| `/kelas` terbuka | ya | ya | ya |
| `/siswa` terbuka | ya | ya | ya |
| `/siswa` -> klik siswa, nilai & kehadiran muncul | ya | ya | ya |
| `/preview`, `/import` terbuka | ya | **tidak** | ya |
| `/akademik`, `/master` terbuka | ya | **tidak** | ya |
| `/audit` terbuka | ya | **tidak** | ya |
| `/admin/users` terbuka | **tidak** | **tidak** | ya |
| `/admin/roles`, `/admin/permissions` terbuka | **tidak** | **tidak** | ya |
| `/admin/menus`, `/admin/routes` terbuka | **tidak** | **tidak** | ya |

Kolom "tidak" berarti harus sampai ke `/dashboard`.

Baris keempat adalah satu-satunya yang benar-benar bergantung pada migrasi 002,
karena `route-23` belum ada di database ini. Baris lain hanya memverifikasi grant
yang sudah ada sebelumnya dan tidak berubah oleh pekerjaan ini.

Tiga rute guru sengaja sangat sempit. Kalau halaman `/kelas` atau `/dashboard`
mengarah balik ke `/dashboard` setelah migrasi, berarti grant-nya rusak -- bukan
memang dirancang begitu.

---

## 4. Mengisi `SEED_*` di `.env`

**Kapan dibutuhkan.** Hanya saat tabel `Role` kosong, yaitu `db:seed`,
`db:reset`, atau instalasi di komputer lain. Untuk database yang sekarang,
mengisi ulang `.env` tidak mengubah password yang sudah ada.

**Cara.** Perintah di bawah menghasilkan tiga password acak 22 karakter
(`base64url`, hanya `A-Z a-z 0-9 - _`) lalu menambahkannya ke `.env` **tanpa
mencetak nilainya**, sehingga tidak ada plaintext yang tersimpan di riwayat
percakapan. Baris `SEED_*` yang sudah ada akan diganti, bukan ditumpuk.

```powershell
$keys = @("SEED_SUPERADMIN_PASSWORD","SEED_OPERATOR_PASSWORD","SEED_GURU_PASSWORD")
$rng  = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$vals = @{}
foreach ($k in $keys) {
  $b = New-Object byte[] 16
  $rng.GetBytes($b)
  $vals[$k] = [Convert]::ToBase64String($b).TrimEnd('=').Replace('+','-').Replace('/','_')
}
$rng.Dispose()
$lain = Get-Content -LiteralPath .env | Where-Object { $_ -notmatch '^\s*SEED_' }
Set-Content -LiteralPath .env -Value ($lain + ($keys | ForEach-Object { "$_=$($vals[$_])" })) -Encoding UTF8
"3 variabel ditambahkan"
```

Jalankan dari folder proyek. Setelah itu buka `.env` sendiri untuk menyalin
nilainya. Perintah ini sudah diuji pada salinan `.env`: 9 baris menjadi 12, tiga
nilai berbeda, dan `SESSION_SECRET`, `DATABASE_URL`, serta `COOKIE_SECURE` tetap
utuh. Dijalankan dua kali, jumlah baris tetap 12.

Nilai acak ini hanya berlaku bila `db:seed`/`db:reset` dijalankan nanti. Kalau
tidak pernah dijalankan, `.env` boleh dibiarkan begitu saja.

---

## 5. Commit

Perubahan menyentuh 15 berkas. Periksa dulu:

```bash
git status
git diff --stat
git diff
```

Jangan ikut meng-commit berkas yang sudah berubah sebelum pekerjaan ini dimulai.
`docs/TODO.md` dan beberapa dokumen lain berstatus sudah berubah sejak awal dan
itu bukan bagian dari pekerjaan keamanan ini.

---

## 6. Yang ditunda ke capstone

| Temuan | Kenapa ditunda |
|---|---|
| K-01 | migrasi SHA-256 tanpa salt ke argon2 dengan upgrade-on-login |
| K-02 | `timingSafeEqual` dan jalur upgrade password |
| S-02, S-04 | `token_version` untuk mencabut sesi; butuh kolom baru |
| S-07 | pencatatan kegagalan verifikasi tanpa membocorkan isi token |
| A-04 | `serverActions.allowedOrigins`, bergantung ada/tidaknya reverse proxy |
| -- | reset password mandiri bagi guru dan operator |
| -- | penguatan audit log |
| -- | `password.test.ts`, menunggu algoritma hash baru |

Hash SHA-256 tanpa salt **sengaja** dibiarkan untuk tahap capstone, bukan
terlupa. Jangan ikut mengupahnya sekarang: memindahkan seluruh pengguna ke
algoritma baru tanpa jalur bertahap akan memaksa semua orang reset password
bersamaan.

## Catatan teknis yang mudah terlewat

- **Halaman menolak dengan redirect, API menolak dengan 403.** Keduanya benar,
  tapi gejalanya berbeda dan mudah tertukar saat pengujian.
- **Superadmin tidak pernah tersaring.** Semua grant yang salah tetap terlihat
  oleh operator dan guru.
- **UI admin tidak bisa menambah rute.** Tombol tambah di Manajemen Rute memang
  disengaja tidak ada, sehingga rute baru hanya bisa masuk lewat
  `seed-postgres.ts` **dan** migrasi SQL.
- **Prefiks `__Host-` belum dipasang.** Prefiks itu menuntut `secure: true`,
  sedangkan aplikasi masih mungkin berjalan di jaringan sekolah tanpa TLS.
- **Batas throttle per IP bisa dilewati** tanpa reverse proxy karena
  `X-Forwarded-For` bisa dipalsukan. Penghitung per akun tidak bergantung pada
  itu dan tetap menjadi gerbang utama.