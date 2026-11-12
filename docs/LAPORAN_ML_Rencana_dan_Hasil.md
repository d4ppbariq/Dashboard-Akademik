# Laporan ML: Rencana dan Hasil Faktual

Status: **laporan konsolidasi**

Tanggal: 12 November 2026

Ruang lingkup: skenario A1 - prediksi nilai semester berikutnya  
Sumber utama: `Protokol_Evaluasi_A1.md`, `ML_Roadmap_Capstone.md`, artefak `ml/artefak/`

---

## 1. Ringkasan eksekutif

| Pertanyaan | Jawaban singkat |
|---|---|
| Apakah model ML berhasil diterbitkan? | **Tidak.** Semua varian ML gagal gate penerbitan. |
| Apa yang diterbitkan? | **B2 rule engine**, bukan model ML. |
| Versi yang terbit | `b2-rule-03e9d215f2` |
| Target yang terbit | `RATA_RATA`, `BIN`, `IPA`, `IPS`, `MTK`, `PPKn`, `SUN` |
| Baris prediksi saat ini | **1.260 baris**, 180 siswa, 7 cakupan |
| Mode publikasi | **Backtest angkatan 2026**, semester 5 -> 6 |
| Catatan penting | 35 baris lama berasal dari record parsial/duplikat. Setelah deduplikasi, semua siswa memiliki riwayat semester 1-6; publikasi memakai snapshot backtest semester 5 agar populasi tetap konsisten dengan evaluasi. |

Hasil utama pada target `RATA_RATA` dengan populasi `primary` (343 siswa, 1.340 pasangan):

| Model | MAE | Keterangan |
|---|---:|---|
| B0 - semester sebelumnya | 1,3774 | Baseline wajib |
| B1 - rata-rata angkatan | 2,6113 | Baseline calibrated prior |
| B2 - rule engine ambang | **0,8968** | Terbaik dan terbit |
| V1 - residual B0, 19 fitur | 1,1519 | Kalah dari B2 |
| V2 - hinge/interaksi, 23 fitur | 1,3427 | Kalah dari B0 dan B2 |
| V3 - hybrid B2, 20 fitur | 1,1714 | Kalah dari B2 |

Kesimpulan:

- V1 dan V3 menang secara agregat terhadap B0, tetapi hanya menang di 1 dari 2 fold LOGO.
- V2 tidak menang terhadap B0 maupun B2.
- Tidak ada varian ML yang mengalahkan B2.
- Jalur produk yang sah adalah menerbitkan B2 sebagai **rule engine** dengan label jujur, bukan mengklaimnya sebagai model ML.
- Klaim maksimal dengan 2 angkatan adalah **"teruji pada angkatan yang tidak dilatih"**, bukan "tervalidasi lintas angkatan".

---

## 2. Rencana dan protokol yang ditetapkan

### 2.1 Tujuan

Memprediksi rata-rata nilai semester `k+1` dari riwayat nilai dan kehadiran sampai semester `k`, untuk peringatan dini akademik siswa.

### 2.2 Satuan analisis dan target

- Satu baris = satu siswa pada satu horizon `k`.
- Target utama: rata-rata 9 mapel umum pada semester `k+1`.
- 9 mapel umum: `BIG`, `BIN`, `IPA`, `IPS`, `MTK`, `PABP`, `PJK`, `PPKn`, `SUN`.
- Target sekunder: nilai per-mapel pada semester `k+1`.
- `n_siswa` = jumlah siswa unik; `n_pasangan` = jumlah baris siswa-horizon.

### 2.3 Split LOGO

Karena hanya ada 2 angkatan, evaluasi memakai **leave-one-angkatan-out** dengan 2 fold:

| Fold | Latih | Uji |
|---|---|---|
| 1 | Angkatan 2025 | Angkatan 2026 |
| 2 | Angkatan 2026 | Angkatan 2025 |

Tidak boleh ada siswa dari angkatan uji yang masuk data latih. Random split tidak dipakai karena akan menyebabkan kebocoran data antar-semester.

