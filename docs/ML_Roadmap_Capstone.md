# MACHINE LEARNING ROADMAP — DASHBOARD AKADEMIK NESACIBA

## Konsep Penerapan Machine Learning untuk Capstone Project

**STATUS: KONSEP ARSITEKTUR — CAPSTONE**

|||
|-|-|
|**Nama Dokumen**|ML Roadmap — Prediksi Nilai & Peringatan Dini Akademik|
|**Versi Dokumen**|v1.0 · Revisi 1|
|**Disusun oleh**|Tim Pengembang (Capstone Project)|
|**Untuk**|SMPN 1 Cibalong (Klien) / Proyek Capstone bersama rekan|
|**Tanggal**|29 September 2026|
|**Dokumen Terkait**|`PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md`; `Protokol_Evaluasi_A1.md` (protokol evaluasi yang sudah dibekukan); `src/lib/db/schema.sql`; `src/lib/db/migrations/README.md`; `README.md`|

---

# 1. Latar Belakang & Tujuan

Dashboard Akademik Nesaciba menyimpan data akademik siswa secara terstruktur: angkatan, kelas, siswa, nilai (katalog 13 mata pelajaran; ±11 yang berlaku bagi suatu angkatan, 6 semester), dan kehadiran per semester. Data ini sebenarnya dapat dimanfaatkan lebih dari sekadar rekap — yaitu untuk **prediksi** dan **peringatan dini** kinerja akademik siswa/guru.

Dokumen ini menyusun konsep penerapan **Machine Learning (ML)** di atas data tersebut sebagai rencana **capstone project** bersama rekan pengembang. Tujuannya bukan sekadar membangun model, tetapi membuktikan bahwa:

1. Data akademik yang sudah ada layak dijadikan bahan belajar mesin (feature engineering dari pola nilai & kehadiran).
2. Terdapat lebih dari satu skenario penerapan dengan kebutuhan data dan tingkat kesiapan yang berbeda.
3. Setiap skenario dirancang dengan proses training dan evaluasi yang jelas serta terukur (bukan asal prediksi).

Dokumen ini bersifat konsep/arsitektur — **belum ada eksekusi kode** pada tahap ini.

# 2. Kelayakan & Ringkasan Skenario

Sifat data saat ini adalah **panel longitudinal** (per angkatan: 6 semester ke dalam), bukan **time series antar-angkatan** (deret antar tahun). Perbedaan ini menentukan mana skenario yang layak segera dan mana yang baru layak setelah data historis terkumpul.

| Skenario | Level | Butuh minimal | Waktu siap digunakan | Sumber data |
|---|---|---|---|---|
| **A1** Early-warning nilai siswa | Siswa | 1 angkatan lengkap (6 semester) | Segera — bisa di-*pilot* dengan 1 angkatan | Skema yang ada sudah cukup |
| **A2** Prediksi rata-rata akhir angkatan berjalan | Angkatan | 1 angkatan lengkap untuk kalibrasi; ideal 3+ | Segera–1 tahun (lihat Bab 4) | Skema yang ada sudah cukup |
| **B1** Peringatan dini risiko kelas | Kelas | 2–3 angkatan (±12–36 unit kelas) | Setelah 2+ angkatan tersedia | Skema yang ada sudah cukup |
| **B2** Forecast lintas tahun ("beberapa tahun ke depan") | Angkatan | ≥8 angkatan (rule of thumb), ideal 10–15+ | Setelah data historis diimpor manual | Wajib impor manual + fitur kontekstual |

> **Realitas data saat ini (per 29 September 2026).** Database produksi memuat
> **1 angkatan, 6 kelas, 61 siswa, 6 semester** — bukan 150+ siswa seperti
> diasumsikan pada tahapan awal dokumen ini. Artinya ukuran sampel untuk A1
> adalah `n = 61`, bukan 1.000-an. Angka ini **cukup untuk menjalankan alur
> kerja end-to-end, tetapi tidak cukup untuk klaim akurasi**, dan hanya dapat
> diklaim sebagai "bukti kelayakan" (lihat `Protokol_Evaluasi_A1.md` §10).
> Menyusun feature yang banyak pada `n = 61` akan menghasilkan overfitting;
> karena itu skenario A1 dimulai dari model regularized dan ablation bertahap.
>
> Catatan kedua: angkatan ini belum terisi penuh pada semua mapel. Data
> importer menunjukkan sekitar 11 dari 13 mapel terisi, karena SBK dan
> Prakarya merupakan mapel kurikulum lama. Pipeline wajib menerapkan aturan
> applicability mapel (lihat §3.1 dan `Protokol_Evaluasi_A1.md` §4) agar
> mapel tanpa data tidak ikut menurunkan rata-rata.

