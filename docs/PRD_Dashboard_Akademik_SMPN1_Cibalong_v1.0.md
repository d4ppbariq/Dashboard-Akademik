# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Dashboard Akademik Nesaciba

**STATUS: REVISI — SELARAS DENGAN IMPLEMENTASI**

|||
|-|-|
|**Nama Produk**|Dashboard Akademik SMPN 1 Cibalong (Nesaciba)|
|**Versi Dokumen**|v1.0 · Revisi 2|
|**Disusun oleh**|Tim Pengembang (Pengembang)|
|**Untuk**|SMPN 1 Cibalong (Klien)|
|**Tanggal**|29 September 2026|
|**Dokumen Terkait**|PRD v0.3 — `PRD_Dashboard_Akademik_SMPN1_Cibalong_v0.3.md` (versi sebelumnya, sudah digantikan); `ML_Roadmap_Capstone.md`; `Protokol_Evaluasi_A1.md`; `README.md`; `src/lib/db/schema.sql`; `src/lib/db/migrations/README.md`|

---

# 1. Ringkasan Produk (Overview)

SMPN 1 Cibalong membutuhkan sistem terpusat untuk memantau performa akademik dan kehadiran siswa. Sebelumnya, untuk mengetahui mata pelajaran dengan nilai tertinggi maupun terendah serta merekap kehadiran (sakit, izin, tanpa keterangan) di setiap angkatan, kelas, maupun individu siswa, sekolah mengandalkan pencatatan yang tersebar dan proses rekap manual dari data nilai per semester.

Untuk menjawab kebutuhan tersebut, dibangun sistem web **Dashboard Akademik Nesaciba** berbasis **Next.js 16 (App Router/Turbopack), React 19, TypeScript, dan Tailwind CSS** dengan pustaka UI **shadcn/ui** serta grafik **Recharts**, yang menyimpan data di **PostgreSQL** (diakses langsung melalui driver `pg`, dikelola menggunakan DBeaver). Sistem dibangun dengan skema data berjenjang **Angkatan → Kelas → Siswa** dan modul **RBAC dinamis berbasis data**.

Sistem memungkinkan operator mengelola master data (angkatan, kelas, mata pelajaran), data siswa, nilai (6 semester × 13 mata pelajaran dalam katalog, ±11 yang berlaku per angkatan), dan kehadiran melalui **impor file Excel/CSV** per target angkatan+kelas serta **input manual (CRUD)** melalui aplikasi web. Guru dan operator dapat memantau performa akademik melalui rangkaian visualisasi interaktif (distribusi gender, kehadiran, tren nilai, rekap nilai, dan peringkat mata pelajaran) di level angkatan, level kelas, dan level individu siswa.

Perubahan penting versi ini dibandingkan PRD v0.3: (1) migrasi penyimpanan dari Supabase ke **PostgreSQL langsung**, (2) penyesuaian model data (skema tabel PascalCase, siswa tanpa kolom `status_aktif`, mapel memakai `kode` + `urutan`), (3) konsolidasi dashboard level kelas ke dalam Dashboard Utama dan penambahan halaman **Rekap Akademik** sebagai tabel perbandingan antar-kelas, (4) perubahan alur import menjadi format **satu sheet datar** dengan tombol proses untuk baris yang valid, (5) katalog mapel bertambah menjadi **13 mapel** — 11 mapel kurikulum aktif ditambah SBK dan Prakarya sebagai mapel kurikulum lama, (6) mapel tanpa data **dibedakan dari nilai 0** di seluruh perhitungan statistik dan grafik, (7) impor menjadi **all-or-nothing** (bukan lagi "proses baris valid"), ditambah **laporan kualitas kolom** dan resolusi otomatis kolom mapel, (8) **pencarian siswa** berdasarkan nama/NIS beserta mode cari lintas angkatan, (9) manajemen permission, menu, dan rute menjadi **read-only** (hanya ubah deskripsi), dan (10) dukungan **tema gelap dihapus** — aplikasi hanya menyediakan tema terang.

# 2. Tujuan & Sasaran (Goals)

* Memusatkan data nilai (6 semester) dan kehadiran siswa (sakit, izin, tanpa keterangan) SMPN 1 Cibalong dalam satu sistem berjenjang: Angkatan → Kelas → Siswa.
* Menyediakan visibilitas cepat terhadap mata pelajaran dengan nilai tertinggi dan terendah di setiap level data (angkatan, kelas, siswa).
* Menyediakan rekap perbandingan performa antar-kelas dalam satu angkatan (jumlah siswa, rata-rata nilai, sakit, izin, alpa, mapel terbaik, dan mapel terendah).
* Mengurangi proses rekap manual data nilai dan kehadiran melalui fitur impor massal (`.xlsx`, `.xls`, `.csv`) per target angkatan+kelas.
* Menyediakan mekanisme validasi data sebelum data disimpan permanen, guna meminimalkan kesalahan input (mis. salah ketik nilai, NIS duplikat).
* Menyediakan kontrol akses berbasis peran (RBAC) yang dapat dikonfigurasi melalui menu manajemen user, role, permission, menu, dan rute (tanpa mengubah kode aplikasi untuk penyesuaian konfigurasi umum).
* Menjaga akuntabilitas aktivitas sistem melalui pencatatan audit log (login, logout, dan seluruh operasi data).

# 3. Pengguna & Peran (Users & Roles)