### 2.4 Anti-leakage

- Fitur hanya berasal dari semester `<= k`.
- Target adalah semester `k+1`.
- Kehadiran semester target tidak boleh menjadi fitur.
- Imputer, scaler, dan pemilihan hiperparameter dihitung di dalam fold training.
- Bootstrap CI di-cluster per `siswa_id`, bukan per baris.

### 2.5 Populasi evaluasi

Populasi `primary` untuk gate:

- `semester_asal >= 2`;
- `has_prev == 1`, artinya semester sebelumnya benar-benar memiliki nilai;
- target rata-rata memiliki 9 mapel lengkap untuk `RATA_RATA`;
- target per-mapel memiliki nilai pada mapel tersebut.

Hasil populasi:

| Target | n siswa | n pasangan |
|---|---:|---:|
| `RATA_RATA` | 343 | 1.340 |
| Sebagian besar target per-mapel | 346 | 1.346 |
| `PPKn` | 343 | 1.340 |

### 2.6 Baseline

| ID | Definisi |
|---|---|
| B0 | Nilai terakhir yang tersedia pada semester `<= k`; pada baris dengan data semester `k`, nilainya sama dengan rata-rata semester `k` |
| B1 | Rata-rata angkatan pada semester `k`, dengan fallback ke B0 |
| B2 | Rule engine deterministik: acuan `< 70` menghasilkan `B0 - 5`; acuan `>= 80` menghasilkan `B0 + 1`; selain itu tetap B0; hasil di-clip 0-100 |

B2 adalah aturan tetap, bukan model yang dilatih. Karena itu B2 dapat menjadi pembanding yang kuat sekaligus jalur penerbitan yang jujur.

### 2.7 Gate penerbitan

Sebuah target hanya boleh diterbitkan bila memenuhi semua syarat:

1. `ΔMAE` terhadap B0 `< 0`.
2. Batas atas CI95 dari `ΔMAE` terhadap B0 `< 0`.
3. Model mengalahkan B0 pada **setiap fold** LOGO.
4. Untuk model ML: `MAE_model < MAE_B2` (syarat keras Revisi 4).

Bila model tidak mengalahkan B2, jalur yang sah adalah menerbitkan B2 sebagai rule engine, bukan memaksakan klaim ML.

### 2.8 Status eksploratif

- Revisi 2: eksperimen awal, 5 November 2026.
- Revisi 3: V1 dijalankan setelah hasil awal diketahui, sehingga berlabel **eksploratif**.
- Revisi 4: V2/V3 ditetapkan setelah hasil V1 diketahui, sehingga juga **eksploratif**.
- Gate B2 ditetapkan sebagai syarat keras pada Revisi 4.

Label eksploratif penting: hasil V2/V3 tidak boleh diperlakukan sebagai konfirmasi independen.

### 2.9 Klasifikasi ditunda

Klasifikasi "perlu perhatian" dengan ambang absolut `< 70` tidak dijalankan karena pada dua angkatan tidak tersedia kelas positif yang memadai. Fokus hasil adalah regresi dan interval keyakinan.

---

## 3. Data dan pelaksanaan

### 3.1 Data yang diekstrak

Berdasarkan `ml/data/raw/metadata.json` (ekstraksi read-only, 12 November 2026):

| Entitas | Jumlah |
|---|---:|
| Angkatan | 2 |
| Kelas | 12 |
| Siswa | 351 |
| Mata pelajaran | 13 |
| Baris nilai | 22.477 |
| Baris kehadiran | 2.101 |

### 3.2 Kondisi riwayat siswa

| Kelompok | Jumlah siswa |
|---|---:|
| Memiliki nilai pada 6 semester | 327 |
| Memiliki nilai pada 2-5 semester (semester maksimum tetap 6) | 23 |
| Tanpa nilai | 1 |
| **Total** | **351** |

