# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Dashboard Akademik Nesaciba

**STATUS: SUPERSEDED - DIGANTIKAN VERSI v1.0**

> Dokumen ini disimpan **semata-mata sebagai arsip**. Isinya sudah tidak
> selaras dengan implementasi: masih menyebut Supabase sebagai basis data,
> 11 mata pelajaran, tema gelap, dan alur impor "proses baris valid".
> Acuan aktif ada di `PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md`.

|||
|-|-|
|**Nama Produk**|Dashboard Akademik SMPN 1 Cibalong (Nesaciba)|
|**Versi Dokumen**|v0.3 (arsip)|
|**Digantikan oleh**|`PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md`|
|**Disusun oleh**|Tim Pengembang (Pengembang)|
|**Untuk**|SMPN 1 Cibalong (Klien)|
|**Tanggal**|16 Agustus 2026|
|**Dokumen Terkait**|Catatan Diskusi Kebutuhan Sistem - `DASHBOARD_AKADEMIK_NESACIBA.txt`|

---

# 1. Ringkasan Produk (Overview)

Saat ini SMPN 1 Cibalong belum memiliki sistem terpusat untuk memantau performa akademik dan kehadiran siswa. Untuk mengetahui mata pelajaran dengan nilai tertinggi maupun terendah, serta memantau rekap kehadiran (sakit, izin, tanpa keterangan) di setiap angkatan, kelas, maupun individu siswa, sekolah masih mengandalkan pencatatan yang tersebar dan proses rekap manual dari data nilai per semester. Kondisi ini menyulitkan pihak sekolah untuk melihat tren nilai maupun kehadiran secara cepat dan menyeluruh, baik di level angkatan, kelas, maupun siswa perorangan.

Untuk menjawab kebutuhan tersebut, akan dibangun sebuah sistem web Dashboard Akademik berbasis Next.js, React, Tailwind CSS, dan PostgreSQL (Supabase), yang diadministrasikan menggunakan DBeaver, dengan skema data berjenjang Angkatan → Kelas → Siswa. Sistem ini memungkinkan operator mengelola data nilai (6 semester, 11 mata pelajaran) dan data kehadiran melalui impor file Excel per kelas maupun input manual (CRUD) di web, sementara guru dapat memantau performa akademik melalui rangkaian visualisasi grafik interaktif (distribusi gender, kehadiran, tren nilai, rekap nilai, dan peringkat mata pelajaran) di setiap level data. Sistem menerapkan Role-Based Access Control (RBAC) yang dapat dikonfigurasi secara dinamis melalui menu manajemen menu, rute, permission, dan role, tanpa hardcode pada kode aplikasi.

# 2. Tujuan & Sasaran (Goals)

* Memusatkan data nilai (6 semester) dan kehadiran siswa (sakit, izin, tanpa keterangan) SMPN 1 Cibalong dalam satu sistem berjenjang: Angkatan → Kelas → Siswa.
* Menyediakan visibilitas cepat terhadap mata pelajaran dengan nilai tertinggi dan terendah di setiap level data (angkatan, kelas, siswa).
* Mengurangi proses rekap manual data nilai dan kehadiran melalui fitur impor massal (xlsx) per kelas.
* Menyediakan mekanisme validasi visual sebelum data disimpan, guna meminimalkan kesalahan input (mis. salah ketik nilai).
* Menyediakan kontrol akses berbasis peran (RBAC) yang fleksibel dan dapat dikonfigurasi tanpa perlu mengubah kode aplikasi.
* Menjaga akuntabilitas perubahan data melalui pencatatan audit log atas aktivitas operator.

# 3. Pengguna & Peran (Users & Roles)