Catatan penting: prediksi "beberapa tahun ke depan" (B2) adalah *multi-step time-series forecast* — model butuh barisan observasi **antar-angkatan** (mis. rata-rata Matematika angkatan 2016, 2017, …, 2026), bukan barisan semester dalam satu angkatan. Karena itu minimum datanya jauh lebih besar dan tidak bisa dipangkas dengan menambah jumlah semester.

---

# 3. Skenario A1 — Early-Warning Nilai Per Siswa

**Tujuan:** Saat siswa baru memiliki data semester 1–2, prediksi nilai semester 3–6 dan rata-rata akhir, sehingga guru dapat melakukan intervensi lebih awal (mis. bimbingan khusus bagi siswa yang diprediksi menurun).

## 3.1 Kebutuhan Data

Seluruh fitur di bawah **dapat diturunkan dari skema yang ada** — tidak perlu mengubah kolom aplikasi:

| Fitur | Sumber | Bentuk |
|---|---|---|
| Nilai mapel pada semester `k` (0–100), **hanya mapel yang berlaku bagi cohort tersebut** | `NilaiSiswa` | Numerik |
| Agregat per semester: rata-rata, min, max, std dev | turunan | Numerik |
| Kehadiran sebagai **rasio** terhadap hari efektif (aplikasi memakai asumsi 36 hari/semester) | `KehadiranSiswa` | 0–1 |
| Lag / delta: rata-rata semester `k-1`, `k-2`, selisih per mapel | turunan | Numerik |
| `jenis_kelamin`, `kelas` | `Siswa`, `Kelas` | Kategorikal (one-hot) |
| Normalisasi rata-rata per kelas/angkatan (z-score) | turunan | Numerik |
| **Daftar mapel yang berlaku per cohort** + jumlah mapel berlaku | turunan, mengikuti aturan `mapelDenganNilai()` | Flag / count |

> **Aturan applicability mapel — jangan diulang, jangan diimplementasikan ulang.**
> Katalog `MataPelajaran` berisi 13 entri dan bersifat global, sedangkan
> kurikulum berbeda antar angkatan. Pada aplikasi, nilai `null` berarti "mapel
> tidak berlaku / tidak ada data sama sekali", **bukan nilai 0**. Pipeline ML
> **wajib memakai definisi yang sama** dengan aplikasi, yaitu
> `mapelDenganNilai()` di `src/server/service/statistics.ts`, supaya laporan
> dashboard dan laporan model tidak berbeda definisi. Aturan lengkap beserta
> alasannya ada di `Protokol_Evaluasi_A1.md` §4.
>
> Catatan: asumsi 36 hari/semester bukan kolom di database, melainkan konstanta
> yang dipakai halaman daftar siswa dan kelola data. Bila angka hari efektif
> berubah, pipeline harus memakai konstanta yang sama agar tidak menyimpang.

Target (pilih salah satu atau kombinasi):
- **Regresi:** nilai semester `k+1` per mapel, atau rata-rata semester berikutnya, atau rata-rata akhir.
- **Klasifikasi:** kategori mengikuti tone UI yang sudah ada — ≥80 "baik", 70–79 "cukup", <70 "perlu perhatian".

## 3.2 Proses Training