Lima record parsial lama (`232470119.083077` dan pecahan lain) sudah digabung ke record kanonis `232470119`. Setelah penggabungan, semua siswa dengan nilai memiliki semester maksimum 6. Detail perbaikan ada di `docs/RENCANA_Perbaikan_Data_Prediksi.md`.

### 3.3 Model dan fitur

Model kandidat: Ridge dan ElasticNet, dengan imputer median dan StandardScaler di dalam pipeline. Pemilihan hiperparameter memakai `GroupKFold` per `siswa_id` di dalam data latih.

| Eksperimen | Tanggal | Populasi | Fitur | Jumlah fitur | Artefak |
|---|---|---|---|---:|---|
| V0 | 12 November 2026 | `all` | fitur penuh | 54 | `metrics.json`, `predictions_test.csv` |
| V1 | 12 November 2026 | `primary` | fitur inti | 19 | `experiment_v1_metrics.json`, `experiment_v1_predictions.csv` |
| V2 | 12 November 2026 | `primary` | inti + hinge/interaksi | 23 | `experiment_v2_metrics.json`, `experiment_v2_predictions.csv` |
| V3 | 12 November 2026 | `primary` | inti + `b2_delta` | 20 | `experiment_v3_metrics.json`, `experiment_v3_predictions.csv` |

Definisi varian:

- **V0:** model absolut dengan fitur penuh; pembanding awal.
- **V1:** model residual `y - B0`; prediksi akhir `clip(B0 + residual, 0, 100)`; 19 fitur inti.
- **V2:** residual B0 dengan tambahan `hinge_70`, `hinge_80`, interaksi `semester_asal x trend_slope`, dan `semester_sejak_masuk x avg_k`; 23 fitur.
- **V3:** hybrid B2; model belajar residual `y - B2` dan boleh memilih residual nol bila tidak ada perbaikan; 20 fitur.

---

## 4. Hasil faktual

### 4.1 Hasil awal V0

V0 dijalankan pada 12 November 2026 dengan populasi `all` (350 siswa, 1.696 pasangan):

| Model | MAE | RMSE | MAPE |
|---|---:|---:|---:|
| V0 | 1,4912 | 1,8740 | 1,73% |
| B0 | 1,4914 | 1,7725 | 1,72% |
| B2 | 0,9658 | 1,2587 | 1,12% |

- `ΔMAE` V0 terhadap B0 = **-0,0002**, CI95 **[-0,0884; +0,0914]**.
- CI melewati nol, sehingga gate B0 **tidak lulus**.
- `ΔMAE` V0 terhadap B2 = **+0,5254**, CI95 **[+0,4425; +0,6133]**.
- B2 lebih baik daripada V0.

### 4.2 Hasil varian pada populasi primary

Target `RATA_RATA`, 343 siswa, 1.340 pasangan:

| Model | MAE | RMSE | MAPE | Bias |
|---|---:|---:|---:|---:|
| B0 | 1,3774 | 1,6287 | 1,58% | -1,1651 |
| B1 | 2,6113 | 3,3547 | 2,95% | -1,1897 |
| B2 | **0,8968** | 1,1605 | 1,04% | -0,1740 |
| V1 | 1,1519 | 1,4272 | 1,33% | +0,5406 |
| V2 | 1,3427 | 1,5921 | 1,54% | +0,2705 |
| V3 | 1,1714 | 1,4712 | 1,36% | +0,5562 |

Perbandingan terhadap baseline dan gate:

| Varian | ΔMAE vs B0 | CI95 ΔMAE vs B0 | Fold vs B0 | ΔMAE vs B2 | CI95 ΔMAE vs B2 | Fold vs B2 | Gate |
|---|---:|---|---:|---:|---|---:|---|
| V1 | -0,2255 | [-0,2929; -0,1588] | +0,1634; -0,5768 (1/2) | +0,2551 | [+0,2012; +0,3067] | +0,6171; -0,0719 (1/2) | Tidak lulus |
| V2 | -0,0347 | [-0,1008; +0,0252] | +0,2722; -0,3119 (1/2) | +0,4459 | [+0,3826; +0,5031] | +0,7259; +0,1929 (0/2) | Tidak lulus |
| V3 | -0,2060 | [-0,2764; -0,1357] | +0,2040; -0,5765 (1/2) | +0,2746 | [+0,2172; +0,3317] | +0,6578; -0,0716 (1/2) | Tidak lulus |