* **Superadmin :** Mengelola konfigurasi inti sistem — manajemen pengguna, menu, rute, permission, dan role. Memiliki akses penuh terhadap seluruh modul sistem.
* **Operator :** Mengelola data akademik dan kehadiran — mengimpor data nilai dari file Excel per kelas, melakukan CRUD data siswa/nilai/kehadiran secara manual di web, mengelola master data (Angkatan dan Kelas), serta memvalidasi data melalui dashboard preview. Terdapat satu akun operator untuk sistem ini.
* **Guru :** Peran read-only. Memantau performa akademik dan kehadiran melalui Dashboard Utama (level angkatan), Analisis Per Kelas (level kelas), dan Pencarian Siswa (level individu). Akun guru bersifat umum/bersama, tidak dibuat per nama guru.

# 4. Ruang Lingkup (Scope)

## 4.1 Termasuk (MVP)

* Autentikasi dan otorisasi berbasis RBAC (login, manajemen user, menu, rute, dan permission per role, dikonfigurasi secara dinamis — tidak hardcode).
* Manajemen master data Angkatan (tahun lulus) dan Kelas (A–F) oleh operator.
* Impor data nilai dan kehadiran dari file Excel per kelas, lengkap dengan tabel preview dan validasi (penandaan baris error) sebelum data disimpan ke database, serta fasilitas unduh template Excel standar sebagai acuan pengisian.
* CRUD manual data siswa, kehadiran, dan nilai 11 mata pelajaran per semester oleh operator, dengan form bertahap (Profil, Kehadiran, Nilai Mapel).
* Dashboard level Angkatan berisi 5 grafik: distribusi gender (donut), rekapitulasi kehadiran per semester (grouped bar), tren nilai rata-rata 11 mata pelajaran per semester (line chart, mapel dapat difilter), rekap nilai semua mapel per semester (vertical bar), dan peringkat nilai mapel tertinggi–terendah (horizontal bar).
* Dashboard level Kelas dengan 5 grafik yang sama, dikalkulasi khusus dari data satu kelas, dilengkapi tabel daftar siswa (NIS, Nama, Jenis Kelamin).
* Popup detail siswa (level individu) berisi identitas siswa dan 4 grafik (tanpa distribusi gender) menggunakan nilai asli siswa tersebut, dapat diakses dari tabel kelas maupun menu Pencarian Siswa.
* Dashboard Preview Data untuk operator sebagai alat validasi visual pasca-impor.
* Audit log atas perubahan data yang dilakukan operator.
* Pustaka komponen UI reusable tanpa hardcode (data table, toast, card, label, skeleton, kalender, dll.) beserta konfigurasi Tailwind global.
* Struktur modular back-end: controller (logika HTTP sederhana), service (logika bisnis), schema, repository, dan middleware; konfigurasi database melalui file `.env`.
* Seed data awal untuk akun Superadmin, Operator, dan Guru.

## 4.2 Di Luar Lingkup Awal / Fase Lanjutan

Fitur grafik perbandingan nilai antar-angkatan dan fitur ekspor laporan ditunda ke fase lanjutan (lihat Bab 11), karena data historis lintas-angkatan masih terbatas dan kebutuhan ekspor belum mendesak untuk rilis awal.

# 5. Asumsi & Batasan (Assumptions & Constraints)

* Sistem dibangun menggunakan Next.js, React, dan Tailwind CSS untuk front-end, dengan PostgreSQL melalui Supabase sebagai database, dan DBeaver sebagai alat administrasi database.
* Untuk MVP, sistem hanya dioptimalkan untuk tampilan desktop; dukungan responsif/mobile belum menjadi prioritas.
* [Asumsi] Jumlah siswa per kelas diperkirakan berkisar 28–32 orang; angka ini belum final dan dapat memengaruhi desain paginasi/performansi tabel.
* Nilai per mata pelajaran per semester diasumsikan berupa satu nilai akhir (final), tanpa pemisahan komponen nilai harian, UTS, atau UAS.
* Fitur ekspor laporan (PDF/Excel) tidak disediakan pada versi MVP.
* [Asumsi] Keputusan lingkungan hosting produksi (server milik sekolah atau layanan cloud) ditunda dan tidak memengaruhi arsitektur aplikasi pada tahap MVP, karena aplikasi dirancang platform-agnostic.
* Hanya terdapat satu akun operator aktif pada versi awal sistem; akun guru bersifat umum dan dipakai bersama, bukan per individu guru.
* Struktur data mengikuti hierarki Angkatan → Kelas (A–F) → Siswa, dengan 11 mata pelajaran tetap: PABP, PPKn, B. Indonesia, Matematika, IPA, IPS, B. Inggris, Seni Musik, PJOK, Informatika, dan B. Sunda.

