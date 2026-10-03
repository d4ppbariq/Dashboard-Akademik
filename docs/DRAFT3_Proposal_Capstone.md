# DRAFT 3 PROPOSAL CAPSTONE PROJEK

**PENINGKATAN DASHBOARD AKADEMIK NESACIBA: MODUL PERINGATAN DINI AKADEMIK BERBASIS MACHINE LEARNING, PENGUATAN KEAMANAN SISTEM, DAN PENINGKATAN PENGALAMAN PENGGUNA**

**Disusun Oleh (Kelompok 2):**

| Nama | NPM | Kompetensi Keahlian |
|---|---|---|
| Daffa Bariq Suwandi | 237006021 | Informatika dan Sistem Intelegen (ISI) |
| Andi Rafiyan | 237006074 | Jaringan Komputer, Keamanan dan Forensik Digital (JKF) |
| Ayu Barkilah | 237006165 | Jaringan Komputer, Keamanan dan Forensik Digital (JKF) |
| Piki Alpian | 237006004 | Teknologi Multimedia dan Gim (TMG) |

**JURUSAN INFORMATIKA - FAKULTAS TEKNIK - UNIVERSITAS SILIWANGI - 2026**

---

## BAB I — PENDAHULUAN

### 1.1 Latar Belakang

Dashboard Akademik Nesaciba adalah sistem web yang sudah berjalan dan dipakai oleh SMPN 1 Cibalong untuk mengelola dan memantau data akademik siswa secara terpusat. Sistem menyimpan data nilai selama enam semester dari ±11 mata pelajaran yang berlaku per angkatan, rekap kehadiran per semester, dan profil siswa, dalam skema berjenjang Angkatan → Kelas → Siswa. Seluruh data tersebut tersimpan dalam PostgreSQL dan dapat diperbarui oleh operator melalui impor berkas Excel/CSV maupun input manual. Saat ini sistem telah menyajikan statistik deskriptif di level angkatan, kelas, dan individu siswa melalui Dashboard Utama, Rekap Akademik, dan Pencarian Siswa.

Meskipun data yang dikelola sudah cukup kaya, sistem masih menghadapi tiga persoalan. **Pertama**, data akademik hanya tersaji sebagai rekap deskriptif; belum ada lapisan prediksi yang dapat memberikan peringatan dini terhadap siswa yang berpotensi menurun prestasinya pada semester berikutnya. Data panel yang tersedia — nilai antar-semester dan kehadiran — sebenarnya dapat dimanfaatkan untuk memprediksi kinerja siswa lebih awal, sehingga guru dapat melakukan intervensi sebelum masalah membesar. **Kedua**, keamanan sistem masih lemah: skema hash password memakai SHA-256 tanpa salt, tidak ada mekanisme reset password mandiri bagi pengguna, akses terhadap hasil analisis baru belum dibedakan antar peran (RBAC khusus fitur prediksi belum ada), dan audit log belum diperkuat untuk melacak penyalahgunaan akses. **Ketiga**, tampilan sistem belum responsif terhadap perangkat bergerak, dan apabila hasil prediksi ditambahkan, penyajiannya perlu dirancang agar dapat dipahami pengguna non-teknis (guru dan operator) — termasuk menampilkan rentang ketidakpastian agar angka prediksi tidak diperlakukan sebagai kepastian.

Proyek capstone ini bertujuan menjawab ketiga persoalan tersebut dengan menambahkan **modul peringatan dini akademik berbasis machine learning**, **penguatan keamanan sistem**, dan **peningkatan pengalaman pengguna** di atas sistem yang sudah berjalan — tanpa mengubah fitur inti yang telah dipakai sekolah.

### 1.2 Rumusan Masalah

Berdasarkan latar belakang di atas, permasalahan yang dijawab dalam proyek ini dirumuskan sebagai berikut:

- Bagaimana membangun proses feature engineering yang terdokumentasi dari data panel Dashboard Akademik Nesaciba (nilai per semester, agregat, rasio kehadiran, lag/delta antarsemester, dan encoding kategorikal) dengan pembagian data berbasis waktu dan tanpa memakai fitur dari semester target agar tidak terjadi kebocoran data?
- Bagaimana memilih metode dan memvalidasi model prediksi nilai siswa (skenario A1) sehingga hasilnya dapat dibandingkan secara adil terhadap baseline naif, dengan evaluasi MAE, RMSE, dan MAPE (serta accuracy, F1-score, dan recall bila pendekatan klasifikasi digunakan) menurut protokol yang telah dibekukan?
- Bagaimana merancang lapisan penyimpanan hasil prediksi (tabel `Prediksi`) yang generik, aditif, dan dapat ditelusuri ke skenario serta versi model?
- Bagaimana memperkuat keamanan sistem berupa migrasi skema hash password (SHA-256 ke bcrypt/Argon2), reset password mandiri, RBAC khusus fitur hasil prediksi, penguatan audit log, dan audit keamanan dasar mengacu OWASP?
- Bagaimana menyajikan hasil prediksi yang mudah dipahami pengguna non-teknis melalui tampilan responsif dan visualisasi kartu "Proyeksi" dengan rentang ketidakpastian, serta menguji kegunaannya bersama guru dan operator mitra?

### 1.3 Tujuan

#### Tujuan Akhir

Proyek ini bertujuan menghasilkan peningkatan Dashboard Akademik Nesaciba pada sistem yang sudah berjalan dan dipakai SMPN 1 Cibalong — berupa modul peringatan dini akademik berbasis machine learning (prediksi nilai per siswa untuk semester berikutnya), penguatan keamanan sistem, dan peningkatan pengalaman pengguna (tampilan responsif serta visualisasi hasil prediksi) — tanpa mengubah fitur inti yang sudah berjalan.