* **Superadmin :** Mengelola konfigurasi inti sistem — manajemen pengguna (buat, nonaktifkan, reset password, hapus), role, permission, menu, dan rute. Memiliki akses penuh terhadap seluruh modul sistem. Sistem melindungi akun superadmin terakhir (tidak dapat dinonaktifkan/dihapus) serta akun yang sedang login. Daftar **permission, menu, dan rute bersifat read-only** (kode/path/method tidak dapat ditambah, diubah, atau dihapus dari UI); yang dapat diedit hanya kolom **deskripsi**, sedangkan penempatan permission/menu/rute ke role tetap dilakukan melalui dialog rincian role.
* **Operator :** Mengelola data akademik dan kehadiran — mengimpor data nilai dan kehadiran dari file Excel/CSV, melakukan CRUD data siswa, nilai, dan kehadiran secara manual di web, mengelola master data (Angkatan, Kelas, dan Mata Pelajaran), serta melakukan pembersihan data satu kelas ("clear kelas"). Terdapat satu akun operator pada versi awal.
* **Guru :** Peran read-only. Memantau performa akademik dan kehadiran melalui Dashboard Utama (level angkatan/kelas), Rekap Akademik (level kelas), dan Pencarian Siswa (level individu). Akun guru bersifat umum/bersama, tidak dibuat per nama guru.

# 4. Ruang Lingkup (Scope)

## 4.1 Termasuk (MVP)

* Autentikasi login (email + password) dengan sesi JWT di cookie `httpOnly` (masa berlaku 7 hari), hash password SHA-256, pembatasan percobaan login (maksimal 5 percobaan per akun dan 20 per alamat IP dalam jendela 15 menit), serta pencatatan login/logout ke audit log.
* RBAC yang dikonfigurasi berbasis data: manajemen **user** (buat, aktifkan/nonaktifkan, reset password, hapus), **role** (melihat rincian serta menetapkan permission, menu, dan rute yang diakses role), dan daftar **permission**, **menu**, serta **route** dalam mode **read-only** (hanya ubah deskripsi). Proteksi halaman dan aksi memakai `requireRoute`/`hasPermission` tanpa hardcode daftar hak akses pada komponen UI.
* Manajemen master data: **Angkatan** (tahun lulus; penambahan angkatan otomatis membuat 6 kelas default A–F), **Kelas** (satu huruf kapital, terikat pada angkatan), dan **Mata Pelajaran** (kode + nama, terurut; **13 mapel default** di-seed).
* Impor data nilai dan kehadiran dari file `.xlsx`/`.xls`/`.csv` (satu sheet datar, kolom NIS, Nama, Jenis Kelamin, Semester, kolom kehadiran opsional, lalu kolom per mapel **berkode**), lengkap dengan tabel preview, validasi per baris (penandaan baris error dan peringatan), tombol proses **all-or-nothing**, **laporan kualitas kolom**, serta unduh template Excel standar.
* CRUD manual data **siswa** (NIS, Nama, Jenis Kelamin) dengan filter Angkatan dan Kelas, **pencarian nama/NIS** dengan mode cari lintas angkatan, aksi hapus per siswa, dan aksi "clear kelas".
* CRUD manual **nilai** (per mapel per semester) dan **kehadiran** (sakit/izin/alpa per semester) melalui dialog pada detail siswa.
* **Dashboard Utama** (level angkatan & kelas): kartu ringkasan (Total Siswa, Sakit, Izin, Alpa) dan 5 grafik — distribusi gender (donut), rekapitulasi kehadiran per semester (grouped bar), tren nilai rata-rata 11 mapel per semester (line), rekap nilai semua mapel per semester (vertical bar), peringkat nilai mapel tertinggi–terendah per semester (horizontal bar); filter berjenjang Angkatan dan Kelas ("Semua Kelas" atau satu kelas).
* **Rekap Akademik** (level kelas): tabel perbandingan seluruh kelas dalam satu angkatan (Kelas, Siswa, Rata-rata Nilai, Sakit, Izin, Alpa, Terbaik, Terendah) plus kartu rincian rata-rata nilai per mapel per kelas.
* **Pencarian Siswa** (level individu): tabel daftar siswa per angkatan/kelas (NIS, Nama, Jenis Kelamin, Rata-rata Nilai, Total Alpa) dan **popup detail siswa** berisi identitas siswa, ringkasan kehadiran, serta dua tab (Nilai dan Kehadiran) berisi grafik dan tabel rincian yang dapat diedit operator.
* **Contoh / Pratinjau**: galeri jenis-jenis grafik yang tersedia, diisi data aktual angkatan terakhir sebagai referensi visual.
* **Audit log**: pencatatan dan halaman penelusuran aktivitas (CREATE, UPDATE, DELETE, IMPORT, LOGIN, LOGOUT) hingga 200 entri terakhir.
* Pustaka komponen UI reusable (button, card, dialog, sheet, select, input, label, badge, skeleton, tabs, switch, sonner) dengan tema terang saja.
* Data layer modular: `store` (baca seluruh dataset), `write` (persistensi), `normalize` (normalisasi baris PostgreSQL), `types`, `schema.sql`, action files per modul, dan service statistik terpisah.
* Unit test dengan `node:test` + `tsx` untuk modul murni: normalisasi baris, penulisan batch, validasi impor, resolusi kolom mapel, penulisan hasil impor, pencarian siswa, dan perhitungan statistik.
* Seed data awal: RBAC (3 role, 3 user awal, permission, menu, route, dan mapping) serta **13 mata pelajaran** default; kredensial 3 user awal dibaca dari environment (`SEED_SUPERADMIN_PASSWORD`, `SEED_OPERATOR_PASSWORD`, `SEED_GURU_PASSWORD`) sehingga tidak ada password yang tertulis di repositori; data akademik sengaja dibiarkan kosong dan diisi oleh operator melalui aplikasi.

## 4.2 Di Luar Lingkup Awal / Fase Lanjutan

Fitur grafik perbandingan nilai antar-angkatan dan fitur ekspor laporan (PDF/Excel) ditunda ke fase lanjutan (lihat Bab 11). Pembuatan role baru secara dinamis belum tersedia (role dibuat melalui seed; pengaturan hak dilakukan per role yang sudah ada). Fotografi profil siswa pada popup detail siswa belum diimplementasikan.

# 5. Asumsi & Batasan (Assumptions & Constraints)