Catatan:

- Angka negatif berarti model lebih baik.
- Urutan fold adalah uji 2025 lalu uji 2026.
- V1 dan V3 memenuhi syarat agregat B0 (`ΔMAE < 0` dan CI95 di bawah nol), tetapi gagal syarat menang di setiap fold dan gagal syarat B2.
- V2 gagal gate B0 dan gagal gate B2.

### 4.3 Hasil per semester

Target `RATA_RATA`, model V1 dibandingkan B0 dan B2:

| Semester asal | Target | n | V1 | B0 | B2 |
|---:|---:|---:|---:|---:|---:|
| 2 | 3 | 327 | 1,2921 | 1,5389 | 1,0812 |
| 3 | 4 | 331 | 1,0938 | 1,3176 | 0,7932 |
| 4 | 5 | 339 | 1,1744 | 1,3012 | 0,9882 |
| 5 | 6 | 343 | 1,0519 | 1,3563 | 0,7305 |

B2 tetap lebih baik daripada V1 pada setiap horizon.

Nilai B2 per semester pada tabel ini dihitung dari `experiment_v1_predictions.csv` yang sama, karena `b2_metrics.json` hanya menyimpan hasil agregat dan per fold.

### 4.4 Skenario prediksi semester 6

Jika yang dimaksud adalah "latih satu angkatan, uji angkatan lain, lalu prediksi semester 6 dari semester 1-5", baris yang relevan adalah `semester_asal = 5`:

| Fold | n | V1 | B0 | B2 |
|---|---:|---:|---:|---:|
| Latih 2025, uji 2026 | 180 | 0,7741 | 1,6957 | **0,7679** |
| Latih 2026, uji 2025 | 163 | 1,3588 | 0,9816 | **0,6892** |
| Gabungan | 343 | 1,0519 | 1,3563 | **0,7305** |

Angka pada tabel ini dihitung dari `experiment_v1_predictions.csv` untuk baris `target_kode = RATA_RATA` dan `semester_asal = 5`.

Jadi skenario tersebut memang termasuk dalam evaluasi, tetapi metrik utama 1,1519 untuk V1 dan 0,8968 untuk B2 adalah gabungan seluruh horizon `k=2` sampai `k=5`, bukan hanya semester 6.

---

## 5. Gate per mapel

### 5.1 Ringkasan hasil B2

B2 lulus untuk 7 cakupan dan gagal untuk 3 mapel.

| Target | n siswa | n pasangan | MAE B2 | MAE B0 | ΔMAE | CI95 ΔMAE | Fold uji 2025 | Fold uji 2026 | Lulus |
|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| `RATA_RATA` | 343 | 1.340 | 0,8968 | 1,3774 | -0,4806 | [-0,5150; -0,4443] | -0,4537 | -0,5049 | Ya |
| `BIG` | 346 | 1.346 | 2,4354 | 2,4391 | -0,0037 | [-0,0382; +0,0293] | +0,0670 | -0,0682 | Tidak |
| `BIN` | 346 | 1.346 | 2,0654 | 2,5453 | -0,4799 | [-0,5201; -0,4361] | -0,4315 | -0,5241 | Ya |
| `IPA` | 346 | 1.346 | 3,3886 | 3,5111 | -0,1226 | [-0,1599; -0,0820] | -0,1464 | -0,1009 | Ya |
| `IPS` | 346 | 1.346 | 2,2006 | 2,6241 | -0,4235 | [-0,4645; -0,3821] | -0,2897 | -0,5455 | Ya |
| `MTK` | 346 | 1.346 | 1,7221 | 1,9354 | -0,2132 | [-0,2575; -0,1687] | -0,1807 | -0,2429 | Ya |
| `PABP` | 346 | 1.346 | 2,0045 | 2,0275 | -0,0230 | [-0,0683; +0,0231] | +0,0950 | -0,1307 | Tidak |
| `PJK` | 346 | 1.346 | 2,1828 | 2,2318 | -0,0490 | [-0,0939; -0,0089] | -0,1215 | +0,0170 | Tidak |
| `PPKn` | 343 | 1.340 | 1,2873 | 1,7948 | -0,5075 | [-0,5507; -0,4615] | -0,3333 | -0,6648 | Ya |
| `SUN` | 346 | 1.346 | 2,1248 | 2,2987 | -0,1738 | [-0,2189; -0,1252] | -0,0156 | -0,3182 | Ya |