#### Tujuan Khusus

- Menghasilkan proses feature engineering yang terdokumentasi (nilai per semester, agregat, rasio kehadiran, lag/delta antarsemester, dan encoding kategorikal) dari data Dashboard Akademik Nesaciba, dengan pembagian data berbasis waktu dan tanpa penggunaan fitur dari semester target agar tidak terjadi kebocoran data.
- Menghasilkan model prediksi nilai per siswa (skenario A1) yang dibandingkan terhadap baseline naif dan divalidasi menurut protokol evaluasi yang telah dibekukan, menggunakan metrik MAE, RMSE, dan MAPE (serta accuracy, F1-score, dan recall pada pendekatan klasifikasi dengan ambang yang ditetapkan bersama sekolah).
- Merancang dan mengimplementasikan tabel `Prediksi` sebagai lapisan penyimpanan hasil prediksi yang generik, aditif, dan dapat ditelusuri ke skenario serta versi model.
- Memigrasikan skema hash password dari SHA-256 tanpa salt ke bcrypt/Argon2 tanpa mengganggu akun yang sudah ada, mengimplementasikan reset password mandiri, membangun RBAC khusus fitur hasil prediksi, memperkuat audit log, dan melakukan audit keamanan dasar mengacu pada OWASP.
- Merancang dan mengimplementasikan tampilan responsif/mobile serta visualisasi kartu "Proyeksi" dengan rentang ketidakpastian, termasuk purwarupa desain visual fitur ekspor laporan/rapor, serta menguji kegunaan hasil prediksi, tampilan responsif, dan alur keamanan baru bersama guru dan operator mitra melalui usability testing dan UAT.

### 1.4 Manfaat

#### Manfaat Akademik

- Menyediakan studi kasus penerapan machine learning pada data akademik riil jenjang sekolah menengah di Indonesia dengan keterbatasan jumlah angkatan, termasuk praktik menegakkan protokol evaluasi yang dibekukan sebelum pelatihan agar klaim hasil dapat dipertanggungjawabkan.
- Memberikan kontribusi metodologis dalam merancang lapisan penyimpanan hasil prediksi (tabel `Prediksi`) yang generik, dapat diaudit, dan tidak mengganggu sistem yang sudah berjalan.
- Memperkaya dokumentasi capstone lintas tiga kompetensi keahlian (informatika, keamanan jaringan, dan multimedia) pada satu sistem yang sama.

#### Manfaat Praktis (SMPN 1 Cibalong)

- Guru dan operator memperoleh kemampuan peringatan dini akademik yang melengkapi dashboard deskriptif yang sudah dipakai, sehingga intervensi terhadap siswa berisiko dapat dilakukan lebih dini.
- Data pribadi siswa terlindungi melalui penguatan keamanan autentikasi dan kontrol akses berbasis peran terhadap fitur hasil prediksi.
- Tampilan responsif memungkinkan dashboard diakses dari perangkat seluler, dan alur reset password mandiri meningkatkan kemandirian pengguna.

#### Manfaat Universal

- Menjadi contoh pola nyata menambahkan modul machine learning pada sistem akademik yang sedang berjalan tanpa merusaknya; rancangan tabel hasil prediksi yang generik dan dapat diaudit serta pertimbangan kelayakan data yang eksplisit dapat ditiru pada sistem akademik lain mana pun.
- Menunjukkan bagaimana hasil prediksi yang probabilistik disajikan bersama rentang ketidakpastian agar pengguna non-teknis tidak memperlakukan angka prediksi sebagai kepastian.

### 1.5 Batasan Masalah / Ruang Lingkup

Ruang lingkup proyek ini dibatasi pada rencana yang dikerjakan saat ini:

- **Modul peringatan dini pada level siswa (skenario A1).** Prediksi difokuskan pada nilai rata-rata siswa pada semester berikutnya dari data yang sudah tersimpan di sistem, baik sebagai regresi maupun klasifikasi dengan ambang yang ditetapkan bersama sekolah.
- **Berjalan di atas sistem yang sudah ada.** Seluruh pekerjaan tidak mengubah skema maupun fitur inti aplikasi; model dilatih di luar aplikasi dan hasilnya dibaca melalui tabel `Prediksi`.
- **Keamanan.** Mencakup migrasi hash password, reset password mandiri, RBAC khusus fitur hasil prediksi, penguatan audit log, dan audit keamanan dasar mengacu OWASP pada lingkup sistem ini.
- **Pengalaman pengguna.** Mencakup tampilan responsif dan kartu "Proyeksi" dengan rentang ketidakpastian beserta pengujian kegunaannya bersama mitra.

Hal-hal berikut **di luar cakupan** proyek saat ini: peringatan dini risiko level kelas (skenario B1), forecast lintas tahun antar-angkatan (skenario B2), prediksi rata-rata akhir angkatan berjalan sebagai produk resmi (skenario A2), fitur ekspor laporan PDF/Excel (hanya purwarupa desain visual), dan dukungan tema gelap. Skenario-skenario tersebut hanya disebut sebagai arah pengembangan dan tidak dibahas sebagai rencana kerja pada proposal ini.

Klaim hasil juga dibatasi oleh ketersediaan data. Dengan satu angkatan lengkap yang tersedia saat ini, hasil evaluasi hanya layak disebut **bukti kelayakan**, bukan evaluasi generalisasi — sesuai ketentuan pada Protokol Evaluasi A1.

---

## BAB II — TINJAUAN PUSTAKA

### 2.1 Peringatan Dini Akademik (Early Warning System)