# 6. Kebutuhan Fungsional (Functional Requirements)

## 6.1 Superadmin — Manajemen Akses (RBAC)

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**RBAC-1**|Superadmin dapat mengelola akun pengguna (tambah, ubah, nonaktifkan) untuk role Operator dan Guru|**Wajib**|
|**RBAC-2**|Superadmin dapat mengelola daftar menu yang tersedia untuk ditampilkan di sidebar|**Wajib**|
|**RBAC-3**|Superadmin dapat mengelola rute (route) aplikasi beserta hak akses tiap role terhadap rute tersebut|**Wajib**|
|**RBAC-4**|Superadmin dapat mengelola permission granular per role (contoh: `nilai.write`, `nilai.read`)|**Wajib**|
|**RBAC-5**|Superadmin dapat membuat dan mengelola role baru|**Wajib**|
|**RBAC-6**|Sistem dapat menentukan halaman default (`/dashboard`) berdasarkan konfigurasi rute per role, tanpa hardcode role di komponen UI|**Wajib**|

## 6.2 Operator — Master Data

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**MSTR-1**|Operator dapat menambahkan Angkatan (tahun lulus) baru, misalnya Angkatan 2026|**Wajib**|
|**MSTR-2**|Operator dapat mengelola data Kelas (A–F) yang terikat pada suatu Angkatan|**Wajib**|
|**MSTR-3**|Operator dapat mengelola daftar mata pelajaran agar tidak hardcode di kode aplikasi|**Penting**|

## 6.3 Operator — Import Data Excel

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**IMPT-1**|Operator dapat mengunggah file Excel (.xlsx) berisi data nilai dan kehadiran untuk satu kelas dan satu semester tertentu|**Wajib**|
|**IMPT-2**|Sistem menampilkan tabel preview seluruh isi file Excel sebelum data disimpan ke database|**Wajib**|
|**IMPT-3**|Sistem menandai baris data yang tidak valid (contoh: nilai bukan angka, NIS duplikat) menggunakan komponen Toast/Alert|**Wajib**|
|**IMPT-4**|Tombol "Simpan ke Database" hanya aktif setelah seluruh baris data dinyatakan valid|**Wajib**|
|**IMPT-5**|Operator dapat mengunduh file template Excel (.xlsx) berisi struktur kolom standar (NIS, Nama, Jenis Kelamin, Semester, Sakit, Izin, Tanpa Keterangan, dan 11 mata pelajaran) untuk digunakan sebagai acuan pengisian data sebelum diunggah|**Wajib**|

## 6.4 Operator — Kelola Data Akademik (CRUD Manual)

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**AKAD-1**|Operator dapat melihat daftar siswa berdasarkan filter Angkatan, Kelas, dan Semester|**Wajib**|
|**AKAD-2**|Operator dapat menambah data siswa baru beserta profil (NIS, Nama, Jenis Kelamin, Status Aktif)|**Wajib**|
|**AKAD-3**|Operator dapat mengubah dan menghapus data siswa, kehadiran, dan nilai mata pelajaran|**Wajib**|
|**AKAD-4**|Form input/edit menyediakan input kehadiran (Sakit, Izin, Tanpa Keterangan) dan 11 input nilai mata pelajaran secara dinamis|**Wajib**|