1. Ekstraksi dari PostgreSQL → format **wide** (1 baris = 1 siswa, kolom fitur + kolom target).
2. Split **berbasis waktu**, bukan random: latih pada angkatan ≤ `t`, validasi angkatan `t+1`. Untuk pilot 1 angkatan: latih dari fitur semester 1–2 → prediksi semester 3–6 (holdout internal), atau *leave-one-semester-out*.
3. Mulai dari **Ridge / ElasticNet** (data kecil, cepat, stabil), lalu naik ke **XGBoost / LightGBM** bila data > 3 angkatan.
4. **Hindari data leakage:** jangan memakai kehadiran semester target sebagai fitur; jangan memakai rata-rata akhir untuk memprediksi semester tengah.

## 3.3 Evaluasi

- Regresi: **MAE / RMSE / MAPE**. Target realistis MAE 4–6 poin pada skala 0–100; MAPE di bawah ≈8%.
- Klasifikasi: accuracy, F1-score, matriks konfusi. Yang lebih penting: **recall kelas "perlu perhatian"** — lebih baik salah-kategorikan seorang siswa sebagai perlu perhatian daripada terlewat.
- Wajib dibandingkan dengan **baseline naif** ("prediksi = nilai semester sebelumnya"); model dianggap berguna hanya jika mengalahkannya.

---

# 4. Skenario A2 — Prediksi Rata-rata Akhir Angkatan Berjalan

**Tujuan:** Memprediksi rata-rata akhir suatu angkatan saat data semester 1–2 baru berjalan, sebagai indikator peringatan dini level sekolah.

- Data: rata-rata semester 1–2 per mapel, distribusi (std), angka kehadiran agregat, jumlah siswa, rasio gender.
- Training/evaluasi: regresi (Ridge) + backtest terhadap angkatan-angkatan sebelumnya. Karena jumlah sampel = jumlah angkatan, modelnya sederhana; hasilnya dipakai sebagai **indikator peringatan dini**, bukan akurasi presisi.

## Catatan: makna "Segera–1 tahun" pada kolom waktu siap digunakan

Rentang ini mencerminkan dua tingkat kesiapan:

- **"Segera"** — untuk angkatan yang **sedang berjalan**. Begitu semester 1–2 angkatan berjalan terisi (masih dalam tahun ajaran yang sama), model yang dikalibrasi terhadap 1 angkatan lengkap langsung dapat memproduksi prediksi rata-rata akhir angkatan tersebut.
- **"1 tahun"** — untuk versi yang **tervalidasi jujur (backtest)**. Diperlukan minimal satu siklus tahun ajaran berikutnya (satu angkatan lagi selesai) sehingga ada ≥2 angkatan lengkap untuk menguji akurasi prediksi sebelumnya.

Ringkasnya: keluaran cepat tersedia, tetapi klaim akurasi yang teruji baru bisa dibuat setelah ~1 tahun (satu angkatan lagi tuntas).

---

# 5. Skenario B1 — Peringatan Dini Risiko Kelas

**Tujuan:** Memprediksi kelas yang berpotensi rata-ratanya turun/naik pada semester berikutnya, agar perhatian guru/kurikulum diarahkan lebih tepat.

- Unit analisis: **kelas** (bukan siswa).
- Fitur: rata-rata kelas per mapel (semester `k`), kehadiran kelas, jumlah siswa, rasio gender, delta antar-semester.
- Kebutuhan data: **2–3 angkatan** agar jumlah unit kelas cukup (6–18 unit per angkatan).
- Training: regresi (besaran rata-rata) dan/atau klasifikasi risiko (naik/turun).
- Evaluasi: RMSE untuk regresi; akurasi arah tren (naik/turun) untuk klasifikasi; validasi silang *leave-one-angkatan-out*.

# 6. Skenario B2 — Forecast Nilai Beberapa Tahun ke Depan

**Tujuan:** Memprediksi rata-rata nilai untuk angkatan-angkatan mendatang (2027, 2028, dst.) dari tren angkatan-angkatan sebelumnya.

## 6.1 Kebutuhan Data

| Aspek | Minimum | Ideal |
|---|---|---|
| Jumlah angkatan historis | 8 | 10–15+ |
| Semester per angkatan | 6 | 6 |
| Mapel konsisten antar tahun | 11 | 11 (katalog saat ini 13; perlu normalisasi bila nama/kode berubah, dan mapel tidak berlaku per tahun harus dikecualikan) |
| Fitur kontekstual (eksternal) | 0 (model lemah) | 5–10 (lihat bawah) |