* Sistem dibangun menggunakan Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, dan Recharts untuk front-end; data disimpan di **PostgreSQL langsung melalui driver `pg`** (bukan Supabase), dengan DBeaver sebagai alat administrasi database.
* Untuk MVP, sistem hanya dioptimalkan untuk tampilan desktop; dukungan responsif/mobile belum menjadi prioritas.
* [Asumsi] Jumlah siswa per kelas diperkirakan berkisar 28–32 orang; angka ini belum final dan dapat memengaruhi performansi tabel/grafik.
* Nilai per mata pelajaran per semester diasumsikan berupa satu nilai akhir (rentang 0–100), tanpa pemisahan komponen nilai harian, UTS, atau UAS.
* Jumlah semester tetap **6** untuk seluruh siswa.
* Fitur ekspor laporan (PDF/Excel) tidak disediakan pada versi MVP.
* [Asumsi] Keputusan lingkungan hosting produksi (server milik sekolah atau layanan cloud) ditunda; koneksi diatur melalui `DATABASE_URL` di `.env`, sehingga aplikasi platform-agnostic.
* Hanya terdapat satu akun operator aktif pada versi awal; akun guru bersifat umum dan dipakai bersama, bukan per individu guru.
* Struktur data mengikuti hierarki Angkatan → Kelas (satu huruf A–Z) → Siswa, dengan **13 mata pelajaran default** dalam katalog global: 11 mapel kurikulum aktif — PABP, PPKn, B. Indonesia, B. Inggris, Matematika, IPA, IPS, Seni Musik, PJOK, Informatika, dan B. Sunda — ditambah **SBK (Seni dan Budaya)** dan **PRK (Prakarya)** sebagai mapel kurikulum lama. Katalog bersifat global dan bukan milik angkatan tertentu; mapel yang tidak punya nilai pada angkatan terpilih otomatis disembunyikan dari seluruh grafik.
* Password di-hash dengan SHA-256 tanpa salt; sesi bertahan 7 hari (peningkatan ke skema hash yang lebih kuat menjadi pertimbangan fase lanjutan).
* Pola persistensi saat ini menulis ulang seluruh dataset dalam satu transaksi (TRUNCATE + insert ulang); pola ini diterima untuk skala data sekolah (±1.000 siswa) dan dicatat sebagai batasan yang perlu dipantau.

# 6. Kebutuhan Fungsional (Functional Requirements)

## 6.1 Superadmin — Manajemen Akses (RBAC)

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**RBAC-1**|Superadmin dapat membuat akun pengguna baru (nama, email unik, pilihan role, password awal 8-72 karakter dengan konfirmasi)|**Wajib**|
|**RBAC-2**|Superadmin dapat mengaktifkan/menonaktifkan akun pengguna; akun nonaktif ditolak pada saat login maupun pada setiap permintaan berikutnya; akun sendiri tidak dapat dinonaktifkan|**Wajib**|
|**RBAC-3**|Superadmin dapat mereset password akun pengguna lain|**Wajib**|
|**RBAC-4**|Superadmin dapat menghapus akun pengguna, kecuali akun superadmin terakhir dan akun yang sedang login|**Wajib**|
|**RBAC-5**|Superadmin dapat melihat daftar permission beserta jumlah role yang memakainya, mengubah **deskripsi** permission, serta menetapkan permission per role melalui dialog rincian role. Kode permission bersifat read-only (tambah/hapus tidak tersedia dari UI)|**Wajib**|
|**RBAC-6**|Superadmin dapat melihat daftar menu sidebar (nama, path, ikon, urutan, grup), mengubah **deskripsi**, serta menetapkan menu per role melalui dialog rincian role. Tambah/hapus menu dari UI tidak tersedia|**Wajib**|
|**RBAC-7**|Superadmin dapat melihat daftar rute (path + method HTTP), mengubah **deskripsi**, serta menetapkan rute per role melalui dialog rincian role. Tambah/hapus rute dari UI tidak tersedia; karena otorisasi bersifat fail-closed, rute baru hanya berlaku setelah ditambahkan pada seed **dan** melalui migrasi SQL, bukan dari UI|**Wajib**|
|**RBAC-8**|Sistem merender menu sidebar sesuai role yang login; halaman tanpa akses rute diarahkan ke `/dashboard`. Rute yang belum terdaftar pada tabel `Route` otomatis ditolak (fail-closed), kecuali role `role-superadmin` yang memiliki akses penuh tanpa perlu dicocokkan dengan daftar rute agar tidak terkunci saat konfigurasi belum lengkap|**Wajib**|
|**RBAC-9**|Sistem memproteksi aksi server (import, CRUD akademik, master, konfigurasi RBAC) dengan pemeriksaan permission sesuai role|**Wajib**|

## 6.2 Operator — Master Data

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**MSTR-1**|Operator dapat menambahkan Angkatan (tahun lulus 2000–2100); penambahan otomatis membuat 6 kelas default A–F; tahun tidak boleh duplikat|**Wajib**|
|**MSTR-2**|Operator dapat menghapus Angkatan beserta seluruh data turunannya (kelas, siswa, nilai, kehadiran)|**Wajib**|
|**MSTR-3**|Operator dapat menambah/menghapus Kelas (nama satu huruf kapital A–Z, unik per angkatan)|**Wajib**|
|**MSTR-4**|Operator dapat menambah/menghapus Mata Pelajaran (kode unik huruf/angka kapital tanpa spasi, maksimal 5 karakter, dan nama)|**Wajib**|
|**MSTR-5**|Daftar mata pelajaran tidak di-hardcode di kode dan dapat diubah pada runtime|**Penting**|

