# Laporan ML: Rencana dan Hasil Faktual

Status: **laporan konsolidasi**  
Tanggal: 9 November 2026  
Ruang lingkup: skenario A1 - prediksi nilai semester berikutnya  
Sumber utama: `Protokol_Evaluasi_A1.md`, `ML_Roadmap_Capstone.md`, artefak `ml/artefak/`

---

## 1. Ringkasan eksekutif

| Pertanyaan | Jawaban singkat |
|---|---|
| Apakah model ML berhasil diterbitkan? | **Tidak.** Semua varian ML gagal gate penerbitan. |
| Apa yang diterbitkan? | **B2 rule engine**, bukan model ML. |
| Versi yang terbit | `b2-rule-99448f467d` |
| Target yang terbit | `RATA_RATA`, `BIN`, `IPA`, `IPS`, `MTK`, `PPKn`, `SUN` |
| Baris prediksi saat ini | **35 baris**, 5 `siswa_id`, 7 cakupan |
| Catatan penting | 35 baris berasal dari 5 record parsial/duplikat, bukan 5 siswa unik. Lihat `docs/RENCANA_Perbaikan_Data_Prediksi.md`. |

Hasil utama pada target `RATA_RATA` dengan populasi `primary` (342 siswa, 1.336 pasangan):

| Model | MAE | Keterangan |
|---|---:|---|
| B0 - semester sebelumnya | 1,3770 | Baseline wajib |
| B1 - rata-rata angkatan | 2,6072 | Baseline calibrated prior |
| B2 - rule engine ambang | **0,8971** | Terbaik dan terbit |
| V1 - residual B0, 19 fitur | 1,1734 | Kalah dari B2 |
| V2 - hinge/interaksi, 23 fitur | 1,4493 | Kalah dari B0 |
| V3 - hybrid B2, 20 fitur | 1,1936 | Kalah dari B2 |

Kesimpulan:

- V1 dan V3 menang secara agregat terhadap B0, tetapi hanya menang di 1 dari 2 fold LOGO.
- V2 tidak menang terhadap B0.
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
| `RATA_RATA` | 342 | 1.336 |
| Sebagian besar target per-mapel | 345 | 1.342 |
| `PPKn` | 342 | 1.336 |

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

Berdasarkan `ml/data/raw/metadata.json` (ekstraksi read-only, 5 November 2026):

| Entitas | Jumlah |
|---|---:|
| Angkatan | 2 |
| Kelas | 12 |
| Siswa | 356 |
| Mata pelajaran | 13 |
| Baris nilai | 22.477 |
| Baris kehadiran | 2.101 |

### 3.2 Kondisi riwayat siswa

| Kelompok | Jumlah record |
|---|---:|
| Riwayat lengkap semester 1-6 | 350 |
| Riwayat parsial | 5 |
| Tanpa nilai | 1 |
| **Total** | **356** |

Lima record parsial adalah record dengan satu semester nilai. Kelimanya terindikasi merupakan duplikat dari satu siswa yang sama. Detail dan rencana perbaikannya ada di `docs/RENCANA_Perbaikan_Data_Prediksi.md`.

### 3.3 Model dan fitur

Model kandidat: Ridge dan ElasticNet, dengan imputer median dan StandardScaler di dalam pipeline. Pemilihan hiperparameter memakai `GroupKFold` per `siswa_id` di dalam data latih.

| Eksperimen | Tanggal | Populasi | Fitur | Jumlah fitur | Artefak |
|---|---|---|---:|---:|---|
| V0 | 5 November 2026 | `all` | fitur penuh | 54 | `metrics.json`, `predictions_test.csv` |
| V1 | 8 November 2026 | `primary` | fitur inti | 19 | `experiment_v1_metrics.json`, `experiment_v1_predictions.csv` |
| V2 | 8 November 2026 | `primary` | inti + hinge/interaksi | 23 | `experiment_v2_metrics.json`, `experiment_v2_predictions.csv` |
| V3 | 8 November 2026 | `primary` | inti + `b2_delta` | 20 | `experiment_v3_metrics.json`, `experiment_v3_predictions.csv` |

Definisi varian:

- **V0:** model absolut dengan fitur penuh; pembanding awal.
- **V1:** model residual `y - B0`; prediksi akhir `clip(B0 + residual, 0, 100)`; 19 fitur inti.
- **V2:** residual B0 dengan tambahan `hinge_70`, `hinge_80`, interaksi `semester_asal x trend_slope`, dan `semester_sejak_masuk x avg_k`; 23 fitur.
- **V3:** hybrid B2; model belajar residual `y - B2` dan boleh memilih residual nol bila tidak ada perbaikan; 20 fitur.