## 6.5 Sistem — Audit Log

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**LOG-1**|Sistem mencatat log setiap perubahan data (tambah/ubah/hapus) yang dilakukan Operator, mencakup jenis perubahan dan waktu|**Wajib**|

## 6.6 Guru & Operator — Dashboard Level Angkatan

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**DASH-1**|Pengguna dapat memilih Angkatan (tahun lulus) melalui dropdown filter|**Wajib**|
|**DASH-2**|Sistem menampilkan ringkasan kartu: Total Siswa, Total Sakit, Total Izin, Total Alpa untuk angkatan terpilih|**Wajib**|
|**DASH-3**|Sistem menampilkan grafik donut distribusi gender siswa pada angkatan terpilih|**Wajib**|
|**DASH-4**|Sistem menampilkan grafik grouped bar rekapitulasi kehadiran (Sakit/Izin/Alpa) per semester (1–6)|**Wajib**|
|**DASH-5**|Sistem menampilkan grafik line chart tren nilai rata-rata untuk 11 mata pelajaran selama 6 semester, dengan filter mata pelajaran yang ditampilkan|**Wajib**|
|**DASH-6**|Sistem menampilkan grafik vertical bar rekap nilai rata-rata seluruh mata pelajaran, dengan filter semester|**Wajib**|
|**DASH-7**|Sistem menampilkan grafik horizontal bar peringkat nilai mata pelajaran tertinggi dan terendah, dengan filter semester|**Wajib**|

## 6.7 Guru & Operator — Analisis Per Kelas

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**KLS-1**|Pengguna dapat memilih Angkatan lalu Kelas (A–F) melalui dropdown filter berjenjang|**Wajib**|
|**KLS-2**|Sistem menampilkan kelima grafik yang sama seperti Dashboard Angkatan (DASH-3 s.d. DASH-7), dikalkulasi khusus dari data kelas terpilih|**Wajib**|
|**KLS-3**|Sistem menampilkan tabel daftar siswa pada kelas terpilih berisi kolom NIS, Nama, dan Jenis Kelamin|**Wajib**|
|**KLS-4**|Klik pada baris siswa membuka popup detail siswa berukuran hampir selayar penuh|**Wajib**|

## 6.8 Guru & Operator — Popup / Pencarian Detail Siswa

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**SIS-1**|Pengguna dapat mencari siswa berdasarkan nama atau NIS tanpa harus masuk ke menu Kelas|**Wajib**|
|**SIS-2**|Popup detail siswa menampilkan identitas siswa (NIS, Nama, Kelas, Jenis Kelamin)|**Wajib**|
|**SIS-3**|Popup menampilkan grafik grouped bar riwayat kehadiran (Sakit/Izin/Alpa) siswa selama 6 semester|**Wajib**|
|**SIS-4**|Popup menampilkan grafik line chart tren nilai asli siswa dari semester 1–6, dengan pilihan mata pelajaran yang dibandingkan|**Wajib**|
|**SIS-5**|Popup menampilkan grafik vertical bar nilai asli siswa untuk seluruh mata pelajaran pada semester terpilih|**Wajib**|
|**SIS-6**|Popup menampilkan grafik horizontal bar peringkat kekuatan/kelemahan mata pelajaran siswa pada semester terpilih|**Wajib**|

## 6.9 Operator — Dashboard Preview Data

|**ID**|**Kebutuhan Fungsional**|**Prioritas**|
|-|-|-|
|**PREV-1**|Operator dapat mengakses tampilan dashboard level angkatan (identik dengan DASH-1 s.d. DASH-7) sebagai alat validasi visual setelah impor data|**Penting**|

# 7. Alur Pengguna Utama (Key User Flows)

## 7.1 Operator Mengimpor Data Nilai dan Kehadiran