### 5.2 Mapel yang tidak lolos gate

#### BIG

- MAE B2 2,4354 vs B0 2,4391; `ΔMAE` -0,0037.
- CI95 **[-0,0382; +0,0293]** melewati nol.
- Fold uji 2025: **+0,0670** (B2 lebih buruk; 2,3879 vs 2,3209).
- Fold uji 2026: -0,0682 (B2 lebih baik).
- Gagal karena CI melewati nol dan B2 kalah di satu fold.

#### PABP

- MAE B2 2,0045 vs B0 2,0275; `ΔMAE` -0,0230.
- CI95 **[-0,0683; +0,0231]** melewati nol.
- Fold uji 2025: **+0,0950** (B2 lebih buruk; 2,1277 vs 2,0327).
- Fold uji 2026: -0,1307 (B2 lebih baik).
- Gagal karena CI melewati nol dan B2 kalah di satu fold.

#### PJK

- MAE B2 2,1828 vs B0 2,2318; `ΔMAE` -0,0490.
- CI95 **[-0,0939; -0,0089]** tidak melewati nol.
- Fold uji 2025: -0,1215 (B2 lebih baik; 1,7960 vs 1,9174).
- Fold uji 2026: **+0,0170** (B2 lebih buruk; 2,5355 vs 2,5185).
- Gagal karena B2 kalah di fold uji 2026 meskipun secara agregat lebih baik.

### 5.3 Mengapa B2 gagal di tiga mapel tersebut

B2 memakai aturan yang sama untuk semua mapel:

- acuan `< 70` -> turunkan 5 poin;
- acuan `>= 80` -> naikkan 1 poin;
- selain itu tidak berubah.

Aturan ini tidak selalu selaras dengan pola tiap mapel:

- BIG dan PABP: perbaikan agregat sangat kecil dan tidak stabil; pada satu angkatan aturan justru menambah error.
- PJK: perbaikan agregat nyata, tetapi arah perbaikan berbalik pada angkatan lain.
- Gate tidak hanya meminta MAE agregat lebih rendah, tetapi juga CI yang tidak melewati nol dan kemenangan di kedua fold. Ketiga mapel gagal pada setidaknya satu syarat tersebut.

Mapel yang lulus: `RATA_RATA`, `BIN`, `IPA`, `IPS`, `MTK`, `PPKn`, `SUN`.

---

## 6. Keputusan publikasi

### 6.1 Yang diterbitkan

| Field | Nilai |
|---|---|
| Versi | `b2-rule-03e9d215f2` |
| Jenis | `rule-engine` |
| Dibuat | 12 November 2026, 05:51 UTC |
| Data hash | `03e9d215f246f2f6159e8cfc290b373db175ac2dd87d97f7604b902d69df239b` |
| Target | `RATA_RATA`, `BIN`, `IPA`, `IPS`, `MTK`, `PPKn`, `SUN` |
| Baris | 1.260 |
| Siswa unik | 180 |
| Cakupan | 7 |
| Mode | Backtest angkatan 2026, semester 5 -> 6 |