**Fitur kontekstual yang belum ada di database** (perlu dicatat agar model kuat):
- Jumlah pendaftar / kuota PPDB.
- Tahun kurikulum (K-13 vs Kurikulum Merdeka).
- Pergantian guru per mapel.
- Perubahan jam pelajaran per mapel.
- Perubahan kebijakan/zonasi, insentif guru.

Tanpa fitur kontekstual, model hanya mengekstrapolasi tren — secara statistik lemah dan mudah salah saat terjadi perubahan kurikulum/guru.

## 6.2 Proses Training

1. Bangun deret historis: untuk setiap angkatan → rata-rata per mapel per semester, std, kehadiran, jumlah siswa, rasio gender.
2. Dua pendekatan:
   - **Panel regression:** fitur per angkatan → prediksi angkatan berikutnya (one-step).
   - **Time-series per mapel:** ARIMA/ETS, atau NeuralProphet bila tersedia ≥10 titik, pada deret "rata-rata mapel terhadap tahun angkatan".
3. **Rolling one-step:** forecast diperbarui tiap tahun saat data baru masuk (kalibrasi ulang tiap semester). Jangan memproduksi prediksi multi-tahun sekaligus karena error menumpuk.
4. Laporkan **interval keyakinan**, bukan angka tunggal, karena ketidakpastian membesar seiring horizon.

## 6.3 Evaluasi

- **Backtest rolling:** latih hingga angkatan `t`, uji pada angkatan `t+1`, lalu geser maju; laporkan rata-rata MAE/MAPE.
- Wajib dikalahkan *baseline naive* ("rata-rata angkatan sebelumnya") dan *linear trend*; periksa MAPE per mapel secara terpisah.

# 7. Data Historis & Migrasi Manual

## Realitas data saat ini

Seed produksi (`src/lib/db/seed-postgres.ts`) **sengaja mengosongkan seluruh data akademik** — isinya hanya RBAC dan 13 mapel. Jadi angka yang ada di database berasal dari **impor oleh operator**, bukan dari seed. Saat ini yang terisi: **1 angkatan, 6 kelas, 61 siswa, 6 semester, ±11 dari 13 mapel**.

Konsekuensinya untuk A1: jumlah unit analisis adalah `n = 61`. Pipeline bisa dijalankan, tetapi hasilnya hanya layak diklaim sebagai **bukti kelayakan**, bukan sebagai evaluasi generalisasi.

## Mengimpor data historis

Data beberapa tahun ke belakang (diperlukan untuk B2) harus **dipindahkan manual dari sekolah**, tanpa mengubah kolom aplikasi:

1. Buat satu entri `Angkatan` untuk setiap tahun lama. Penambahan angkatan otomatis membuat 6 kelas default A–F, jadi periksa apakah jumlah kelas lama sesuai.
2. Impor nilai/kehadiran per angkatan memakai **fitur Import Data Excel yang sudah ada**. Perilaku importer saat ini yang perlu diketahui:
   - Kolom mapel diidentifikasi dengan **kode** (`MTK`, `BIN`, `SBK`), bukan nama panjang. Unduh template lebih dulu agar nama kolom persis sama.
   - Kolom kehadiran (Sakit, Izin, Tanpa Keterangan) **opsional**. Bila file tidak memilikinya, data kehadiran yang sudah ada tidak ditimpa.
   - Impor bersifat **all-or-nothing**: satu baris cacat membuat seluruh file ditolak. Untuk data historis beribu baris, operator harus membersihkan file secara bertahap sampai bersih.
   - **NIS yang sudah terdaftar di kelas lain akan ditolak** sebagai error. Karena itu urutan impor penting: kelas angkatan tersebut diperluas lebih dulu, atau file historis diimpor ke angkatan yang benar sejak awal.
   - Setelah impor, **periksa laporan kualitas kolom** pada halaman import: kolom yang dilaporkan "tidak terisi sama sekali" adalah indikasi nama kolom salah ketik dan berarti nilai diam-diam tidak masuk.