---

## 4. Hasil faktual

### 4.1 Hasil awal V0

V0 dijalankan pada 5 November 2026 dengan populasi `all` (349 siswa, 1.691 pasangan):

| Model | MAE | RMSE | MAPE |
|---|---:|---:|---:|
| V0 | 1,4867 | 1,8688 | 1,73% |
| B0 | 1,4904 | 1,7717 | 1,72% |
| B2 | 0,9656 | 1,2588 | 1,12% |

- `ΔMAE` V0 terhadap B0 = **-0,0037**, CI95 **[-0,0860; +0,0876]**.
- CI melewati nol, sehingga gate B0 **tidak lulus**.
- `ΔMAE` V0 terhadap B2 = **+0,5211**, CI95 **[+0,4375; +0,6056]**.
- B2 lebih baik daripada V0.

### 4.2 Hasil varian pada populasi primary

Target `RATA_RATA`, 342 siswa, 1.336 pasangan:

| Model | MAE | RMSE | MAPE | Bias |
|---|---:|---:|---:|---:|
| B0 | 1,3770 | 1,6285 | 1,58% | -1,1641 |
| B1 | 2,6072 | 3,3525 | 2,94% | -1,1814 |
| B2 | **0,8971** | 1,1612 | 1,04% | -0,1731 |
| V1 | 1,1734 | 1,4519 | 1,36% | +0,5671 |
| V2 | 1,4493 | 1,7178 | 1,66% | +0,3921 |
| V3 | 1,1936 | 1,4960 | 1,38% | +0,5841 |

Perbandingan terhadap baseline dan gate:

| Varian | ΔMAE vs B0 | CI95 ΔMAE vs B0 | Fold vs B0 | ΔMAE vs B2 | CI95 ΔMAE vs B2 | Fold vs B2 | Gate |
|---|---:|---|---:|---:|---|---:|---|
| V1 | -0,2036 | [-0,2690; -0,1333] | +0,2060; -0,5759 (1/2) | +0,2762 | [+0,2256; +0,3282] | +0,6597; -0,0722 (1/2) | Tidak lulus |
| V2 | +0,0723 | [+0,0063; +0,1429] | +0,4955; -0,3123 (1/2) | +0,5521 | [+0,4865; +0,6184] | +0,9492; +0,1914 (0/2) | Tidak lulus |
| V3 | -0,1834 | [-0,2525; -0,1126] | +0,2482; -0,5755 (1/2) | +0,2965 | [+0,2429; +0,3551] | +0,7019; -0,0718 (1/2) | Tidak lulus |

Catatan:

- Angka negatif berarti model lebih baik.
- Urutan fold adalah uji 2025 lalu uji 2026.
- V1 dan V3 memenuhi syarat agregat B0 (`ΔMAE < 0` dan CI95 di bawah nol), tetapi gagal syarat menang di setiap fold dan gagal syarat B2.
- V2 gagal gate B0 dan gagal gate B2.

### 4.3 Hasil per semester

Target `RATA_RATA`, model V1 dibandingkan B0 dan B2:

| Semester asal | Target | n | V1 | B0 | B2 |
|---:|---:|---:|---:|---:|---:|
| 2 | 3 | 326 | 1,3141 | 1,5378 | 1,0818 |
| 3 | 4 | 330 | 1,1245 | 1,3178 | 0,7949 |
| 4 | 5 | 338 | 1,1933 | 1,3037 | 0,9895 |
| 5 | 6 | 342 | 1,0666 | 1,3532 | 0,7284 |

B2 tetap lebih baik daripada V1 pada setiap horizon.

Nilai B2 per semester pada tabel ini dihitung dari `experiment_v1_predictions.csv` yang sama, karena `b2_metrics.json` hanya menyimpan hasil agregat dan per fold.

### 4.4 Skenario prediksi semester 6

Jika yang dimaksud adalah "latih satu angkatan, uji angkatan lain, lalu prediksi semester 6 dari semester 1-5", baris yang relevan adalah `semester_asal = 5`:

| Fold | n | V1 | B0 | B2 |
|---|---:|---:|---:|---:|
| Latih 2025, uji 2026 | 179 | 0,7710 | 1,6915 | **0,7641** |
| Latih 2026, uji 2025 | 163 | 1,3912 | 0,9816 | **0,6892** |
| Gabungan | 342 | 1,0666 | 1,3532 | **0,7284** |

Angka pada tabel ini dihitung dari `experiment_v1_predictions.csv` untuk baris `target_kode = RATA_RATA` dan `semester_asal = 5`.