Peringatan dini akademik adalah mekanisme berbasis data yang mengidentifikasi siswa berisiko mengalami kegagalan atau penurunan prestasi sedini mungkin, agar intervensi dapat dilakukan sebelum masalah membesar [9]. Pendekatan machine learning terbukti mampu memprediksi risiko akademik, termasuk dropout dan kegagalan, melalui data hasil belajar serta karakteristik siswa [9,10]. Pada proyek ini, peringatan dini diwujudkan sebagai prediksi nilai rata-rata siswa pada semester berikutnya (regresi) beserta klasifikasi ke dalam kelas "perlu perhatian" apabila nilai diprediksi di bawah ambang yang disepakati.

### 2.2 Data Panel Longitudinal

Data panel longitudinal mengikuti satu unit analisis — dalam hal ini siswa — secara berulang dari waktu ke waktu [1]. Data nilai enam semester per siswa beserta rekap kehadiran per semester merupakan panel di mana setiap siswa diamati berkali-kali. Implikasi penting dari struktur ini adalah evaluasi tidak boleh memakai pembagian acak sederhana karena baris dari siswa yang sama dapat berada di data latih dan data uji sekaligus (kebocoran data); pembagian wajib berbasis unit (angkatan) [14]. Karakteristik panel inilah yang menjadi dasar pemilihan target "nilai semester k+1" dengan fitur hanya berasal dari semester ≤ k.

### 2.3 Regresi Terregularisasi: Ridge dan ElasticNet

Regresi Ridge menambahkan penalti L2 pada koefisien sehingga mengecilkan pengaruh fitur yang saling berkorelasi dan menstabilkan estimasi pada data berukuran kecil dengan banyak fitur [1,4]. ElasticNet menggabungkan penalti L1 dan L2, sehingga mampu melakukan seleksi fitur sekaligus menangani korelasi antarfitur [4]. Karena data proyek ini kecil (satu angkatan lengkap), model linier terregularisasi dipilih sebagai model utama karena stabil, cepat, dan **dapat diinterpretasikan** — koefisien tiap fitur menjelaskan seberapa besar kontribusi nilai, kehadiran, dan posisi relatif terhadap prediksi. Pilihan ini sejalan dengan posisi proyek terhadap state of the art (lihat §2.9).

### 2.4 Evaluasi Model Prediksi

Untuk masalah regresi, evaluasi utama menggunakan **MAE** (rata-rata galat mutlak, mudah dibaca karena satuannya poin nilai), **RMSE** (akar kuadrat rata-rata galat kuadrat, sensitif terhadap kesalahan besar), dan **MAPE** (galat persentase rata-rata) sebagai pelengkap [2,14]. Bila pendekatan klasifikasi digunakan, metrik yang dipakai adalah accuracy, F1-score, dan recall — dengan recall kelas "perlu perhatian" diprioritaskan agar siswa berisiko tidak terlewat. Setiap angka wajib disertai ukuran sampel, interval keyakinan (bootstrap), dan daftar mapel yang berlaku [14]. Model baru hanya dinyatakan berguna apabila mengungguli **baseline naif** ("prediksi = nilai semester sebelumnya") [14].

### 2.5 Data Leakage dan Validasi Berbasis Waktu

Data leakage terjadi ketika informasi dari data uji atau dari semester target bocor ke proses pelatihan, sehingga metrik terlihat lebih baik dari kenyataan. Kebocoran dapat muncul dari beberapa sumber: fitur dari semester target (termasuk kehadiran semester target), rata-rata akhir untuk memprediksi semester tengah, dan scaler/z-score yang dihitung dari seluruh data [1,14]. Protokol proyek ini menegaskan pembagian **berbasis waktu/angkatan**, larangan fitur dari semester target, dan penghitungan z-score hanya di dalam fold pelatihan [14].

### 2.6 Keamanan Autentikasi: Hash Password dan Audit Log

Penyimpanan kata sandi yang aman menggunakan skema hash lambat yang dirancang khusus seperti **bcrypt** atau **Argon2**, bukan hash cepat generik seperti SHA-256 tanpa salt [5,6]. Migrasi dari skema lama ke skema baru dilakukan dengan pola *upgrade-on-login* agar akun yang ada tidak terkunci [5]. Prinsip ini menjadi dasar perancangan peningkatan keamanan autentikasi pada proyek ini. Akuntabilitas akses dijaga melalui **audit log** yang mencatat login, logout, dan seluruh operasi data [12].

### 2.7 Audit Keamanan Sistem

Audit keamanan dasar dilakukan untuk menilai kerentanan umum pada aplikasi web, antara lain kontrol akses (RBAC), validasi input, sesi, dan penyimpanan kredensial, dengan mengacu pada daftar periksa OWASP [5]. Hasil audit menjadi dasar perbaikan dan dilaporkan sebagai salah satu luaran proyek.

### 2.8 Desain Responsif dan Visualisasi Ketidakpastian

Desain responsif memungkinkan antarmuka menyesuaikan diri dengan lebar perangkat (desktop, tablet, mobile) melalui tata letak berbasis grid dan unit relatif [8]. Sementara itu, pengguna non-teknis cenderung memperlakukan satu angka prediksi sebagai kepastian; oleh karena itu hasil prediksi disajikan bersama **rentang ketidakpastian** (interval keyakinan) yang membantu pengguna menafsirkan keyakinan model secara tepat [7]. Kedua prinsip ini menjadi dasar perancangan kartu "Proyeksi".

### 2.9 State of the Art (SOTA)

Educational Data Mining telah menjadi wilayah riset yang aktif. Tabel berikut memposisikan proyek ini terhadap tiga penelitian terbaru yang relevan (seluruhnya *open access*):