## 6.3 Operator — Import Data Excel

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**IMPT-1**|Operator dapat mengunggah file `.xlsx`, `.xls`, atau `.csv` berisi data nilai dan kehadiran untuk satu target Angkatan + Kelas|**Wajib**|
|**IMPT-2**|Format file berupa satu sheet datar dengan kolom struktural: NIS, Nama, Jenis Kelamin (L/P), dan Semester (1–6), lalu kolom per mata pelajaran yang **diidentifikasi dengan `kode` mapel** (contoh `MTK`, `BIN`). Kolom kehadiran (Sakit, Izin, Tanpa Keterangan) bersifat **opsional** dan dideteksi otomatis dari isi file|**Wajib**|
|**IMPT-3**|Sistem menampilkan tabel preview (10 baris pertama) isi file sebelum data diproses, **tanpa menunggu** operator memilih angkatan dan kelas terlebih dahulu|**Wajib**|
|**IMPT-4**|Sistem memvalidasi setiap baris dan menampilkan daftar error per baris. Error: NIS kosong, nama kosong, JK bukan L/P, semester di luar 1–6, nilai di luar 0–100, duplikat NIS pada semester yang sama di dalam satu file, dan NIS yang sudah terdaftar **di kelas lain** (perpindahan kelas harus lewat menu Siswa). Peringatan (bukan error): nilai non-numerik dilewati, kolom kehadiran yang tidak ada diisi 0, dan kolom yang tidak dikenali sebagai mapel diabaikan dengan saran nama terdekat|**Wajib**|
|**IMPT-5**|**All-or-nothing.** Bila terdapat satu saja baris cacat, **tidak ada baris yang ditulis** ke database dan angka "siap diproses" menjadi 0. Bila seluruh baris valid, operator menekan tombol "Proses N Baris" untuk menyimpan semuanya|**Wajib**|
|**IMPT-6**|Impor bersifat *upsert*: siswa baru dibuat bila NIS belum ada; nilai dan kehadiran semester terkait diperbarui bila sudah ada. Bila file tidak memuat section kehadiran, data kehadiran yang sudah ada **tidak** ditimpa|**Wajib**|
|**IMPT-7**|Operator dapat mengunduh template Excel standar (`/api/import/template`) yang memakai kolom mapel **berkode** sebagai acuan pengisian|**Wajib**|
|**IMPT-8**|Setiap proses impor dicatat ke audit log (aksi IMPORT) dan halaman terkait di-refresh|**Wajib**|
|**IMPT-9**|Halaman impor hanya dapat diakses dan dieksekusi oleh pengguna dengan permission `import.execute`|**Wajib**|
|**IMPT-10**|Sistem menampilkan **laporan kualitas kolom**: daftar kolom mapel yang dikenali, jumlah baris terisi per kolom, serta peringatan bila ada kolom mapel yang **tidak terisi sama sekali** (indikasi nama kolom salah ketik)|**Wajib**|
|**IMPT-11**|Sistem me-*resolve* kolom mapel secara berjenjang dari **kode**, nama persis, alias/penamaan umum, hingga pencocokan kemiripan; kolom yang gagal dikenali dilaporkan sebagai peringatan beserta saran, bukan diam-diam diabaikan|**Wajib**|

## 6.4 Operator — Kelola Data Akademik (CRUD Manual)

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**AKAD-1**|Operator dapat melihat daftar siswa berdasarkan filter Angkatan dan Kelas (kolom NIS, Nama, JK, Rata-rata Nilai, Total Alpa)|**Wajib**|
|**AKAD-2**|Operator dapat menambah data siswa baru (NIS unik, Nama, Jenis Kelamin)|**Wajib**|
|**AKAD-3**|Operator dapat mengubah dan menghapus data siswa; penghapusan ikut menghapus nilai dan kehadiran siswa terkait|**Wajib**|
|**AKAD-4**|Operator dapat menghapus seluruh siswa dalam satu kelas sekaligus ("clear kelas")|**Wajib**|
|**AKAD-5**|Operator dapat menambah, mengubah, dan menghapus nilai siswa per mata pelajaran per semester (nilai 0–100) melalui popup detail siswa|**Wajib**|
|**AKAD-6**|Operator dapat menambah/mengubah (upsert) kehadiran siswa per semester (sakit, izin, tanpa keterangan ≥ 0) melalui popup detail siswa|**Wajib**|
|**AKAD-7**|Seluruh operasi CRUD dicatat ke audit log|**Wajib**|

## 6.5 Sistem — Audit Log

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**LOG-1**|Sistem mencatat log untuk seluruh aksi penting (CREATE, UPDATE, DELETE, IMPORT, LOGIN, LOGOUT) beserta pengguna, entitas, detail, dan waktu|**Wajib**|
|**LOG-2**|Halaman Audit Log menampilkan riwayat terbaru (hingga 200 entri) dengan sortasi waktu terbalik|**Wajib**|
|**LOG-3**|Log tidak terhapus ketika user dihapus/nonaktif (user_id bukan foreign key)|**Wajib**|

## 6.6 Guru & Operator — Dashboard Utama (Level Angkatan & Kelas)

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**DASH-1**|Pengguna dapat memilih Angkatan (tahun lulus) melalui filter segmented|**Wajib**|
|**DASH-2**|Pengguna dapat memilih cakupan "Semua Kelas" atau satu Kelas tertentu|**Wajib**|
|**DASH-3**|Sistem menampilkan ringkasan kartu: Total Siswa, Total Sakit, Total Izin, Total Alpa untuk cakupan terpilih|**Wajib**|
|**DASH-4**|Sistem menampilkan grafik donut distribusi gender (Laki-laki/Perempuan)|**Wajib**|
|**DASH-5**|Sistem menampilkan grafik grouped bar rekapitulasi kehadiran (Sakit/Izin/Alpa) per semester (1–6)|**Wajib**|
|**DASH-6**|Sistem menampilkan grafik line chart tren nilai rata-rata untuk semua mapel selama 6 semester|**Wajib**|
|**DASH-7**|Sistem menampilkan grafik vertical bar rekap nilai rata-rata seluruh mapel, dengan filter semester|**Wajib**|
|**DASH-8**|Sistem menampilkan grafik horizontal bar peringkat nilai mapel tertinggi–terendah, dengan filter semester|**Wajib**|
|**DASH-9**|Ketika kelas tertentu dipilih, kelima grafik dikalkulasi khusus dari data kelas tersebut (berikut kartu ringkasan kelas)|**Wajib**|
|**DASH-10**|Mapel yang **tidak punya nilai sama sekali** pada cakupan terpilih **tidak muncul** di seluruh grafik. Mapel yang punya nilai tetap dihitung dari baris yang ada; nilai 0 adalah nilai asli dan tidak boleh diperlakukan sebagai "tidak ada data"|**Wajib**|