3. Bersihkan inkonsistensi sebelum/sesudah impor:
   - **Penamaan mapel antar tahun** tidak perlu disamakan manual satu per satu. Importer sudah me-*resolve* kolom dari kode, nama persis, alias, lalu pencocokan kemiripan, dan menampilkan saran bila gagal dikenali. Yang tetap menjadi tanggung jawab operator adalah **memverifikasi** hasil resolusi itu lewat laporan kualitas kolom.
   - Perubahan kurikulum (nilai bisa terinflasi/depresiasi antar tahun).
   - Jumlah kelas berbeda per angkatan di masa lampau.
   - Mapel kurikulum lama (SBK, Prakarya) akan tersimpan di katalog global yang sama dengan mapel aktif. Jangan dianggap sebagai mapel yang berlaku di semua tahun — terapkan aturan applicability per cohort.
4. Simpan **arsip agregat** (bukan hanya data mentah) ke tabel `RiwayatAngkatan` agar deret historis selalu tersedia meskipun angkatan lama dihapus dari menu Master Data.

---

# 8. Infrastruktur Data yang Diusulkan

Dua tabel tambahan yang **tidak mengubah kolom/struktur aplikasi yang ada**. Penting untuk dipahami: kedua tabel ini **tidak bersifat universal** — masing-masing melayani skenario yang berbeda.

## 8.1 Tabel `Prediksi` — Universal (dipakai semua skenario)

Tabel ini menampung **hasil prediksi** dari skenario apa pun (A1, A2, B1, B2) yang perlu disimpan, dievaluasi lintas waktu, atau ditampilkan di dashboard. Rancangan generik (contoh kolom):

- `skenario` — label (A1, A2, B1, B2).
- `level` — entitas yang diprediksi: `siswa`, `kelas`, atau `angkatan`.
- `entitas_id` — ID siswa / kelas / angkatan bersangkutan.
- `tahun`, `semester_target` — sasaran prediksi.
- `nilai_prediksi`, `interval_lower`, `interval_upper` — hasil + interval keyakinan.
- `versi_model`, `metrik_error` — jejak model dan akurasinya.

Tanpa tabel ini, hasil prediksi hanya ada di notebook dan hilang saat proses selesai — tidak bisa ditampilkan maupun diaudit.

## 8.2 Tabel `RiwayatAngkatan` — kebutuhan utama B2 (opsional untuk A2/B1)

Tabel ini menyimpan **arsip agregat per angkatan** (rata-rata per mapel per semester, std, kehadiran, jumlah siswa, rasio gender). Fungsinya:

- **Utama untuk B2:** menjadi deret historis antar-angkatan yang menjadi bahan forecasting lintas tahun.
- **Arsip:** memastikan deret historis tetap tersedia meskipun angkatan lama dihapus dari menu Master Data.
- **Opsional untuk A2/B1:** bisa dipakai sebagai *cache* agregat agar penghitungan fitur lebih cepat — tetapi A1/A2/B1 **tetap bisa berjalan tanpa tabel ini**, karena semua fiturnya diturunkan langsung dari skema yang ada (`Siswa`, `NilaiSiswa`, `KehadiranSiswa`, `Angkatan`, `Kelas`).

Kesimpulan: **`Prediksi` adalah fondasi wajib semua skenario; `RiwayatAngkatan` baru wajib saat B2 dipersiapkan.**

## 8.3 Pipeline: model → tabel `Prediksi` → dashboard

Model dilatih **di luar aplikasi** dan hasilnya diterbitkan ke dashboard melalui tabel `Prediksi`. Aplikasi **tidak pernah menjalankan machine learning** — web hanya membaca hasil jadi.