| Peneliti (Tahun) | Metode/Algoritma | Jenis Data | Hasil Utama | Keterbatasan / Gap |
|---|---|---|---|---|
| Li et al. (2026) [10] | Radial basis function neural network + indikator FCE-AHP | Perguruan tinggi; ±1.245 mahasiswa (mayoritas rekayasa); data besar | Akurasi 96,32%; RMSE 0,2926 pada peringatan krisis akademik | Jenjang pendidikan tinggi; sampel engineering dengan dominasi laki-laki; butuh skala data besar |
| Alkan et al. (2025) [11] | C5.0, CART, SVM, Random Forest + seleksi fitur Boruta & SMOTE | Sekolah menengah (Turki); 613 siswa; data kuesioner | Random Forest paling konsisten (CV 74,3%); C5.0 terbaik pada test (75,4%) | Data survei lintas-seksi, bukan riwayat nilai institusional; satu wilayah |
| Psyridou et al. (2024) [9] | Balanced Random Forest, Easy Ensemble, RSBoost, Bagging DT; 6-fold CV | Longitudinal 13 tahun (kindergarten–SMA) di Finlandia | Klasifikasi dropout yang akurat sejak akhir jenjang SD | Target dropout, bukan prediksi nilai; konteks nordik dengan data besar |
| **Proyek Ini (2026)** | Regresi terregularisasi Ridge/ElasticNet + split berbasis waktu menuju *leave-one-angkatan-out* | SMP; data riil satu sekolah (Dashboard Nesaciba); 1 angkatan lengkap (n = 61) | (dilaporkan setelah eksperimen sesuai protokol evaluasi) | Fokus interpretabilitas & kelayakan data terbatas; klaim dibatasi "bukti kelayakan" |

**Sintesis.** Berbeda dari penelitian-penelitian di atas yang mayoritas menggunakan data skala besar pada jenjang pendidikan tinggi (atau kuesioner lintas-seksi), proyek ini diterapkan pada **data riil jenjang SMP dengan keterbatasan jumlah angkatan**, sehingga pemilihan metode secara eksplisit mempertimbangkan trade-off antara akurasi dan interpretabilitas (Ridge/ElasticNet), serta memperkuat validasi melalui strategi split berbasis waktu menuju *leave-one-angkatan-out* ketika data multi-angkatan tersedia — pendekatan yang jarang ditonjolkan secara eksplisit pada penelitian sejenis. Posisi ini menegaskan bahwa proyek mengisi celah penelitian, bukan sekadar mengulang metode yang ada.

### 2.10 Kompleksitas Pekerjaan

Pekerjaan ini tergolong kompleks dan setara capstone karena memadukan tiga kelompok keilmuan sekaligus di atas satu sistem yang sedang berjalan, antara lain:

- **Lintas tiga kompetensi keilmuan.** Hasil prediksi (ISI), pengamanan akses (JKF), dan penyajian visual (TMG) saling bergantung: RBAC untuk fitur prediksi, visualisasi interval keyakinan, dan penyimpanan prediksi di satu basis data yang sama harus berjalan selaras hingga tahap UAT lintas jalur.
- **Validasi model yang non-trivial.** Kombinasi keterbatasan data (satu angkatan lengkap), aturan anti-leakage, skema split berbasis waktu menuju *leave-one-angkatan-out*, kewajiban mengalahkan baseline naif, dan pelaporan disertai interval keyakinan menjadikan evaluasi bersifat metodologis, bukan sekadar melatih model.
- **Keamanan tingkat praktik.** Migrasi hash (bcrypt/Argon2) dengan pola *upgrade-on-login*, RBAC berbasis permission, dan audit log harus diterapkan tanpa merusak akun yang sudah ada.
- **Integrasi lintas komponen.** Pipeline Python → tabel `Prediksi` → dashboard memerlukan perancangan antarmuka data yang generik, aditif, dan dapat diaudit, di atas sistem yang sudah dipakai sekolah.
- **Komunikasi hasil ke pengguna non-teknis.** Prediksi bersifat probabilistik; penyajiannya wajib menjaga guru tidak memperlakukan angka prediksi sebagai kepastian, sekaligus tetap dapat dievaluasi dan diaudit.

---

## BAB III — METODOLOGI DAN RANCANGAN

### 3.1 Metodologi Pelaksanaan

Pelaksanaan menggunakan pendekatan **Project-Based Learning (PjBL)** yang dikelola secara **Agile** dengan iterasi per dua minggu: perencanaan iterasi → eksekusi lintas jalur kerja → review hasil bersama tim → penyesuaian. Tahapan umum:

- **Tahap Persiapan.** Penguncian protokol evaluasi, pemetaan skema data, dan kelayakan dataset (sudah dilakukan dan dibekukan pada dokumen `Protokol_Evaluasi_A1.md`).
- **Tahap Implementasi.** Ekstraksi dan feature engineering, pelatihan/evaluasi model, implementasi keamanan, serta perancangan dan implementasi tampilan.
- **Tahap Pengujian & Diseminasi.** Usability testing dan UAT bersama mitra, perbaikan temuan, serta finalisasi luaran dan laporan.

### 3.2 Teknologi yang Digunakan

**Lapisan aplikasi web (yang dikembangkan):**

| Area | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) dengan React 19 dan TypeScript |
| Styling & UI | Tailwind CSS v4, komponen shadcn/ui (Card, Dialog, Tabs, Badge, dsb.) |
| Visualisasi | Recharts (donut, grouped/vertical/horizontal bar, line) |
| Autentikasi & sesi | JWT pada cookie `httpOnly` (7 hari) menggunakan `jose`, kunci `SESSION_SECRET` |
| Validasi input | Zod (login, CRUD, impor, konfigurasi RBAC) |
| Impor data | `@e965/xlsx` untuk membaca/template file Excel dan CSV |
| Basis data | PostgreSQL langsung via driver `pg` (`DATABASE_URL`) |
| Administrasi DB | DBeaver (oleh tim pengembang) |