1. Operator membuka menu **Import Data Excel**.
2. (Opsional) Operator mengunduh template Excel standar sebagai acuan format kolom.
3. Operator memilih Angkatan dan Kelas tujuan data melalui dropdown.
4. Operator mengunggah file `.xlsx` sesuai kolom yang ditentukan (NIS, Nama, Jenis Kelamin, Semester, Sakit, Izin, Tanpa Keterangan, dan 11 nilai mata pelajaran).
5. Sistem menampilkan tabel preview seluruh baris data.
6. Sistem memvalidasi setiap baris; baris bermasalah ditandai merah dengan keterangan error melalui komponen Toast.
7. Jika seluruh baris valid, tombol "Simpan ke Database" aktif dan Operator menekannya untuk menyimpan data.
8. Sistem mencatat aktivitas ini ke dalam audit log.

## 7.2 Operator Memperbaiki Data Satu Siswa (CRUD Manual)

1. Operator membuka menu **Kelola Data Akademik**.
2. Operator memfilter data berdasarkan Angkatan, Kelas, dan Semester.
3. Operator menekan aksi "Edit" pada baris siswa yang dituju.
4. Sistem menampilkan form dengan tiga tab: Profil, Kehadiran, dan Nilai Mapel.
5. Operator mengubah data yang diperlukan dan menyimpan perubahan.
6. Sistem memperbarui data dan mencatat perubahan ke audit log.

## 7.3 Guru Menelusuri Performa dari Angkatan ke Individu Siswa

1. Guru login dan diarahkan ke halaman default **Dashboard Utama (Level Angkatan)**.
2. Guru melihat grafik peringkat nilai mata pelajaran untuk mengidentifikasi mata pelajaran dengan nilai terendah pada angkatan tersebut.
3. Guru membuka menu **Analisis Per Kelas** dan memilih kelas tertentu untuk membandingkan performa antar kelas pada mata pelajaran yang sama.
4. Guru menekan nama siswa pada tabel daftar siswa kelas tersebut.
5. Sistem menampilkan popup detail siswa berisi grafik kehadiran dan nilai asli siswa selama 6 semester.

## 7.4 Superadmin Mengatur Hak Akses Role Baru

1. Superadmin membuka menu **Manage Role** dan membuat role baru.
2. Superadmin membuka **Manage Permission** untuk menetapkan permission (contoh: `nilai.read`) pada role tersebut.
3. Superadmin membuka **Manage Menu** dan **Manage Route** untuk menentukan menu sidebar dan rute yang dapat diakses role tersebut.
4. Pengguna dengan role baru login dan sistem secara dinamis merender sidebar sesuai konfigurasi, tanpa kondisi hardcode pada komponen UI.

# 8. Model Data (High-Level)

|**Entitas**|**Field Utama**|**Keterangan**|
|-|-|-|
|**angkatan**|id, tahun_lulus|Merepresentasikan tahun lulus, mis. 2026|
|**kelas**|id, angkatan_id, nama_kelas|Kelas A–F, terikat pada satu angkatan|
|**siswa**|id, kelas_id, nis, nama, jenis_kelamin, status_aktif|Data induk/profil siswa|
|**mata_pelajaran**|id, nama_mapel|11 mata pelajaran tetap (PABP, PPKn, dst.)|
|**nilai_siswa**|id, siswa_id, mata_pelajaran_id, semester, nilai|Nilai akhir per mapel per semester|
|**kehadiran_siswa**|id, siswa_id, semester, sakit, izin, tanpa_keterangan|Rekap kehadiran per semester|
|**user**|id, nama, email, role_id|Akun Superadmin, Operator, Guru|
|**role**|id, nama_role|Superadmin, Operator, Guru, dan role kustom|
|**permission**|id, kode_permission|Contoh: `nilai.write`, `nilai.read`|
|**menu**|id, nama_menu, path|Daftar menu sidebar|
|**route**|id, path, method|Daftar rute aplikasi|
|**role_permission**|role_id, permission_id|Relasi role dan permission|
|**role_menu**|role_id, menu_id|Relasi role dan menu yang dapat diakses|
|**role_route**|role_id, route_id|Relasi role dan rute yang dapat diakses|
|**audit_log**|id, user_id, aksi, entitas, waktu|Pencatatan perubahan data oleh Operator|