## 6.7 Guru & Operator — Rekap Akademik (Level Kelas)

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**KLS-1**|Pengguna dapat memilih Angkatan serta semester (1–6)|**Wajib**|
|**KLS-2**|Sistem menampilkan tabel perbandingan seluruh kelas pada angkatan: Kelas, Siswa, Rata-rata Nilai, Sakit, Izin, Alpa, Mapel Terbaik, dan Mapel Terendah|**Wajib**|
|**KLS-3**|Sistem menampilkan kartu rincian rata-rata nilai per mapel untuk masing-masing kelas|**Wajib**|

## 6.8 Guru & Operator — Pencarian / Detail Siswa

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**SIS-1**|Pengguna dapat menjelajahi siswa berdasarkan filter Angkatan dan Kelas, atau mengaktifkan **mode cari di seluruh angkatan** (filter angkatan dan kelas diabaikan)|**Wajib**|
|**SIS-2**|Tabel daftar siswa menampilkan NIS, Nama, Jenis Kelamin, Rata-rata Nilai, dan Total Alpa (dengan penanda warna sesuai rentang nilai)|**Wajib**|
|**SIS-3**|Popup detail siswa menampilkan identitas siswa (NIS, Nama, Kelas, Angkatan, Jenis Kelamin) dan ringkasan kehadiran (Sakit/Izin/Alpa)|**Wajib**|
|**SIS-4**|Tab "Nilai" menampilkan grafik vertical bar nilai asli seluruh mapel pada semester terpilih, tabel peringkat per semester, dan CRUD nilai per baris|**Wajib**|
|**SIS-5**|Tab "Kehadiran" menampilkan grafik grouped bar riwayat kehadiran 6 semester dan tabel rincian kehadiran per semester|**Wajib**|
|**SIS-6**|Operator dapat menambah/mengubah/menghapus nilai dan kehadiran langsung dari popup detail siswa|**Wajib**|
|**SIS-7**|Data popup detail diambil secara real-time melalui endpoint API `/api/siswa/:id`|**Wajib**|
|**SIS-8**|Pengguna dapat menyaring daftar siswa dengan kotak pencarian: **nama** dicocokkan dengan `contains` (tanpa mengingat urutan ejaan), **NIS** dicocokkan dengan `prefix` (diketik dari digit awal agar NIS yang tidak relevan tidak muncul). Kueri kosong tidak menyaring apa pun. Pencarian dijalankan di sisi server dan dapat bekerja lintas angkatan saat mode cari semua angkatan aktif|**Wajib**|

## 6.9 Guru & Operator — Contoh / Pratinjau

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**PREV-1**|Halaman menampilkan galeri 5 jenis grafik (donut, kehadiran grouped bar, tren line, rekap vertical bar, peringkat horizontal bar) yang diisi data aktual angkatan terakhir|**Penting**|

# 7. Alur Pengguna Utama (Key User Flows)

## 7.1 Operator Mengimpor Data Nilai dan Kehadiran

1. Operator membuka menu **Import Data Excel**.
2. (Opsional) Operator mengunduh template Excel standar sebagai acuan format kolom (kolom mapel memakai `kode`).
3. Operator mengunggah file `.xlsx`/`.xls`/`.csv` sesuai format kolom. Section kehadiran bersifat opsional — bila file tidak punya kolom Sakit, Izin, Tanpa Keterangan, data kehadiran yang sudah ada tidak disentuh.
4. Sistem membaca file (di sisi klien dengan `@e965/xlsx`) dan langsung menampilkan tabel preview 10 baris pertama serta **laporan kualitas kolom**, tanpa menunggu pilihan angkatan dan kelas.
5. Operator memilih Angkatan dan Kelas tujuan, lalu sistem memvalidasi setiap baris melalui aksi server.
6. Baris bermasalah ditampilkan di tabel error (Baris + Keterangan); bagian atas menampilkan ringkasan "N diterima · M ditolak". Karena sifatnya **all-or-nothing**, bila M > 0 maka N = 0 dan tidak ada data yang akan ditulis.
7. Bila seluruh baris valid (M = 0), tombol **Proses N Baris** aktif; Operator menekannya untuk menyimpan (siswa dibuat bila baru, nilai/kehadiran di-upsert).
8. Sistem mencatat aktivitas impor ke audit log dan menyegarkan halaman dashboard/rekap/siswa.

## 7.2 Operator Mengelola Data Satu Siswa (CRUD Manual)

1. Operator membuka menu **Kelola Data Siswa**.
2. Operator memfilter data berdasarkan Angkatan dan Kelas, atau menyaring dengan kotak pencarian nama/NIS. Mode **Cari di semua angkatan** mengabaikan filter angkatan dan kelas sehingga operator dapat menemukan siswa tanpa mengetahui kelasnya.
3. Untuk menambah/mengubah/menghapus siswa, Operator menggunakan form dialog tambah, edit, atau tombol hapus pada baris siswa; menghapus juga membersihkan nilai dan kehadiran terkait.
4. Untuk memperbaiki nilai/kehadiran, Operator membuka **popup detail siswa**, memilih tab Nilai atau Kehadiran, lalu menambah/mengubah baris via dialog.
5. Sistem menyimpan perubahan dan mencatatnya ke audit log.

## 7.3 Guru Menelusuri Performa dari Angkatan ke Individu Siswa