**Lapisan machine learning (berjalan di luar aplikasi):**

| Area | Teknologi |
|---|---|
| Bahasa & pustaka | Python 3, pandas (ekstraksi & fitur), scikit-learn (Ridge/ElasticNet) |
| Penyimpanan hasil | Artefak model di luar basis data; hasil dipublikasikan ke tabel `Prediksi` |

**Keamanan:** skema hash bcrypt/Argon2 (migrasi dengan pola *upgrade-on-login*), panduan OWASP.

### 3.3 Algoritma yang Digunakan

| Komponen | Algoritma / Metode | Keterangan |
|---|---|---|
| Feature engineering | Nilai per mapel per semester yang telah lewat, agregat per semester, rasio kehadiran, lag/delta antarsemester, z-score relatif (dihitung dalam fold), encoding kategorikal | Format wide (satu baris per siswa); dilarang memakai fitur dari semester/angkatan target (anti-leakage) |
| Model utama | Regresi terregularisasi **Ridge/ElasticNet** | Sederhana, stabil pada data kecil, dan interpretable (koefisien tiap fitur dapat dijelaskan) |
| Baseline naif | "Prediksi = nilai semester sebelumnya" (B0), rata-rata angkatan (B1), rule berbasis ambang (B2) | Model baru dinyatakan berguna hanya jika mengalahkan baseline |
| Validasi | Split berbasis waktu; bila ≥2 angkatan tersedia digunakan *leave-one-angkatan-out* | Fold ditentukan oleh angkatan, bukan siswa |
| Evaluasi | MAE, RMSE, MAPE (regresi); accuracy, F1-score, recall (klasifikasi); interval keyakinan bootstrap; ablasi berurutan dengan seed tetap | Sesuai `Protokol_Evaluasi_A1.md` |
| Keamanan autentikasi | bcrypt/Argon2 dengan pola *upgrade-on-login* | Menggantikan SHA-256 tanpa salt |

### 3.4 Platform yang Digunakan

- **Aplikasi:** web (browser modern: Chrome, Edge, Firefox), dioptimalkan untuk desktop dan tetap responsif pada tablet/mobile.
- **Server/backend:** Node.js (Next.js) menyatu dengan basis data PostgreSQL.
- **Lingkungan machine learning:** notebook Python (Jupyter) pada perangkat pengembangan lokal; pipeline membaca data melalui kredensial basis data **read-only** agar tidak mengubah data yang dipakai sekolah.
- **Penyebaran:** selama masa pelaksanaan capstone, sistem dijalankan pada lingkungan pengembangan dan pengujian tim. Keputusan lingkungan penyebaran final (server milik sekolah atau layanan cloud) ditetapkan bersama mitra saat UAT/berita acara; seluruh kode dan skema tetap berada dalam kendali penuh pengguna.
- **Alat pendukung:** git untuk kendali versi, DBeaver untuk administrasi basis data, dan environment Python terpisah untuk pipeline machine learning.

### 3.5 Dataset dan Sumber Data

- **Sumber data:** basis data PostgreSQL Dashboard Akademik Nesaciba SMPN 1 Cibalong. Data akademik di dalamnya merupakan **data riil** hasil impor oleh operator melalui fitur impor Excel yang sudah ada, bukan data simulasi. Migrasi data historis dari sekolah dapat menambah cakupan bila tersedia.
- **Struktur data:** skema berjenjang Angkatan → Kelas → Siswa; nilai per mata pelajaran per semester (enam semester); rekap kehadiran per siswa per semester; katalog mata pelajaran dengan ±11 mapel yang berlaku bagi suatu angkatan.
- **Karakteristik:** bersifat **panel longitudinal** — satu siswa diikuti berulang dari semester ke semester; mapel tanpa data dibedakan tegas dari nilai 0 (aturan `mapelDenganNilai()`), sehingga metrik dan tampilan tidak terdistorsi.
- **Cakupan saat ini (per September 2026):** **1 angkatan, 6 kelas, 61 siswa, 6 semester**, dengan ±11 dari 13 mapel katalog yang terisi. Estimasi volume data:
  - Baris `NilaiSiswa` ≈ 61 siswa × 6 semester × ±11 mapel ≈ **±4.000 baris**;
  - Baris `KehadiranSiswa` ≈ 61 siswa × 6 semester ≈ **366 baris**;
  - Baris pada format wide (satu baris per siswa) = **61 baris**.
  Angka pasti akan dilaporkan pada laporan teknis saat eksekusi karena data bersifat dinamis mengikuti musim semester.
- **Format data:** relasional PostgreSQL, diekstrak menjadi format wide (CSV/DataFrame) pada pipeline machine learning; data historis tambahan (bila disediakan sekolah) diimpor melalui template Excel standar yang sudah ada.
- **Status data:** data sudah terisi nyata oleh operator, tetapi **belum ditetapkan secara resmi** oleh sekolah sebagai acuan resmi (belum ada keputusan formal/pengesahan). Karena itu hasil evaluasi hanya diklaim sebagai **bukti kelayakan**, sesuai `Protokol_Evaluasi_A1.md`.
- **Pengelolaan dan etika:** data pribadi siswa dilindungi; pipeline membaca dengan kredensial read-only; hanya hasil prediksi yang bernilai yang dipublikasikan ke tabel `Prediksi`; setiap akses/perubahan terekam pada audit log.

### 3.6 Rancangan Perangkat Lunak / Desain / Mockup

Arsitektur tiga lapis: **aplikasi web (Next.js)** menampilkan data; **basis data PostgreSQL** menyimpan data akademik dan hasil prediksi; **pipeline Python** melatih model dan menerbitkan hasil tanpa menyentuh aplikasi.