1. **Training (`train.py`)** — menarik data pelatihan dari Postgres memakai **user database read-only** (bukan `DATABASE_URL` aplikasi), membangun fitur wide, melatih, dan mengevaluasi menurut `Protokol_Evaluasi_A1.md`.
2. **Artefak model** (`.joblib` + `params.json` + `metrik.json` + `versi`) disimpan **di luar basis data** (folder `ml/artefak/`); model tidak pernah masuk ke DB.
3. **Penerbitan (`posting.py`)** — menulis baris hasil prediksi (`skenario`, `level`, `entitas_id`, `semester_target`, `nilai_prediksi`, `interval_lower`/`interval_upper`, `versi_model`, `metrik_error`) ke tabel `Prediksi`.
4. **Tampilan** — web membaca `Prediksi` lewat `getDb()` dan menyajikannya sebagai **tab "Proyeksi" pada detail siswa**, dibatasi permission `prediksi.read` (default diberikan ke role **Guru** dan **Operator**; dapat diubah Superadmin). Menu halaman khusus "Proyeksi" di sidebar ditunda sebagai fase lanjutan.

Alur ringkas: `train.py` → artefak model (file, di luar DB) → `posting.py` → tabel `Prediksi` → `getDb()` → tab "Proyeksi".

> **Catatan teknis sebelum membuat tabel baru.** Proyek ini belum memiliki
> migration runner. `npm run db:migrate` hanya menerapkan
> `src/lib/db/schema.sql`, sedangkan perubahan schema berikutnya diletakkan di
> `src/lib/db/migrations/` dan dijalankan **manual** lewat `psql` atau DBeaver
> (lihat `src/lib/db/migrations/README.md`). Maka `Prediksi` dan
> `RiwayatAngkatan` sebaiknya dibuat sebagai berkas migrasi bernomor — misalnya
> `002_prediksi.sql` dan `003_riwayat_angkatan.sql` — dan **bukan** disisipkan
> ke `schema.sql`, supaya `db:migrate` pada lingkungan yang sudah berisi data
> tidak gagal dan urutan penerapannya tercatat jelas.

# 9. Roadmap Implementasi

| Tahap | Aktivitas | Syarat data |
|---|---|---|
| **0 - Fondasi** | Baca dan tetapkan `Protokol_Evaluasi_A1.md`; buat tabel `Prediksi` sebagai migrasi `002_prediksi.sql`; siapkan konvensi import dataset/template untuk data historis | Skema yang ada |
| **1 - Pilot A1 & A2** | Notebook Python (pandas + scikit-learn): ekstraksi, fitur wide, training, evaluasi **menurut Protokol_Evaluasi_A1.md**. Hasil dibahas, belum masuk UI | 1 angkatan lengkap (`n = 61`) |
| **2 — B1** | Model risiko kelas + evaluasi *leave-one-angkatan-out* | 2–3 angkatan |
| **2b — Data B2** | Mulai migrasi manual angkatan lama; tambah tabel `RiwayatAngkatan` (migrasi `003_riwayat_angkatan.sql`); bersihkan inkonsistensi mapel/kurikulum | Data historis sekolah |
| **3 - B2** | Backtest rolling lintas angkatan; ARIMA/ETS/panel regression; laporan interval keyakinan | 8+ angkatan |
| **Opsional** | Tampilkan hasil `Prediksi` sebagai kartu "Proyeksi" di dashboard (hanya membaca tabel `Prediksi`) | Tergantung skenario |

### Keberlanjutan & retraining model

Setelah serah terima, **operator sekolah** menjadi pelaksana pembaruan model. Siklusnya semi-otomatis dan dijalankan saat data bertambah — umumnya (a) setiap angkatan baru selesai terisi, dan/atau (b) menjelang semester baru:

- `train.py` menarik data terbaru dan mengevaluasi ulang menurut protokol yang sama (§ `Protokol_Evaluasi_A1.md`).
- **Gate wajib:** hasil baru hanya dipakai bila **mengalahkan baseline naif**; bila kalah, versi lama tetap berlaku dan hasilnya dicatat.
- Versi model lama **dipertahankan** untuk audit; tanpa auto-deploy.
- `posting.py` menerbitkan prediksi semester berikutnya dengan `versi_model` baru; web otomatis menampilkan angka terbaru melalui tab "Proyeksi".
- Proses dibuat reproduktif (seed tetap) dan terdokumentasi sebagai runbook (butir luaran yang direncanakan di proposal).

Seiring bertambahnya angkatan (2–3+), retraining inilah yang membuka peluang klaim lebih kuat (B1) sesuai tabel klaim pada Protokol §10.