1. Guru login dan diarahkan ke halaman default **Dashboard Utama**.
2. Guru memilih angkatan dan (opsional) kelas; lalu membaca grafik peringkat mapel untuk mengidentifikasi mapel dengan nilai terendah.
3. Guru membuka menu **Rekap Akademik** untuk membandingkan performa antar-kelas (rata-rata, kehadiran, mapel terbaik/terendah).
4. Guru membuka menu **Pencarian Siswa**, menyaring dengan kotak pencarian nama/NIS (atau memakai mode cari di semua angkatan bila belum tahu kelas siswa), lalu menekan tombol detail pada baris siswa.
5. Sistem menampilkan popup detail siswa berisi grafik dan tabel nilai/kehadiran selama 1–6 semester.

## 7.4 Superadmin Mengatur Hak Akses Role

1. Superadmin membuka **Manajemen User** untuk membuat akun baru (atau menonaktifkan/mereset password/hapus akun).
2. Superadmin membuka **Manajemen Role** dan dialog rincian role untuk menandai permission, menu, dan rute yang boleh diakses role tersebut.
3. Superadmin dapat menambah permission baru di **Manajemen Permission**, menu di **Manajemen Menu**, dan rute di **Manajemen Rute**.
4. Pengguna dengan role terkait login dan sistem merender menu sidebar sesuai konfigurasi; akses halaman dicek berdasarkan rute yang ditetapkan.

# 8. Model Data (High-Level)

Skema disimpan di `src/lib/db/schema.sql` (PostgreSQL). Seluruh primary key memakai `TEXT` karena sistem menghasilkan ID string via `newId()` (mis. `s-<time36>-<rand>`) atau format terstruktur (mis. `kelas.id = "<angkatan_id>-<huruf>"`, `mapel.id = "mp-<kode>"`). Sebagian besar foreign key akademik memakai `ON DELETE CASCADE` agar operasi hapus berjenjang manual (deleteSiswa, deleteMapel, deleteKelas, deleteAngkatan, clearKelas) konsisten di sisi database.

|**Entitas (tabel)**|**Field Utama**|**Keterangan**|
|-|-|-|
|**Role**|id, nama_role, deskripsi, is_system|Superadmin, Operator, Guru, dan role lain; `is_system` menandai role bawaan|
|**User**|id, nama, email (unik), password_hash, role_id, status_aktif|Akun login; hash SHA-256; `status_aktif` = AKTIF/NONAKTIF|
|**Permission**|id, kode_permission, deskripsi|Contoh: `nilai.write`, `nilai.read`, `rbac.manage`|
|**Menu**|id, nama_menu, path, icon, urutan, grup|Daftar menu sidebar; dikelompokkan per `grup` (Analitik/Data/Sistem)|
|**Route**|id, path, method (GET/POST/PUT/PATCH/DELETE), deskripsi|Daftar rute aplikasi yang dapat diakses per role; path yang belum terdaftar ditolak (fail-closed)|
|**RolePermission**|role_id, permission_id|Relasi role–permission|
|**RoleMenu**|role_id, menu_id|Relasi role–menu|
|**RoleRoute**|role_id, route_id|Relasi role–rute|
|**Angkatan**|id, tahun_lulus (2000–2100)|Merepresentasikan tahun lulus, mis. 2026|
|**Kelas**|id, angkatan_id, nama_kelas|Satu huruf (A–Z), terikat pada satu angkatan|
|**Siswa**|id, kelas_id, nis (unik), nama, jenis_kelamin (L/P)|Data induk/profil siswa; tanpa kolom `status_aktif`|
|**MataPelajaran**|id, nama_mapel, kode (unik), urutan|13 mapel default di-seed (11 aktif + SBK/PRK kurikulum lama); katalog global, urutan untuk pengurutan|
|**NilaiSiswa**|id, siswa_id, mata_pelajaran_id, semester (1–6), nilai (0–100)|Nilai akhir per mapel per semester|
|**KehadiranSiswa**|id, siswa_id, semester (1–6), sakit, izin, tanpa_keterangan|Rekap kehadiran per semester (semua ≥ 0)|
|**AuditLog**|id, user_id (tanpa FK), user_nama, aksi (enum), entitas, detail, waktu|Pencatatan aktivitas; user_id sengaja tanpa FK agar log tetap aman bila user dihapus|

**Pola akses data (penting untuk memahami perilaku saat ini):** action files (mis. `src/lib/siswa/actions.ts`) memuat seluruh dataset melalui `getDb()` (query semua tabel), memutasi dataset dalam memori, lalu menyimpannya kembali melalui `persist()` yang menuliskan ulang **seluruh tabel** dalam satu transaksi (`TRUNCATE ... CASCADE` lalu insert ulang dalam urutan parent → child, dipecah menjadi beberapa statement bila jumlah parameter mendekati batas protokol PostgreSQL). `resetDb()` memuat ulang seed awal. Baris hasil query dinormalisasi di `src/lib/db/normalize.ts` (mis. kolom waktu PostgreSQL menjadi string ISO) agar bentuk datanya sama dengan yang dipakai modul lain.

Proteksi rute Berlapis berada di `src/proxy.ts` (menggantikan `middleware.ts` pada Next.js 16): ia hanya memeriksa keberadaan sesi yang valid dan mengarahkan ke `/login`, sedangkan **otorisasi per role** dilakukan di dalam halaman dan server action melalui `requireRoute` / `hasPermission`.

Action files terbagi per modul: `src/lib/auth`, `src/lib/admin`, `src/lib/master`, `src/lib/siswa/actions.ts` (siswa), `src/lib/siswa/academic-actions.ts` (nilai & kehadiran), dan `src/lib/import` (validasi, resolusi kolom mapel, penulisan hasil impor). `buildSeed()` (pembangkit data demo dengan generator acak) masih tersedia di `src/lib/db/seed.ts` namun tidak terpakai pada jalur produksi — seed aktif berada di `src/lib/db/seed-postgres.ts` yang dengan sengaja mengosongkan seluruh data akademik.

# 9. Kebutuhan Non-Fungsional (Non-Functional Requirements)