Alur data:

```
PostgreSQL → train.py (kredensial read-only) → fitur wide → latih & evaluasi
          → artefak model (.joblib + params + metrik + versi, di luar DB)
          → posting.py → tabel Prediksi → getDb() → tab "Proyeksi" pada detail siswa
```

Rancangan tabel `Prediksi` (migrasi SQL bernomor, kolom utama):

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | text | Identitas baris prediksi (generator ID sistem) |
| skenario | text | Label skenario, pada cakupan ini `A1` |
| level | text | Entitas yang diprediksi: `siswa` |
| entitas_id | text | ID siswa (tanpa foreign key agar generik) |
| tahun / semester_target | text / int | Sasaran prediksi |
| nilai_prediksi | numeric | Nilai prediksi (skala 0–100) |
| interval_lower / interval_upper | numeric | Rentang keyakinan |
| versi_model | text | Jejak versi model beserta metriknya |
| metrik_error | text | Metrik model versi tersebut |
| dibuat_pada | timestamptz | Waktu penerbitan |

Alur pengguna: login dengan akun peran (Superadmin, Operator, Guru) → menu dinamis per role (RBAC) → Guru membuka **Pencarian Siswa** → popup **detail siswa** berisi tab **Nilai** dan **Kehadiran**; pada fase ini ditambahkan tab **"Proyeksi"**.

Desain tab "Proyeksi" (mockup tekstual; mockup visual detail dilampirkan terpisah):

- Tabel prediksi per mata pelajaran untuk semester berikutnya, masing-masing dengan **nilai prediksi** dan **rentang interval keyakinan** (ditampilkan sebagai band/garis pada grafik).
- Keterangan "hasil model — bukan kepastian" dan referensi versi model yang menghasilkan prediksi (traceability).
- Bila model/baseline belum tersedia untuk suatu mapel, muncul placeholder "belum dapat diproyeksikan".
- Kartu ringkasan proyeksi rata-rata kelas (agregat lintas siswa) ditunda sebagai fase lanjutan dan tidak termasuk cakupan saat ini.
- Tampilan responsif: pada layar lebar ditampilkan sebagai tabel; pada layar kecil dialihkan menjadi kartu per mapel. Tipografi dan skema warna mengikuti design system shadcn/ui yang sudah dipakai.

### 3.7 Pembagian Peran dan Tugas Masing-Masing Anggota

Tim beranggotakan empat orang dengan latar belakang kompetensi keahlian berbeda; pembagian tugas dirancang agar setiap anggota berkontribusi sesuai kompetensinya secara berkelanjutan sepanjang pelaksanaan proyek.

| Anggota | Kompetensi Keahlian (KK) | Tugas Inti |
|---|---|---|
| Daffa Bariq Suwandi | Informatika dan Sistem Intelegen (ISI) | Membangun model machine learning: ekstraksi dan feature engineering skenario A1, pelatihan dan evaluasi (Ridge/ElasticNet, split berbasis waktu dan *leave-one-angkatan-out* bila data mencukupi), perbandingan terhadap baseline naif, dan koordinasi migrasi data historis; merancang skema tabel `Prediksi` bersama JKF. |
| Andi Rafiyan | Jaringan Komputer, Keamanan dan Forensik Digital (JKF) | Lead jalur keamanan: implementasi migrasi skema hash password (SHA-256 ke bcrypt/Argon2) dengan pola *upgrade-on-login*, implementasi reset password mandiri, implementasi RBAC khusus fitur hasil prediksi, penguatan audit log, dan integrasi keamanan lintas modul. |
| Ayu Barkilah | Jaringan Komputer, Keamanan dan Forensik Digital (JKF) | Jaminan kualitas jalur keamanan dan data: verifikasi hasil migrasi hash dan skenario RBAC fitur prediksi, dukungan penerapan alur reset password mandiri, penyusunan laporan audit keamanan dasar mengacu OWASP, pemeriksaan traceability tabel `Prediksi`, dan koordinasi UAT dengan mitra. |
| Piki Alpian | Teknologi Multimedia dan Gim (TMG) | Pengalaman pengguna: perancangan dan implementasi tampilan responsif/mobile, desain visualisasi kartu "Proyeksi" (termasuk interval keyakinan) menggunakan Recharts/shadcn/ui, dan purwarupa desain visual fitur ekspor laporan/rapor akademik. |

### 3.8 Timeline Penyelesaian Pekerjaan

Pelaksanaan pekerjaan berlangsung dalam kurun **setelah UTS hingga sebelum UAS** — dimulai pada **Minggu ke-9** perkuliahan. Tahapan disusun sebagai milestone per dua minggu:

| Kurun Waktu | Kegiatan |
|---|---|
| Minggu 9–10 | Pekan awal pelaksanaan: finalisasi rancangan fitur wide skenario A1 dan skema tabel `Prediksi` (ISI), rancangan RBAC fitur prediksi dan migrasi hash password (JKF), rancangan tampilan responsif dan kartu "Proyeksi" (TMG); koordinasi data historis ke sekolah. |
| Minggu 11–12 | Ekstraksi dan feature engineering A1 (ISI); implementasi migrasi hash password dan alur reset password mandiri (JKF); implementasi tampilan responsif tahap awal (TMG); integrasi rancangan visual kartu "Proyeksi". |
| Minggu 13–14 | Pelatihan dan evaluasi model A1 terhadap baseline naif (ISI); penyelesaian RBAC fitur prediksi, penguatan audit log, dan audit keamanan dasar (JKF); integrasi visual kartu "Proyeksi" ke dashboard (TMG). |
| Minggu 15 – menjelang UAS | UAT lintas tiga jalur kerja dengan guru dan operator mitra; perbaikan temuan; finalisasi luaran (laporan teknis, notebook terdokumentasi, laporan audit keamanan); pemantapan manual dan materi diseminasi sebelum presentasi akhir. |