# 9. Kebutuhan Non-Fungsional (Non-Functional Requirements)

* **Keamanan & Hak Akses :** Seluruh endpoint dilindungi middleware otorisasi berbasis RBAC (menu, rute, dan permission), sesuai role pengguna yang login.
* **Modularitas Kode :** Back-end mengikuti pemisahan lapisan controller (logika HTTP sederhana), service (logika bisnis), schema, repository, dan middleware agar mudah dipelihara dan dikembangkan.
* **Tampilan :** Untuk versi MVP, antarmuka dioptimalkan untuk penggunaan desktop; dukungan tampilan responsif/mobile belum menjadi prioritas.
* **Konsistensi UI :** Komponen antarmuka (data table, toast, card, label, skeleton, kalender, dll.) dibangun sebagai komponen reusable dan tidak di-hardcode pada halaman, agar konsisten dan mudah dipakai ulang di seluruh level dashboard (angkatan, kelas, siswa).
* **Akuntabilitas Data :** Setiap perubahan data oleh Operator tercatat dalam audit log untuk keperluan penelusuran.
* **Validasi Data :** Proses impor Excel wajib melalui tahap preview dan validasi sebelum data tersimpan permanen ke database, guna mencegah kesalahan input massal.

# 10. Integrasi Pihak Ketiga

|**Layanan**|**Fungsi**|**Catatan**|
|-|-|-|
|**Supabase (PostgreSQL)**|Basis data utama aplikasi|Disepakati sebagai database sistem|
|**DBeaver**|Alat administrasi/manajemen database|Digunakan oleh tim pengembang untuk mengelola database Supabase, bukan bagian dari aplikasi end-user|

# 11. Fitur Usulan / Fase Lanjutan

* **Grafik Perbandingan Antar-Angkatan.** Menampilkan perbandingan tren nilai dan kehadiran antara lebih dari satu angkatan sekaligus. Fitur ini terkait langsung dengan grafik tren nilai per angkatan (DASH-5) namun ditunda karena data historis lintas-angkatan masih terbatas.
* **Fitur Ekspor Laporan.** Kemampuan mengekspor data nilai/kehadiran (mis. ke PDF atau Excel) untuk kebutuhan pelaporan formal, belum menjadi prioritas pada rilis awal.

# 12. Pertanyaan Terbuka / TBD

* Jumlah pasti siswa per kelas (saat ini diasumsikan 28–32 siswa) belum dikonfirmasi.
* Keputusan lingkungan hosting produksi — menggunakan server milik sekolah atau layanan cloud — belum diputuskan.
* Kebutuhan dan format ekspor laporan (jika suatu saat diperlukan) belum dibahas.
* Detail kebijakan retensi/penyimpanan audit log (berapa lama data log disimpan) belum dibahas.
* Mekanisme reset password dan lupa kata sandi untuk akun Operator/Guru belum dibahas.
* Kebutuhan foto profil siswa pada popup detail siswa disebutkan bersifat opsional; belum dipastikan apakah akan diimplementasikan pada MVP.

# 13. Glosarium

* **Angkatan :** Kelompok siswa berdasarkan tahun kelulusan, mis. Angkatan 2026.
* **RBAC (Role-Based Access Control) :** Mekanisme kontrol akses berdasarkan peran pengguna (role), mencakup menu, rute, dan permission.
* **NIS :** Nomor Induk Siswa, identitas unik setiap siswa.
* **Alpa :** Kategori ketidakhadiran siswa tanpa keterangan.
* **CRUD :** Singkatan dari Create, Read, Update, Delete — operasi dasar pengelolaan data.
* **Preview Data :** Tampilan sementara hasil unggahan Excel sebelum data disimpan permanen ke database.

---

*Dokumen ini merupakan draft sementara dan dapat berubah seiring pembahasan lebih lanjut dengan klien.*