* **Keamanan & Hak Akses :** Sesi login berupa JWT di cookie `httpOnly` (masa berlaku 7 hari), kunci dari `SESSION_SECRET` (minimal 32 karakter, diverifikasi saat kunci pertama kali dipakai). Lapisan pertama ada di `src/proxy.ts` (pemeriksaan sesi untuk seluruh rute); lapisan kedua berupa halaman yang dilindungi `requireRoute` (berbasis rute per role, fail-closed dengan bypass `role-superadmin`) dan server action yang diperiksa `hasPermission` (berbasis permission per role). Akun nonaktif ditolak saat login **dan pada setiap permintaan berikutnya**. Login dibatasi 5 percobaan per akun dan 20 per alamat IP dalam jendela 15 menit. Password baru (buat akun dan reset) memakai kebijakan 8–72 karakter dengan konfirmasi. Superadmin terakhir dan akun yang sedang login tidak dapat dihapus/dinonaktifkan.
* **Integritas Data :** Validasi input manual memakai **Zod** (nis, nama, jenis kelamin, semester 1–6, nilai 0–100, kehadiran ≥ 0, kode mapel, email, dsb.) sebelum `persist()`. Constraint UNIQUE/CHECK di PostgreSQL menguatkan validasi tersebut, dan terbagi menjadi: (a) yang menyatu di `schema.sql` — `user.email`, `siswa.nis`, `mata_pelajaran.kode`, `semester` 1–6, `nilai` 0–100, `tahun_lulus` 2000–2100; (b) yang ada di migrasi terpisah `src/lib/db/migrations/001_unique_constraints.sql` — UNIQUE untuk `NilaiSiswa(siswa_id, mata_pelajaran_id, semester)`, `KehadiranSiswa(siswa_id, semester)`, dan `Kelas(angkatan_id, nama_kelas)`. Migrasi (b) **dijalankan manual** dan belum tentu sudah diterapkan pada seluruh lingkungan.
* **Keamanan Impor :** Impor bersifat all-or-nothing, dan setiap baris divalidasi sebelum penulisan. Validasi dan penulisan berbagi satu sumber kebenaran (`src/lib/import/validate.ts` dipakai oleh aksi server maupun oleh penulis hasil impor), sehingga apa yang lolos di preview dijamin sama dengan yang masuk ke database.
* **Konsistensi Statistik :** Mapel tanpa data dibedakan dari nilai 0. Fungsi `mapelDenganNilai()` di `src/server/service/statistics.ts` menentukan mapel yang benar-benar punya nilai untuk sekumpulan siswa; mapel lain tidak dihitung dan tidak ditampilkan. Aturan ini menjadi kontrak sistem yang juga dipakai oleh Tahap machine learning (lihat `Protokol_Evaluasi_A1.md` §4).
* **Keberlanjutan Model :** Aplikasi tidak menjalankan machine learning; tampilan prediksi hanya **membaca** hasil dari tabel `Prediksi`. Pembaruan model terjadi di luar aplikasi (pipeline Python dengan kredensial DB read-only) dan diterbitkan via `publish_b2.py` + `post.mjs` — diatur di `ML_Roadmap_Capstone.md` §8.3 dan `Protokol_Evaluasi_A1.md` §11.
* **Akuntabilitas Data :** Setiap perubahan data oleh Operator/Superadmin serta login/logout tercatat dalam audit log (`user_id`, `user_nama`, aksi, entitas, detail, waktu).
* **Modularitas Kode :** Pemisahan lapisan pada data layer (`store`, `write`, `normalize`, `types`, `schema.sql`), action files per modul, dan `server/service/statistics.ts` untuk perhitungan statistik dashboard. Modul yang murni (tanpa I/O) diuji dengan `node:test`.
* **Konsistensi UI :** Komponen UI dibangun sebagai komponen reusable (shadcn/ui: button, card, dialog, sheet, select, input, label, badge, skeleton, tabs, switch, sonner) dan tidak di-hardcode pada halaman, agar konsisten di seluruh level dashboard. Hanya tersedia tema terang.
* **Tampilan :** Untuk versi MVP, antarmuka dioptimalkan untuk penggunaan desktop; dukungan tampilan responsif/mobile belum menjadi prioritas.
* **Performa :** Pola baca-tulis seluruh dataset dalam satu operasi diterima untuk skala sekolah (±1.000 siswa); perlu ditinjau ulang apabila volume data tumbuh signifikan (mis. banyak angkatan sekaligus). Penulisan dipecah per chunk agar tidak melampaui batas parameter protokol PostgreSQL, dan pembuatan ID dipercepat dengan alokator bulk (`src/lib/db/id.ts`).

# 10. Integrasi Pihak Ketiga

|**Layanan / Pustaka**|**Fungsi**|**Catatan**|
|-|-|-|
|**PostgreSQL (langsung via `pg`)**|Basis data utama aplikasi|Koneksi melalui `DATABASE_URL`; bukan Supabase seperti rencana awal|
|**DBeaver**|Alat administrasi/manajemen database|Digunakan oleh tim pengembang untuk mengelola database, bukan bagian dari aplikasi end-user|
|**Next.js 16 + React 19 + Tailwind CSS**|Framework front-end & back-end, styling|App Router + Turbopack; Tailwind v4 via `@tailwindcss/postcss`|
|**shadcn/ui + Radix + `tailwind-merge`/CVA**|Pustaka komponen UI|Komponen reusable; **hanya tema terang** (dukungan tema gelap telah dihapus)|
|**Recharts**|Visualisasi grafik dashboard|Donut, grouped bar, line, vertical bar, horizontal bar|
|**jose**|Penandatanganan/verifikasi sesi JWT|Cookie `httpOnly` masa berlaku 7 hari|
|**Zod**|Validasi skema input|Form login, CRUD, import, konfigurasi RBAC|
|**`@e965/xlsx`**|Membaca file Excel/CSV & membuat template|Parsing berjalan di sisi klien, validasi/persist di sisi server; template memakai kolom mapel berkode|
|**`pg` + `src/proxy.ts`**|Koneksi PostgreSQL dan proteksi rute berlapis|`proxy.ts` menggantikan `middleware.ts` pada Next.js 16; memeriksa sesi, bukan otorisasi per role|