Jadi skenario tersebut memang termasuk dalam evaluasi, tetapi metrik utama 1,1734 untuk V1 dan 0,8971 untuk B2 adalah gabungan seluruh horizon `k=2` sampai `k=5`, bukan hanya semester 6.

---

## 5. Gate per mapel

### 5.1 Ringkasan hasil B2

B2 lulus untuk 7 cakupan dan gagal untuk 3 mapel.

| Target | n siswa | n pasangan | MAE B2 | MAE B0 | ΔMAE | CI95 ΔMAE | Fold uji 2025 | Fold uji 2026 | Lulus |
|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| `RATA_RATA` | 342 | 1.336 | 0,8971 | 1,3770 | -0,4799 | [-0,5176; -0,4425] | -0,4537 | -0,5037 | Ya |
| `BIG` | 345 | 1.342 | 2,4314 | 2,4352 | -0,0037 | [-0,0386; +0,0306] | +0,0670 | -0,0686 | Tidak |
| `BIN` | 345 | 1.342 | 2,0678 | 2,5462 | -0,4784 | [-0,5175; -0,4370] | -0,4315 | -0,5214 | Ya |
| `IPA` | 345 | 1.342 | 3,3897 | 3,5127 | -0,1230 | [-0,1591; -0,0828] | -0,1464 | -0,1014 | Ya |
| `IPS` | 345 | 1.342 | 2,2004 | 2,6237 | -0,4232 | [-0,4633; -0,3830] | -0,2897 | -0,5457 | Ya |
| `MTK` | 345 | 1.342 | 1,7235 | 1,9374 | -0,2139 | [-0,2552; -0,1690] | -0,1807 | -0,2443 | Ya |
| `PABP` | 345 | 1.342 | 2,0060 | 2,0276 | -0,0216 | [-0,0695; +0,0240] | +0,0950 | -0,1286 | Tidak |
| `PJK` | 345 | 1.342 | 2,1841 | 2,2332 | -0,0492 | [-0,0948; -0,0044] | -0,1215 | +0,0171 | Tidak |
| `PPKn` | 342 | 1.336 | 1,2912 | 1,7972 | -0,5060 | [-0,5497; -0,4615] | -0,3333 | -0,6629 | Ya |
| `SUN` | 345 | 1.342 | 2,1215 | 2,2943 | -0,1729 | [-0,2202; -0,1287] | -0,0156 | -0,3171 | Ya |

### 5.2 Mapel yang tidak lolos gate

#### BIG

- MAE B2 2,4314 vs B0 2,4352; `ΔMAE` -0,0037.
- CI95 **[-0,0386; +0,0306]** melewati nol.
- Fold uji 2025: **+0,0670** (B2 lebih buruk; 2,3879 vs 2,3209).
- Fold uji 2026: -0,0686 (B2 lebih baik).
- Gagal karena CI melewati nol dan B2 kalah di satu fold.

#### PABP

- MAE B2 2,0060 vs B0 2,0276; `ΔMAE` -0,0216.
- CI95 **[-0,0695; +0,0240]** melewati nol.
- Fold uji 2025: **+0,0950** (B2 lebih buruk; 2,1277 vs 2,0327).
- Fold uji 2026: -0,1286 (B2 lebih baik).
- Gagal karena CI melewati nol dan B2 kalah di satu fold.

#### PJK

- MAE B2 2,1841 vs B0 2,2332; `ΔMAE` -0,0492.
- CI95 **[-0,0948; -0,0044]** tidak melewati nol.
- Fold uji 2025: -0,1215 (B2 lebih baik; 1,7960 vs 1,9174).
- Fold uji 2026: **+0,0171** (B2 lebih buruk; 2,5400 vs 2,5229).
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
| Versi | `b2-rule-99448f467d` |
| Jenis | `rule-engine` |
| Dibuat | 8 November 2026, 07:02 UTC |
| Data hash | `99448f467d7ac375835809c9de9624d45b171f5b90f602c3351b85060611180c` |
| Target | `RATA_RATA`, `BIN`, `IPA`, `IPS`, `MTK`, `PPKn`, `SUN` |
| Baris | 35 |
| Siswa unik | 5 `siswa_id` |
| Cakupan | 7 |

B2 diterbitkan karena lulus gate terhadap B0 pada target utama dan 6 mapel. B2 **bukan** model ML dan tidak boleh dilabeli sebagai model ML.

### 6.2 Catatan kualitas data pada publikasi

35 baris saat ini berasal dari 5 record parsial yang terindikasi duplikat dari satu siswa yang sama:

- Nama: Pitri Dinarti
- NIS dasar: 232470119
- 5 record masing-masing hanya memiliki satu semester nilai.