B2 diterbitkan karena lulus gate terhadap B0 pada target utama dan 6 mapel. B2 **bukan** model ML dan tidak boleh dilabeli sebagai model ML.

### 6.2 Catatan kualitas data pada publikasi

Sebelum perbaikan, 35 baris berasal dari 5 record parsial dengan NIS dasar `232470119` (Pitri Dinarti). Setiap record hanya memiliki satu semester nilai, sehingga `latest_prediction_rows()` menganggapnya sebagai siswa yang belum menyelesaikan semester 6. Setelah nilai dan kehadiran dipindahkan ke record kanonis, record duplikat dihapus dan jumlah siswa turun dari 356 menjadi 351.

Konsekuensi setelah perbaikan:

- Semua 351 siswa memiliki semester maksimum 6; 327 di antaranya memiliki nilai pada keenam semester.
- Filter early warning ketat (`is_latest_observed`, `semester_asal < 6`) menghasilkan **0 baris** karena tidak ada siswa aktif dengan semester berikutnya di dalam data.
- Publikasi akhir memakai **backtest angkatan 2026 pada semester 5 -> 6**. Populasi dibatasi ke `_filter_primary()` sehingga hanya siswa yang juga masuk populasi evaluasi yang diterbitkan.
- Dari 182 siswa angkatan 2026, 180 lolos filter primary dan menghasilkan 1.260 baris (180 siswa x 7 cakupan).
- UI `/prediksi` memberi label **backtest**, bukan peringatan dini untuk siswa aktif.

---

## 7. Perbandingan rencana dan aktual

| Aspek | Rencana awal | Aktual | Status |
|---|---|---|---|
| Skala data | 1 angkatan, 61 siswa | 2 angkatan, 351 record siswa | Data bertambah; 5 duplikat digabung |
| Split | LOGO per angkatan | 2 fold: 2025-2026 dan 2026-2025 | Sesuai protokol |
| Target | Rata-rata semester berikutnya, 9 mapel | `RATA_RATA` + 9 target per-mapel | Sesuai, 3 mapel gagal gate |
| Populasi | Populasi `primary` untuk gate | 343 siswa, 1.340 pasangan untuk `RATA_RATA` | Sesuai |
| Model | Ridge/ElasticNet | V0 54 fitur; V1 19; V2 23; V3 20 | Semua gagal gate |
| Baseline | B0, B1, B2 | B2 paling kuat: MAE 0,8968 | B2 terbit |
| Gate | Kalahkan B0 dan B2 | B2 lulus; semua ML gagal | B2 rule engine |
| Publikasi | Hasil model terbaik | B2 rule engine, 7 target, 1.260 baris backtest | Jujur, bukan klaim ML |
| UI | Halaman `/prediksi` | 180 siswa, 1.260 baris, label backtest | Diperbaiki |
| Klaim | 2 angkatan | "Teruji pada angkatan yang tidak dilatih" | Bukan "tervalidasi lintas angkatan" |
| Klasifikasi | Ditunda | Tidak dijalankan | Sesuai protokol |

---

## 8. Keterbatasan

1. **Hanya 2 angkatan.** Evaluasi hanya 2 fold; klaim generalization terbatas.
2. **Tidak ada semester 7.** Semua siswa memiliki semester maksimum 6, sehingga tidak ada siswa aktif yang bisa diprediksi untuk semester berikutnya. Publikasi berupa backtest semester 5 -> 6.
3. **ML tidak mengalahkan B2.** Tidak ada bukti bahwa model ML menambah nilai di atas rule engine.
4. **Publikasi bukan peringatan dini aktif.** Publikasi memakai 180 siswa angkatan 2026 pada semester 5; dua siswa lain tidak lolos filter primary.
5. **Duplikasi NIS sudah diperbaiki.** NIS kini hanya angka, record duplikat digabung, dan constraint UNIQUE/CHECK sudah terpasang. Backup tersedia di `.data/backup-20261112-115356`.
6. **Jumlah sampel per mapel berbeda.** `PPKn` memakai 343 siswa/1.340 pasangan, target lain 346/1.346.
7. **Interval keyakinan bersifat agregat.** Interval di UI memakai sigma gabungan, bukan interval per siswa.
8. **Snapshot statis.** Tabel `Prediksi` harus diregenerasi bila data atau kebijakan publikasi berubah.