> **Aturan main yang tidak bisa dilewati.** Tahap 1 **tidak boleh dimulai**
> sebelum `Protokol_Evaluasi_A1.md` dibaca dan dicatat sebagai beku. Protocol
> itu sudah menentukan satuan analisis, strategi split, aturan anti-leakage,
> baseline wajib, metrik, dan bentuk pelaporan. Mengubah salah satu keputusan
> itu setelah melihat hasil model membatalkan seluruh tujuan pembekuan.
> Klaim yang boleh dibuat pada tahap ini diatur oleh pasal 10 protocol: dengan
> 1 cohort, hanya boleh disebut "bukti kelayakan".

# 10. Glosarium

| Istilah | Arti |
|---|---|
| **pilot** | Uji coba skala kecil / *proof-of-concept*: menjalankan model pada 1 angkatan saja untuk membuktikan alur kerja (data → training → evaluasi) berhasil sebelum model dipakai resmi. "Bisa di-pilot dengan 1 angkatan" artinya A1 cukup diuji dengan satu angkatan, tidak menunggu data bertahun-tahun. |
| **panel longitudinal** | Data yang mengikuti satu unit (mis. siswa) secara berulang dari waktu ke waktu (di sini: 6 semester dalam satu angkatan). |
| **time series** | Deret pengamatan berurutan menurut waktu (di sini: angka per tahun angkatan). Prediksi multi-tahun (B2) membutuhkan ini, bukan panel. |
| **feature / feature set** | Kolom/variabel masukan untuk model (nilai antarsemester, kehadiran, jenis kelamin, dll). |
| **format wide** | Susunan data 1 baris = 1 subjek, dengan semua fitur sebagai kolom — bentuk yang siap dilatih. |
| **holdout** | Menyisihkan sebagian data untuk pengujian, tidak ikut dilatih. |
| **data leakage** | Kebocoran informasi (mis. memakai nilai yang akan diprediksi sebagai fitur) sehingga hasil evaluasi lebih baik dari kenyataan. |
| **z-score** | Menormalisasi nilai dengan mengurangi rata-rata lalu membagi dengan standar deviasi, agar antar-kelas/angkatan sebanding. |
| **one-hot encoding** | Mengubah data kategori (mis. jenis kelamin) menjadi kolom 0/1. |
| **baseline naif** | Titik banding sederhana ("prediksi = nilai semester sebelumnya"); model baru layak jika mengalahkannya. |
| **MAE / RMSE / MAPE** | Ukuran error regresi: rata-rata galat mutlak / akar kuadrat galat / galat persentase rata-rata. |
| **recall** | Seberapa banyak kasus positif (kelas "perlu perhatian") yang berhasil tertangkap; untuk peringatan dini lebih penting daripada akurasi. |
| **backtest** | Menguji model pada periode lampau yang sudah diketahui hasilnya, mensimulasikan penggunaan nyata. |
| **leave-one-angkatan-out** | Validasi silang: latih semua angkatan kecuali satu, uji pada yang dikecualikan, ulangi untuk tiap angkatan. |
| **rolling forecast / rolling one-step** | Prediksi satu langkah maju, lalu model dikalibrasi ulang tiap kali data baru tersedia. |
| **interval keyakinan (confidence interval)** | Rentang kemungkinan nilai prediksi, bukan satu angka saja; lebar rentang menunjukkan tingkat ketidakpastian. |
| **kalibrasi** | Menyesuaikan kembali model dengan data terbaru agar tetap akurat. |
| **early-warning** | Peringatan dini: mengidentifikasi risiko sejak dini (di sini: nilai siswa/kelas yang berpotensi menurun). |
| **Ridge / ElasticNet** | Regresi linear dengan penalti (regularisasi) — cocok untuk data kecil dan fitur banyak. |
| **XGBoost / LightGBM** | Algoritma gradient boosting — akurat untuk data sedang-besar dengan pola kompleks. |
| **ARIMA / ETS** | Metode statistik klasik untuk forecasting time series (fenomena tren/musiman). |
| **NeuralProphet** | Framework forecasting berbasis jaringan saraf sederhana, butuh deret lebih panjang (≥10 titik). |
