# MACHINE LEARNING ROADMAP — DASHBOARD AKADEMIK NESACIBA

## Konsep Penerapan Machine Learning untuk Capstone Project

**STATUS: KONSEP ARSITEKTUR — CAPSTONE**

|||
|-|-|
|**Nama Dokumen**|ML Roadmap — Prediksi Nilai & Peringatan Dini Akademik|
|**Versi Dokumen**|v1.0|
|**Disusun oleh**|Tim Pengembang (Capstone Project)|
|**Untuk**|SMPN 1 Cibalong (Klien) / Proyek Capstone bersama rekan|
|**Tanggal**|19 September 2026|
|**Dokumen Terkait**|`PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md`; `src/lib/db/schema.sql`; `README.md`|

---

# 1. Latar Belakang & Tujuan

Dashboard Akademik Nesaciba menyimpan data akademik siswa secara terstruktur: angkatan, kelas, siswa, nilai 11 mata pelajaran (6 semester), dan kehadiran per semester. Data ini sebenarnya dapat dimanfaatkan lebih dari sekadar rekap — yaitu untuk **prediksi** dan **peringatan dini** kinerja akademik siswa/guru.

Dokumen ini menyusun konsep penerapan **Machine Learning (ML)** di atas data tersebut sebagai rencana **capstone project** bersama rekan pengembang. Tujuannya bukan sekadar membangun model, tetapi membuktikan bahwa:

1. Data akademik yang sudah ada layak dijadikan bahan belajar mesin (feature engineering dari pola nilai & kehadiran).
2. Terdapat lebih dari satu skenario penerapan dengan kebutuhan data dan tingkat kesiapan yang berbeda.
3. Setiap skenario dirancang dengan proses training dan evaluasi yang jelas serta terukur (bukan asal prediksi).

Dokumen ini bersifat konsep/arsitektur — **belum ada eksekusi kode** pada tahap ini.

# 2. Kelayakan & Ringkasan Skenario

Sifat data saat ini adalah **panel longitudinal** (per angkatan: 6 semester ke dalam), bukan **time series antar-angkatan** (deret antar tahun). Perbedaan ini menentukan mana skenario yang layak segera dan mana yang baru layak setelah data historis terkumpul.

| Skenario | Level | Butuh minimal | Waktu siap digunakan | Sumber data |
|---|---|---|---|---|
| **A1** Early-warning nilai siswa | Siswa | 1 angkatan lengkap (6 semester, ±150+ siswa) | Segera — bisa di-*pilot* dengan 1 angkatan | Skema yang ada sudah cukup |
| **A2** Prediksi rata-rata akhir angkatan berjalan | Angkatan | 1 angkatan lengkap untuk kalibrasi; ideal 3+ | Segera–1 tahun (lihat Bab 4) | Skema yang ada sudah cukup |
| **B1** Peringatan dini risiko kelas | Kelas | 2–3 angkatan (±12–36 unit kelas) | Setelah 2+ angkatan tersedia | Skema yang ada sudah cukup |
| **B2** Forecast lintas tahun ("beberapa tahun ke depan") | Angkatan | ≥8 angkatan (rule of thumb), ideal 10–15+ | Setelah data historis diimpor manual | Wajib impor manual + fitur kontekstual |

Catatan penting: prediksi "beberapa tahun ke depan" (B2) adalah *multi-step time-series forecast* — model butuh barisan observasi **antar-angkatan** (mis. rata-rata Matematika angkatan 2016, 2017, …, 2026), bukan barisan semester dalam satu angkatan. Karena itu minimum datanya jauh lebih besar dan tidak bisa dipangkas dengan menambah jumlah semester.

---

# 3. Skenario A1 — Early-Warning Nilai Per Siswa

**Tujuan:** Saat siswa baru memiliki data semester 1–2, prediksi nilai semester 3–6 dan rata-rata akhir, sehingga guru dapat melakukan intervensi lebih awal (mis. bimbingan khusus bagi siswa yang diprediksi menurun).

## 3.1 Kebutuhan Data

Seluruh fitur di bawah **dapat diturunkan dari skema yang ada** — tidak perlu mengubah kolom aplikasi:

| Fitur | Sumber | Bentuk |
|---|---|---|
| Nilai 11 mapel pada semester `k` (0–100) | `NilaiSiswa` | Numerik |
| Agregat per semester: rata-rata, min, max, std dev | turunan | Numerik |
| Kehadiran sebagai **rasio** terhadap hari efektif (aplikasi memakai asumsi 36 hari/semester) | `KehadiranSiswa` | 0–1 |
| Lag / delta: rata-rata semester `k-1`, `k-2`, selisih per mapel | turunan | Numerik |
| `jenis_kelamin`, `kelas` | `Siswa`, `Kelas` | Kategorikal (one-hot) |
| Normalisasi rata-rata per kelas/angkatan (z-score) | turunan | Numerik |

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
| Mapel konsisten antar tahun | 11 | 11 (perlu normalisasi bila nama/kode berubah) |
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

Saat ini database hanya menyimpan **1 angkatan lengkap**. Data beberapa tahun ke belakang (jika diperlukan untuk B2) harus **dipindahkan manual dari sekolah**, dengan cara yang tidak menyentuh kolom aplikasi:

1. Buat satu entri `Angkatan` untuk setiap tahun lama.
2. Impor nilai/kehadiran per angkatan memakai **fitur Import Data Excel yang sudah ada** di aplikasi — template kolom (NIS, Nama, Jenis Kelamin, Semester, Sakit, Izin, Tanpa Keterangan, lalu kolom per mapel) sudah sesuai; kolom `Semester` diisi 1–6.
3. Bersihkan inkonsistensi sebelum/impor:
   - Penamaan mapel yang berubah antar tahun (mis. "Matematika" vs "MTK") — samakan dulu dengan `MataPelajaran` saat ini.
   - Perubahan kurikulum (nilai bisa terinflasi/depresiasi antar tahun).
   - Jumlah kelas berbeda per angkatan di masa lampau.
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

# 9. Roadmap Implementasi

| Tahap | Aktivitas | Syarat data |
|---|---|---|
| **0 — Fondasi** | Buat tabel `Prediksi`; siapkan konvensi import dataset/template untuk data historis | Skema yang ada |
| **1 — Pilot A1 & A2** | Notebook Python (pandas + scikit-learn): ekstraksi → fitur wide → training → evaluasi. Hasil dibahas, belum masuk UI | 1 angkatan lengkap |
| **2 — B1** | Model risiko kelas + evaluasi *leave-one-angkatan-out* | 2–3 angkatan |
| **2b — Data B2** | Mulai migrasi manual angkatan lama; tambah tabel `RiwayatAngkatan`; bersihkan inkonsistensi mapel/kurikulum | Data historis sekolah |
| **3 — B2** | Backtest rolling lintas angkatan; ARIMA/ETS/panel regression; laporan interval keyakinan | ≥8 angkatan |
| **Opsional** | Tampilkan hasil `Prediksi` sebagai kartu "Proyeksi" di dashboard (hanya membaca tabel `Prediksi`) | Tergantung skenario |

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