---

## 9. Rekomendasi

1. **Pertahankan B2 sebagai rule engine** dan jangan memberi label ML.
2. **Pertahankan label backtest** pada UI dan laporan; jangan menyebutnya peringatan dini untuk siswa aktif.
3. **Tambahkan cohort dan data siswa aktif** sebelum membuat klaim prediksi semester berikutnya yang sebenarnya.
4. **Jangan menjalankan ML baru tanpa protokol yang dibekukan lebih dulu.** V1/V2/V3 bersifat eksploratif.
5. **Regenerasi `Prediksi` dan laporan** setiap kali data akademik berubah.
6. **Pertimbangkan interval per siswa** bila UI ingin menampilkan ketidakpastian yang lebih spesifik.
7. **Pertahankan backup** sampai verifikasi UI dan laporan final selesai.

---

## 10. Reproduksi

### 10.1 Perintah

```bash
npm run ml:extract
npm run ml:test

npm run ml:train -- --variant v0
npm run ml:train -- --variant v1 --population primary --feature-set core
npm run ml:train -- --variant v2 --population primary --feature-set v2
npm run ml:train -- --variant v3 --population primary --feature-set v3

npm run ml:publish-b2
npm run ml:post:b2

npm test
npm run typecheck
npm run lint
npm run build
```

Catatan:

- `ml:post:b2` membutuhkan `POST_DATABASE_URL` atau `DATABASE_URL`.
- `ml:extract` berjalan read-only.
- `ml:train` menulis artefak ke `ml/artefak/`.
- `ml:publish-b2` menulis `b2_metrics.json`, `b2_versi.json`, dan `prediksi_terbaru.csv` memakai mode backtest angkatan 2026 semester 5 -> 6.
- `ml:post:b2` menulis ke tabel `Prediksi`.

### 10.2 Artefak

| Artefak | Isi |
|---|---|
| `ml/artefak/metrics.json` | Hasil V0, protokol Revisi 2 |
| `ml/artefak/predictions_test.csv` | Prediksi uji V0 |
| `ml/artefak/experiment_v1_metrics.json` | Hasil V1 |
| `ml/artefak/experiment_v1_predictions.csv` | Prediksi uji V1 |
| `ml/artefak/experiment_v2_metrics.json` | Hasil V2 |
| `ml/artefak/experiment_v2_predictions.csv` | Prediksi uji V2 |
| `ml/artefak/experiment_v3_metrics.json` | Hasil V3 |
| `ml/artefak/experiment_v3_predictions.csv` | Prediksi uji V3 |
| `ml/artefak/b2_metrics.json` | Gate B2 per target + metadata backtest |
| `ml/artefak/b2_versi.json` | Versi, target terbit, cohort, dan semester publikasi |
| `ml/artefak/prediksi_terbaru.csv` | 1.260 baris prediksi backtest terbit |

---

## 11. Referensi

- `docs/Protokol_Evaluasi_A1.md`
- `docs/ML_Roadmap_Capstone.md`
- `docs/RENCANA_Perbaikan_Data_Prediksi.md`
- `ml/config.py`
- `ml/baselines.py`
- `ml/features.py`
- `ml/train.py`
- `ml/publish_b2.py`
- `ml/post.mjs`
- `src/lib/db/migrations/001_unique_constraints.sql`
- `src/lib/db/migrations/003_prediksi.sql`
- `src/lib/db/migrations/004_prediksi_route.sql`
- `src/lib/db/migrations/005_nis_format.sql`
- `src/lib/nis.ts`
- `src/scripts/repair-nis.ts`