Konsekuensinya:

- UI menampilkan "5 siswa", padahal yang ada adalah 5 record.
- Kelima record tidak masuk populasi evaluasi 342/345 siswa.
- Prediksi yang terbit tidak memiliki metrik evaluasi yang sebanding.
- 350 siswa dengan riwayat lengkap tidak terbit karena semester terakhir mereka 6 dan tidak ada semester 7.

Perbaikan data dan kebijakan publikasi dibahas di `docs/RENCANA_Perbaikan_Data_Prediksi.md`. Setelah penggabungan, hasil yang diharapkan adalah **1 siswa dan 7 baris** bila siswa dengan riwayat semester 1-5 tetap boleh diprediksi, atau **0 baris** bila publikasi dibatasi hanya untuk riwayat lengkap.

---

## 7. Perbandingan rencana dan aktual

| Aspek | Rencana awal | Aktual | Status |
|---|---|---|---|
| Skala data | 1 angkatan, 61 siswa | 2 angkatan, 356 record siswa | Data bertambah |
| Split | LOGO per angkatan | 2 fold: 2025-2026 dan 2026-2025 | Sesuai protokol |
| Target | Rata-rata semester berikutnya, 9 mapel | `RATA_RATA` + 9 target per-mapel | Sesuai, 3 mapel gagal gate |
| Populasi | Populasi `primary` untuk gate | 342 siswa, 1.336 pasangan untuk `RATA_RATA` | Sesuai |
| Model | Ridge/ElasticNet | V0 54 fitur; V1 19; V2 23; V3 20 | Semua gagal gate |
| Baseline | B0, B1, B2 | B2 paling kuat: MAE 0,8971 | B2 terbit |
| Gate | Kalahkan B0 dan B2 | B2 lulus; semua ML gagal | B2 rule engine |
| Publikasi | Hasil model terbaik | B2 rule engine, 7 target | Jujur, bukan klaim ML |
| UI | Halaman `/prediksi` | Implemented; 35 baris dari record duplikat | Perlu perbaikan data |
| Klaim | 2 angkatan | "Teruji pada angkatan yang tidak dilatih" | Bukan "tervalidasi lintas angkatan" |
| Klasifikasi | Ditunda | Tidak dijalankan | Sesuai protokol |

---

## 8. Keterbatasan

1. **Hanya 2 angkatan.** Evaluasi hanya 2 fold; klaim generalization terbatas.
2. **Tidak ada semester 7.** Siswa dengan riwayat lengkap semester 1-6 tidak bisa diprediksi pada skenario one-step ini.
3. **ML tidak mengalahkan B2.** Tidak ada bukti bahwa model ML menambah nilai di atas rule engine.
4. **Populasi publikasi tidak sama dengan populasi evaluasi.** 35 baris berasal dari record parsial yang tidak masuk evaluasi.
5. **Duplikasi data.** Satu siswa terpecah menjadi beberapa record karena NIS berpecahan.
6. **Constraint belum lengkap.** `001_unique_constraints.sql` belum dijalankan; duplikat nilai/kehadiran belum dicegah oleh database.
7. **Jumlah sampel per mapel berbeda.** `PPKn` memakai 342 siswa/1.336 pasangan, target lain 345/1.342.
8. **Interval keyakinan bersifat agregat.** Interval di UI memakai sigma gabungan, bukan interval per siswa.

---

## 9. Rekomendasi

1. **Perbaiki data duplikat lebih dulu** mengikuti `docs/RENCANA_Perbaikan_Data_Prediksi.md`.
2. **Pertahankan B2 sebagai rule engine** dan jangan memberi label ML.
3. **Selaraskan populasi publikasi dengan populasi evaluasi**, atau jelaskan perbedaannya secara eksplisit di UI dan laporan.
4. **Jalankan `001_unique_constraints.sql`** setelah query pemeriksaannya bersih.
5. **Jangan menjalankan ML baru tanpa protokol yang dibekukan lebih dulu.** V2/V3 bersifat eksploratif.
6. **Tambahkan cohort dan data historis** sebelum membuat klaim yang lebih kuat.
7. **Regenerasi `Prediksi` dan perbarui laporan** setelah data diperbaiki; jangan mempertahankan 35 baris lama.

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
- `ml:publish-b2` menulis `b2_metrics.json`, `b2_versi.json`, dan `prediksi_terbaru.csv`.
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
| `ml/artefak/b2_metrics.json` | Gate B2 per target |
| `ml/artefak/b2_versi.json` | Versi dan target terbit |
| `ml/artefak/prediksi_terbaru.csv` | 35 baris prediksi terbit |

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