Manajemen proyek, koordinasi data, dan logbook berjalan sepanjang kurun tersebut.

---

## BAB IV — RENCANA PENGUJIAN

### 4.1 Skenario Pengujian

Skenario pengujian diformat sebagai (kondisi awal → aksi → hasil yang diharapkan):

| Jalur | Kondisi Awal | Aksi | Hasil yang Diharapkan |
|---|---|---|---|
| ISI — ekstraksi & fitur | Data satu angkatan tersedia di PostgreSQL | Membangun fitur wide dan memeriksa isi kolom | Format wide benar; tidak ada kolom yang berasal dari semester/angkatan target (pemeriksaan leakage); pemetaan mapel mengikuti aturan mapel berlaku. |
| ISI — model | Baseline naif dan model Ridge/ElasticNet siap dijalankan | Evaluasi kuantitatif A1 (MAE/RMSE/MAPE, atau accuracy/F1/recall) pada split berbasis waktu | Metrik dilaporkan lengkap dengan n, interval keyakinan, dan daftar mapel berlaku; model dinyatakan berguna hanya jika selisih terhadap baseline naif mendukung (ΔMAE terhadap B0). |
| Integritas data `Prediksi` | Tabel `Prediksi` diisi hasil model | Menelusuri setiap baris | Setiap baris dapat ditelusuri ke skenario, entitas, versi model, dan metriknya (auditable). |
| JKF — autentikasi | Akun lama memakai hash SHA-256 | Login dengan akun lama; uji alur reset password mandiri | Akun lama tetap dapat login (skema lama diverifikasi lalu hash di-upgrade); password dapat direset mandiri melalui alur yang aman. |
| JKF — RBAC | Role tanpa dan dengan permission `prediksi.read` | Skenario peran tanpa permission mencoba membuka tab "Proyeksi"; peran dengan permission mencoba hal yang sama | Akses tanpa permission ditolak; akses dengan permission berhasil. |
| TMG — responsif | Halaman dashboard, rekap, dan pencarian siswa siap | Pengujian pada ukuran layar mobile, tablet, dan desktop | Halaman-halaman utama dapat digunakan pada mobile, tablet, dan desktop tanpa pemotongan konten. |
| Usability & UAT | Skenario nyata dengan guru dan operator mitra | Guru membuka detail siswa, membaca tab "Proyeksi" beserta interval keyakinan, dan memberi umpan balik; operator memahami alur pembaruan model | Umpan balik terdokumentasi; guru memahami bahwa angka prediksi bersifat perkiraan berserta rentangnya; temuan ditindaklanjuti. |

### 4.2 Parameter Uji dan Penjelasannya

| Parameter | Definisi / Penjelasan | Alasan Digunakan | Target / Ambang |
|---|---|---|---|
| MAE / RMSE / MAPE | Ukuran error regresi: rata-rata galat mutlak, akar kuadrat rata-rata galat kuadrat, galat persentase rata-rata. | MAE mudah dibaca guru (poin nilai); RMSE peka terhadap kesalahan besar; MAPE pelengkap. | Lebih rendah dari baseline naif pada skenario evaluasi; dilaporkan bersama n dan interval keyakinan. |
| Accuracy / F1-score / recall | Metrik klasifikasi untuk deteksi kelas "perlu perhatian". | Recall diprioritaskan agar siswa berisiko tidak terlewat. | Ambang ditetapkan bersama sekolah; recall memadai menurut keputusan bersama. |
| Baseline naif (B0/B1/B2) | Titik banding sederhana ("prediksi = nilai semester sebelumnya", rata-rata angkatan, rule berbasis ambang). | Menjawab "kenapa butuh machine learning". | Model baru dinyatakan berguna hanya jika mengungguli baseline; pelaporan berupa ΔMAE terhadap B0. |
| Interval keyakinan | Rentang prediksi (bootstrap CI) yang disertakan pada tampilan. | Agar guru memahami ketidakpastian dan tidak memperlakukan prediksi sebagai kepastian. | Selalu disertakan pada tab "Proyeksi"; lebar interval dilaporkan. |
| Traceability `Prediksi` | Kemampuan menelusuri tiap baris ke skenario, entitas, versi model, dan metrik. | Menjaga hasil dapat diaudit. | Seluruh baris dapat ditelusuri (auditable). |
| Kontrol akses RBAC | Permission `prediksi.read` membatasi akses tab "Proyeksi". | Membatasi hasil prediksi hanya pada role yang berhak. | Peran tanpa permission tidak dapat mengakses; default diberikan Guru dan Operator. |
| Migrasi hash | Pola *upgrade-on-login* dari SHA-256 ke bcrypt/Argon2. | Menguatkan penyimpanan kredensial tanpa mengunci akun lama. | Akun lama tetap bisa login; hash diperbarui ke skema baru tanpa reset massal. |
| Tampilan responsif | Kemampuan halaman digunakan pada berbagai ukuran layar. | Mendukung akses dari perangkat seluler. | Halaman utama dapat digunakan pada mobile, tablet, dan desktop. |
| UAT | Pengujian penerimaan bersama guru/operator mitra. | Memastikan sistem diterima pengguna nyata. | Umpan balik terdokumentasi dan menjadi dasar perbaikan. |

---

## BAB V — LUARAN DAN PENUTUP

### 5.1 Luaran yang Ditargetkan