# 11. Fitur Usulan / Fase Lanjutan

* **Grafik Perbandingan Antar-Angkatan.** Menampilkan perbandingan tren nilai dan kehadiran antara lebih dari satu angkatan sekaligus. Ditunda karena data historis lintas-angkatan masih terbatas.
* **Fitur Ekspor Laporan.** Kemampuan mengekspor data nilai/kehadiran (mis. ke PDF atau Excel) untuk kebutuhan pelaporan formal; belum menjadi prioritas pada rilis awal.
* **Pembuatan Role Kustom secara Dinamis.** Saat ini role dibuat melalui seed; kemampuan membuat role baru dari UI menjadi bagian manajemen hak akses yang lebih lengkap.
* **Mode impor sebagian (best-effort).** Saat ini impor bersifat all-or-nothing. Opsi "proses baris valid, abaikan baris error" pernah ada namun diganti all-or-nothing karena laporan hasil impor yang hanya terisi sebagian menyesatkan. Bila dibutuhkan, harus dirancang ulang sebagai opsi eksplisit dengan peringatan tegas.
* **Peningkatan Keamanan Password.** Migrasi dari SHA-256 tanpa salt ke skema hash kuat (mis. bcrypt/argon2) dan mekanisme lupa/reset password mandiri bagi end user.
* **Migration Runner.** Saat ini migrasi SQL dijalankan manual lewat `psql` atau DBeaver. Menyediakan migration runner dengan penomoran dan pencatatan riwayat migrasi akan menyederhanakan penerapan constraint dan penambahan tabel baru di masa depan.
* **Dukungan Tema Gelap.** Terapkan kembali mode gelap beserta pengalih tema, apabila operator yang bekerja di ruangan minim cahaya membutuhkannya.
* **Pencarian Siswa yang Lebih Cerdas.** Pencarian saat ini mencocokkan nama dengan `contains` dan NIS dengan `prefix`. Pencarian fuzzy pada nama (menoleransi salah ketik) dapat ditambahkan bila keluhan operator sering terjadi.
* **Tab Proyeksi pada Detail Siswa.** Menampilkan prediksi nilai semester berikutnya (per mapel + interval keyakinan) pada popup detail siswa, membaca hanya dari tabel `Prediksi` melalui `getDb()`. Akses dibatasi permission `prediksi.read` (default diberikan ke role Guru dan Operator; dapat diubah Superadmin). Halaman khusus "Proyeksi" di sidebar dan agregat lintas siswa ditunda sebagai fase lanjutan — lihat `ML_Roadmap_Capstone.md` §8.3.

# 12. Pertanyaan Terbuka / TBD

* Jumlah pasti siswa per kelas (saat ini diasumsikan 28–32 siswa) belum dikonfirmasi.
* Keputusan lingkungan hosting produksi — server milik sekolah atau layanan cloud — belum diputuskan.
* Kebutuhan dan format ekspor laporan (jika suatu saat diperlukan) belum dibahas.
* Detail kebijakan retensi/penyimpanan audit log (berapa lama data log disimpan) belum dibahas.
* Mekanisme reset password mandiri / lupa kata sandi untuk akun Operator/Guru (saat ini reset hanya dapat dilakukan Superadmin) belum dibahas.
* Kebutuhan foto profil siswa pada popup detail siswa disebutkan bersifat opsional; belum dipastikan apakah akan diimplementasikan.
* Kepastian apakah pembuatan role baru dari UI akan menjadi kebutuhan (babak lanjutan).
* Kebijakan pemakaian `buildSeed()` (data demo) di lingkungan pengembangan/peragaan masih perlu disepakati, karena sekarang tidak terpakai pada jalur produksi.

# 13. Glosarium

* **Angkatan :** Kelompok siswa berdasarkan tahun kelulusan, mis. Angkatan 2026.
* **RBAC (Role-Based Access Control) :** Mekanisme kontrol akses berdasarkan peran pengguna (role), mencakup permission, menu, dan rute.
* **NIS :** Nomor Induk Siswa, identitas unik setiap siswa.
* **Alpa :** Kategori ketidakhadiran siswa tanpa keterangan.
* **CRUD :** Singkatan dari Create, Read, Update, Delete — operasi dasar pengelolaan data.
* **Preview / Pratinjau :** Tampilan hasil unggahan file sebelum data diproses, sekaligus nama halaman galeri contoh grafik.
* **Clear Kelas :** Aksi menghapus seluruh siswa (beserta nilai dan kehadiran) dalam satu kelas sekaligus.
* **Rekap Akademik :** Halaman tabel perbandingan performa seluruh kelas dalam satu angkatan.
* **Upsert :** Perilaku impor yang menambah data baru bila belum ada dan memperbarui data yang sudah ada.
* **All-or-nothing :** Sifat impor yang menolak menulis apa pun bila ditemukan satu saja baris cacat, alih-alih menyimpan baris yang valid.
* **Laporan Kualitas Kolom :** Ringkasan cakupan kolom mapel pada file impor — kolom mana yang dikenali, berapa baris yang terisi, dan kolom mana yang tidak terisi sama sekali.
* **SINAR :** Nama merek tampilan aplikasi (Sistem Nilai, Analisis, Rekap) yang ditampilkan pada halaman login dan sidebar.

---

*Dokumen ini adalah revisi yang diselaraskan dengan kondisi implementasi per 29 September 2026 dan dapat berubah seiring pembahasan lebih lanjut dengan klien. Versi sebelumnya (v0.3) tersedia pada file `PRD_Dashboard_Akademik_SMPN1_Cibalong_v0.3.md` dan sudah tidak dipakai sebagai acuan. Dokumen terkait: `ML_Roadmap_Capstone.md` dan `Protokol_Evaluasi_A1.md`.*