- **Notebook dan laporan teknis ML yang terdokumentasi:** feature engineering, ablasi berurutan, perbandingan terhadap baseline naif, metrik disertai n dan interval keyakinan, sesuai `Protokol_Evaluasi_A1.md`; artefak model (`.joblib` + parameter + metrik + versi) tersimpan di luar basis data.
- **Implementasi tabel `Prediksi`** sebagai migrasi SQL bernomor beserta data prediksi terbit untuk angkatan yang sedang berjalan, generik dan dapat ditelusuri.
- **Implementasi penguatan keamanan:** migrasi hash password (bcrypt/Argon2), reset password mandiri, RBAC khusus fitur hasil prediksi, dan audit log yang diperkuat.
- **Laporan audit keamanan dasar** mengacu OWASP beserta tindak lanjutnya.
- **Tampilan responsif dan kartu "Proyeksi"** pada detail siswa dengan rentang ketidakpastian, termasuk purwarupa desain visual fitur ekspor laporan (fase lanjutan, hanya desain).
- **Hasil usability testing dan UAT** bersama guru dan operator mitra (dokumentasi temuan dan tindak lanjut).
- **Manual/runbook pembaruan model** bagi operator sekolah agar pembaruan dapat dilakukan setelah serah terima.

### 5.2 Penutup

Proyek ini menaikkan peran Dashboard Akademik Nesaciba dari sekadar sistem rekap deskriptif menjadi sistem yang mampu memberi **peringatan dini akademik**, dengan **keamanan yang lebih kuat**, dan **pengalaman pengguna yang lebih baik** — semuanya dibangun di atas sistem yang sudah berjalan tanpa mengubah fitur inti. Dengan menegaskan protokol evaluasi yang dibekukan sebelum pelatihan, pembagian validasi berbasis waktu, kewajiban mengalahkan baseline naif, dan pelaporan yang jujur terhadap keterbatasan data, hasil yang diklaim tetap dapat dipertanggungjawabkan. Seluruh luaran akan diserahkan kepada mitra beserta dokumentasi teknis dan manual pembaruan, sebagai dasar pengembangan lebih lanjut di masa mendatang.

---

## DAFTAR PUSTAKA

1. T. Hastie, R. Tibshirani, and J. Friedman, *The Elements of Statistical Learning: Data Mining, Inference, and Prediction*, 2nd ed. New York, NY, USA: Springer, 2009. [Online]. Available: https://hastie.su.domains/ElemStatLearn/
2. F. Pedregosa et al., "Scikit-learn: Machine learning in Python," *Journal of Machine Learning Research*, vol. 12, pp. 2825–2830, 2011. [Online]. Available: https://www.jmlr.org/papers/v12/pedregosa11a.html
3. W. Xiao, P. Ji, and J. Hu, "A survey on educational data mining methods for predicting students' performance," *Engineering Reports*, vol. 4, no. 5, e12482, 2022, doi: 10.1002/eng2.12482.
4. H. Zou and T. Hastie, "Regularization and variable selection via the elastic net," *Journal of the Royal Statistical Society: Series B*, vol. 67, no. 2, pp. 301–320, 2005. [Online]. Available: https://hastie.su.domains/Papers/elasticnet.pdf
5. OWASP Foundation, "Password Storage Cheat Sheet," *OWASP Cheat Sheet Series*. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
6. N. Provos and D. Mazières, "A future-adaptable password scheme," in *Proc. USENIX Annual Technical Conference*, 1999. [Online]. Available: https://www.usenix.org/legacy/publications/library/proceedings/usenix99/full_papers/provos/provos.pdf
7. J. Hullman, P. Resnick, and E. Adar, "Hypothetical outcome plots outperform error bars and violin plots for inferences about reliability of variable ordering," *PLOS ONE*, vol. 10, no. 11, e0142444, 2015, doi: 10.1371/journal.pone.0142444.
8. E. Marcotte, "Responsive Web Design," *A List Apart*, 2010. [Online]. Available: https://alistapart.com/article/responsive-web-design/
9. M. Psyridou, F. Prezja, M. Torppa, M.-K. Lerkkanen, A.-M. Poikkeus, and K. Vasalampi, "Machine learning predicts upper secondary education dropout as early as the end of primary school," *Scientific Reports*, vol. 14, art. 12956, 2024, doi: 10.1038/s41598-024-63629-0.
10. Q. Li, Y. Liu, R. Ma, and Q. Wu, "Academic early warning model based on machine learning and model application," *Scientific Reports*, vol. 16, art. 25621, 2026, doi: 10.1038/s41598-026-51767-6. [Online]. Available: https://www.nature.com/articles/s41598-026-51767-6
11. B. B. Alkan, S. Kuzucuk, N. Alkan, and A. Sinan, "Using machine learning to predict student outcomes for early intervention and formative assessment," *Scientific Reports*, vol. 15, art. 39797, 2025, doi: 10.1038/s41598-025-23409-w. [Online]. Available: https://www.nature.com/articles/s41598-025-23409-w
12. Tim Pengembang, *Product Requirements Document - Dashboard Akademik SMPN 1 Cibalong (Nesaciba) v1.0*, 2026.
13. Tim Pengembang, *ML Roadmap - Prediksi Nilai & Peringatan Dini Akademik (Dashboard Akademik Nesaciba) v1.0*, 2026.
14. Tim Pengembang, *Protokol Evaluasi A1 - Prediksi Nilai Semester Berikutnya*, 2026.
15. Program Studi Informatika, Universitas Siliwangi, *Pedoman Pelaksanaan Capstone Project*, Fakultas Teknik, Universitas Siliwangi, 2026.
16. Program Studi Informatika, Universitas Siliwangi, *Rencana Pembelajaran Semester Capstone Project (KP70067002)*, Fakultas Teknik, Universitas Siliwangi, 2026.