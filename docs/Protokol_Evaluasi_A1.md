# Protokol Evaluasi A1 — Prediksi Nilai Semester Berikutnya

Status: **bekukan (frozen)** · Berlaku sejak Tahap Persiapan · Revisi 4<br>
Revisi 2 ditetapkan 5 November 2026, sebelum pelatihan model pada data dua angkatan.
Revisi 3 ditetapkan 8 November 2026, setelah hasil awal dilihat; eksperimennya
berlabel **eksploratif**. Revisi 4 ditetapkan 8 November 2026, setelah hasil V1
dilihat, untuk membekukan varian V2/V3 dan menjadikan B2 syarat keras penerbitan.
V2/V3 karena itu juga berlabel **eksploratif**, bukan konfirmatif.

Dokumen ini dikunci **sebelum** ada model, metrik, atau angka hasil apa pun yang
dilihat. Tujuannya sederhana: supaya tahap ML nanti tidak memilih metrik,
baseline, atau cara split *setelah* melihat hasilnya. Yang diukur harus
ditentukan lebih dulu.

| Dokumen | Isi |
|---|---|
| `ML_Roadmap_Capstone.md` | Tahap 1 dan §3.2–3.3 adalah rujukan protocol ini |
| `src/lib/db/schema.sql` | Sumber tabel `NilaiSiswa`, `KehadiranSiswa`, `Siswa`, `Kelas` |
| `src/server/service/statistics.ts` | Implementasi aturan applicability mapel (§4) di sisi aplikasi |

---

## 1. Satuan analisis dan target

- **1 baris = 1 siswa.** Bukan 1 baris nilai.
- Ukuran sampel `n` = jumlah **siswa**, bukan jumlah baris `NilaiSiswa`.
  Menghitung `n` dari baris nilai akan grossly overstate-confidence.
- **Target utama:** rata-rata nilai seluruh mapel pada semester `k+1`.
- **Target kedua (opsional):** rata-rata akhir seluruh semester.
- Target dihitung hanya dari mapel yang **berlaku** bagi angkatan tersebut
  (lihat §4).

## 2. Strategi split

**Wajib berbasis angkatan. Larangan mutlak random split** — satu siswa memiliki
nilai di banyak semester, sehingga random split menyebabkan data yang sama
muncul di train dan test (data leakage) dan metrik jadi optimistis.

| Jumlah cohort | Strategi |
|---|---|
| 1 | Latih semester 1–2, uji semester 3–6 (holdout internal, berbasis waktu) |
| 2 | Leave-one-Angkatan-out (2 fold) |
| 3 | Leave-one-Angkatan-out (3 fold) |

Fold selalu ditentukan oleh **angkatan**, tidak pernah oleh siswa. Dengan 1
cohort, angka yang dihasilkan hanya layak disebut *bukti kelayakan*, bukan
evaluasi generalization.

## 3. Aturan anti-leakage

- Fitur hanya boleh berasal dari semester `≤ k`. Target adalah semester `k+1`.
- **Kehadiran pada semester target dilarang** masuk fitur.
- Rata-rata akhir tidak boleh dipakai untuk memprediksi semester di antaranya.
- **Z-score dihitung di dalam fold training**, bukan di seluruh data. Scaler
  yang dihitung global membocorkan informasi statistik dari test set. Ini
  kesalahan yang paling sering terjadi dan tidak terlihat di hasil: model
  terlihat sangat bagus, lalu gagal saat dipakai.
- `getPeringkatMapel` dan agregat per kelas hanya boleh dihitung dari fold
  training saat dipakai sebagai fitur.

## 4. Aturan applicability mapel

**Paling kritikal untuk capstone ini, karena kurikulum berubah antar cohort.**

- Mapel yang **tidak berlaku** bagi suatu angkatan **dikecualikan dari
  perhitungan metrik** — bukan dilaporkan sebagai 0.
- Penentuan berlaku/tidak berlaku **diturunkan dari data**: sebuah mapel
  berlaku bagi cohort bila ada minimal 1 baris nilai untuk mapel itu pada
  cohort tersebut.
- Metrik "semua mapel" yang belum disaring **dinyatakan tidak valid** dan tidak
  boleh dipakai sebagai klaim.
- Selalu laporkan **dua angka**: agregat (mapel yang berlaku saja) dan per-mapel.
- Kurikulum 2026 dan kurikulum sebelumnya **tidak boleh digabung** dalam satu
  rata-rata.

> Alasan teknis: bila ada 13 mapel terdaftar dan hanya 11 yang berlaku,
> membagi dengan 13 menurunkan rata-rata kelas sekitar 15% dan membuat mapel
> yang tidak pernah ada data-nya tampak sebagai mapel terendah.

**Implementasi yang sudah ada di aplikasi — jangan dibuat ulang di pipeline.**
Fungsi `mapelDenganNilai()` di `src/server/service/statistics.ts` sudah
menerapkan aturan ini: ia mengembalikan daftar mapel yang benar-benar punya
nilai untuk sekumpulan siswa, sementara mapel lain diabaikan. Pada aplikasi,
`nilai = null` berarti "tidak berlaku / tidak ada data", **bukan 0**.

Pipeline ML **wajib memakai definisi yang sama persis** dengan fungsi tersebut.
Kalau pipeline memakai definisi sendiri, laporan model dan laporan dashboard
bisa berbeda angka untuk angkatan yang sama - dan ketika berbeda, tidak ada
yang bisa bilang mana yang benar.

Pilihan yang aman: pakai fungsi yang sama, atau turunkan test yang sama. Karena
saat ini hanya ada `n = 61` siswa, daftar mapel yang berlaku per cohort bisa
diverifikasi langsung dari data yang ada.

## 5. Baseline wajib

Tidak ada klaim yang sah sebelum baseline dikalahkan.

| ID | Baseline | Keterangan |
|---|---|---|
| **B0** | `prediksi = rata-rata nilai siswa pada semester sebelumnya` | **Wajib.** Naive persistence. Karena nilai antar semester sangat autocorrelated, baseline ini sangat kuat. |
| **B1** | `prediksi = rata-rata angkatan pada semester k` | Calibrated prior / shrinkage |
| **B2** | Rule engine deterministik berbasis ambang batas | Menjawab pertanyaan yang selalu diajukan: "kenapa butuh ML, tidak cukup lihat nilai semester lalu saja?" |

- Pelaporan selalu berupa **ΔMAE terhadap B0**, bukan MAE absolut saja.
- B2 **wajib ada** walau tidak dipakai sebagai fitur, karena baseline inilah yang
  menjawab pertanyaan di atas. Tanpa B2, klaim bahwa machine learning
  diperlukan akan sulit dipertanggungjawabkan.
- B0 dan B1 harus diimplementasikan ulang di dalam pipeline yang sama dengan
  model, agar perbandingannya adil.

## 6. Metrik

- **MAE sebagai metrik utama.** Satuannya poin nilai, langsung bisa dibaca guru,
  dan tahan terhadap outlier.
- **RMSE** sebagai pelengkap, karena sensitif terhadap kesalahan besar.
- **MAPE** hanya pelengkap — tidak bermakna bila ada nilai mendekati 0.
- **Bootstrap confidence interval wajib.** `n` kecil dan rentang keyakinannya
  lebar; melaporkan titik estimasi tanpa CI menciptakan kepastian palsu.
- Setiap angka yang dilaporkan **wajib** menyertakan: `n`, CI, daftar mapel yang
  berlaku, dan daftar mapel yang tidak berlaku.

## 7. Ablasi wajib

Pengurutan model harus menunjukkan urutan kontribusi:

```
B0 (semester sebelumnya)
  -> + kehadiran
    -> + z-score relatif terhadap kelas/angkatan
      -> + demografi
```

Tujuannya menjawab "informasi apa yang sebenarnya menambah nilai di luar
mengulang nilai itu sendiri?". Bila hasilnya hanya z-score yang membantu, itu
**klaim sempit yang jujur** — bukan kelemahan, dan jauh lebih layak dipercaya
daripada klaim "prediksi akurat".

## 8. Ekspektasi realistis (ditulis sebelum hasil terlihat)

- Nilai antar semester **sangat autocorrelated**. B0 akan kuat, dan itu wajar.
- Kontribusi yang realistis: **kehadiran + posisi relatif** menambah informasi
  di atas pengulangan nilai.
- Karena itu klaim harus sempit: bukan "prediksi nilai akurat", melainkan
  "kehadiran dan posisi relatif menambah informasi yang tidak tersedia dari
  nilai semester lalu, dengan selisih yang terukur terhadap B0". Angka selisih
  diisi setelah pengukuran, bukan diasumsikan sekarang.

## 9. Aturan pelaporan

- Melaporkan **per-kelas dan per-Angkatan**, bukan pooled saja. Rata-rata pooled
  menyembunyikan kelas yang bermasalah.
- Menyertakan ukuran sampel dan CI setiap angka.
- Menyertakan daftar mapel yang berlaku dan yang tidak berlaku.
- **Tidak melaporkan hanya hasil terbaik.** Semua konfigurasi model yang
  dicoba dilaporkan, termasuk yang gagal.
- Menyertakan baseline pada laporan yang sama.

## 10. Kapan klaim boleh dibuat

| Jumlah cohort | Klaim yang diperbolehkan |
|---|---|
| 1 | "Bukti kelayakan" |
| 2 | "Teruji pada angkatan yang tidak dilatih" |
| 3 | "Tervalidasi lintas angkatan" |

Melewati level ini — misalnya menyebut "terbaik di Indonesia" dengan 1 cohort —
tidak diperbolehkan. Peta lengkap per Tahap ada di `ML_Roadmap_Capstone.md` §1.

## 11. Retraining wajib

Retraining (pembaruan model saat data bertambah, mis. angkatan baru lengkap) **bukan** pengecualian protokol — seluruh aturan di atas berlaku utuh:

- Setiap train ulang mengulang §2–§7 (split, anti-leakage, applicability mapel, baseline, metrik, ablasi) pada data terkini.
- Klaim mengikuti tabel §10 sesuai jumlah cohort yang benar-benar tersedia; pertambahan cohort tidak otomatis menaikkan klaim tanpa evaluasi ulang yang sah.
- Tanpa auto-deploy. Model baru hanya dipakai bila **mengalahkan baseline** (§5); model lama dipertahankan untuk audit.
- Hasil yang lulus gate dapat diterbitkan ke tabel `Prediksi` dengan `versi_model` baru (lihat `ML_Roadmap_Capstone.md` §8.3 dan §9).

---

## 12. Addendum Revisi 2 — Pelaksanaan pada Dua Angkatan

Addendum ini ditetapkan **sebelum** metrik model pertama dilihat. Isinya tidak
mengganti §1–§11, melainkan menetapkan cara pelaksanaannya ketika data tersedia
untuk **dua angkatan** (2025 dan 2026). Bila terjadi pertentangan, aturan pada
addendum ini yang berlaku untuk eksekusi dua angkatan.

### 12.1 Status data dan klaim

| Jumlah cohort | Strategi | Klaim maksimal |
|---|---|---|
| 2 (2025, 2026) | Leave-one-Angkatan-out, 2 fold | "Teruji pada angkatan yang tidak dilatih" |

- Fold 1: latih pada 2025, uji pada 2026.
- Fold 2: latih pada 2026, uji pada 2025.
- Tidak boleh ada siswa dari angkatan uji yang masuk data latih pada fold mana pun.
- "Tervalidasi lintas angkatan" tetap tidak boleh diklaim sampai tersedia ≥3 cohort.

### 12.2 Target dan harmonisasi kurikulum

- **Target utama:** rata-rata nilai pada semester `k+1` dari **9 mapel yang sama
  pada kedua angkatan**: BIG, BIN, IPA, IPS, MTK, PABP, PJK, PPKn, SUN.
- Rata-rata **11 mapel per angkatan** hanya dilaporkan sebagai statistik
  deskriptif. Angka itu tidak boleh digabung lintas kurikulum dan tidak boleh
  dipakai untuk klaim LOGO, sesuai §4.
- **Target sekunder:** prediksi per-mapel untuk 9 mapel umum tersebut.
- Mapel yang hanya ada pada satu angkatan (2025: SBK, PRK; 2026: INF, MUS)
  tidak dapat dievaluasi dengan LOGO. Untuk mapel seperti ini:
  - gunakan evaluasi berbasis waktu di dalam angkatan, dan
  - klaim maksimal "bukti kelayakan", atau
  - tampilkan "belum dapat diproyeksikan" pada UI.
- Fitur hanya berasal dari semester `≤ k`. Nilai mapel target pada semester
  `k+1` tidak boleh dipakai, baik langsung maupun sebagai fitur turunan.

### 12.3 Satuan analisis dan pelaporan `n`

- Satu baris = satu siswa pada satu horizon `k`. Karena satu siswa dapat muncul
  pada beberapa horizon, `n` wajib dilaporkan dalam dua bentuk:
  - `n_siswa` = jumlah siswa unik yang dievaluasi;
  - `n_pasangan` = jumlah baris siswa-horizon.
- Bootstrap interval keyakinan **wajib di-cluster per siswa**, bukan per baris,
  agar siswa yang muncul berulang tidak dihitung sebagai observasi independen.
- Metrik dilaporkan per fold, per angkatan, per kelas, per horizon `k`, dan
  per mapel untuk target sekunder.

### 12.4 Kehadiran dan hari efektif

- Konstanta 36 hari/semester adalah asumsi lama yang tidak dapat dipertahankan:
  angka itu lebih kecil daripada total ketidakhadiran yang sah dan membuat
  rasio negatif.
- Sampai kalender resmi sekolah tersedia, denominator sementara yang dibekukan
  adalah **100 hari efektif per semester**, dibaca dari satu sumber konfigurasi
  yang sama oleh aplikasi dan pipeline ML.
- Rasio dihitung sebagai
  `clip((100 - sakit - izin - alpa) / 100, 0, 1)`.
- Jumlah hari absen mentah tetap dipakai sebagai fitur. Rasio 100 hanya
  pelengkap, bukan pengganti data mentah.
- Baris dengan total absen mendekati atau melebihi denominator, atau yang
  ekstrem secara statistik, wajib ditandai pada laporan kualitas data; tidak
  boleh dihapus diam-diam.
- Wajib ada analisis sensitivitas membandingkan fitur kehadiran dengan:
  jumlah hari mentah, denominator 36 (asumsi lama), dan denominator 100
  (asumsi sementara).
- Bila sekolah menetapkan angka resmi yang berbeda, fitur dihitung ulang dan
  model di-retrain; hasil lama disimpan untuk audit.

### 12.5 Data hilang dan outlier

- Baris dipertahankan bila target `k+1` tersedia dan siswa memiliki data pada
  semester `k`. Penghapusan dilakukan hanya bila target tidak ada.
- Imputasi nilai fitur memakai median yang dihitung **di dalam fold training**,
  disertai indikator missing. Analisis sensitivitas complete-case wajib
  dilaporkan.
- Outlier tidak dihapus. Laporkan hasil dengan dan tanpa outlier yang
  teridentifikasi, dan minta operator/sekolah memverifikasi baris tersebut.
- Nilai prediksi akhir di-clip ke rentang 0–100, tetapi metrik dihitung dari
  prediksi mentah dan jumlah baris yang terkena clip dilaporkan.

### 12.6 Klasifikasi ditunda

- Klasifikasi "perlu perhatian" dengan ambang absolut <70 **tidak dijalankan**
  karena pada data dua angkatan tidak ada kelas positif.
- Accuracy, F1-score, dan recall tidak boleh dilaporkan sebagai hasil utama.
- Bila sekolah tetap membutuhkan klasifikasi, ambang harus ditetapkan bersama
  sekolah **sebelum** training dan harus menghasilkan jumlah kelas positif
  yang memadai. Sampai itu terjadi, fokus klaim adalah regresi + interval
  keyakinan.

### 12.7 Model dan pemilihan hiperparameter

- Model utama tetap Ridge/ElasticNet.
- Pemilihan hiperparameter hanya memakai data latih di dalam fold. Data uji
  tidak boleh dilihat sampai konfigurasi dibekukan.
- Baseline B0, B1, dan B2 diimplementasikan di pipeline yang sama. B2 boleh
  berimpit dengan B0 untuk regresi; bila demikian, hal itu dilaporkan sebagai
  temuan, bukan disembunyikan.
- Seed tetap dan versi model dicatat pada setiap artefak dan setiap baris
  tabel `Prediksi`.

### 12.8 Gate penerbitan

- Model hanya diterbitkan bila mengalahkan B0 pada metrik utama (ΔMAE < 0)
  dengan interval keyakinan yang dilaporkan.
- Bila model tidak mengalahkan B0, hasil tetap dilaporkan, tetapi tabel
  `Prediksi` tidak boleh diisi dengan klaim bahwa model lebih baik.
- Semua konfigurasi yang dicoba dilaporkan, termasuk yang gagal.

---

## 13. Addendum Revisi 3 — Populasi Persistence, Cold-Start, dan B0 Ketat

Addendum ini melengkapi §12 dan tidak mengganti §1–§11. Bila terjadi
pertentangan dengan §12, aturan pada §13 yang berlaku untuk eksperimen ini.
Karena hasil awal sudah dilihat sebelum addendum ditetapkan, seluruh eksperimen
pada Revisi 3 dilabeli **eksploratif**: tujuannya mengoreksi definisi, bukan
mengejar gate yang sudah diketahui hasilnya.

### 13.1 Masalah yang diperbaiki

Target pada setiap baris adalah semester `k + 1`, sedangkan fitur berasal dari
semester `<= k`. Karena itu naive persistence yang benar adalah **nilai terakhir
yang tersedia pada semester `<= k`**; pada baris yang punya data semester `k`,
nilai itu sama dengan `avg_k`. `last_available_avg` sudah sesuai untuk peran ini.

Masalah yang sebenarnya bukan nilai B0, melainkan **populasi dan bentuk model**:

- baris `k = 1` dan horizon pertama murid pindahan belum punya riwayat yang
  sebanding, sehingga ikut mengacaukan gate;
- baris dengan target kurang dari 9 mapel tidak sebanding dengan target
  rata-rata 9 mapel;
- model V0 dilatih pada nilai absolut, bukan sebagai koreksi terhadap B0.

Temuan pendukung: pada populasi yang dibatasi ke baris dengan riwayat dan target
9 mapel, model V0 (54 fitur) justru kalah dari B0
(MAE 1,483 vs 1,377; `ΔMAE` +0,106; CI95 `[+0,0205; +0,1958]`).

Catatan penting: memakai semester `k - 1` sebagai B0 **tidak dibenarkan**. Itu
memprediksi `k + 1` sambil melewati semester `k`, sehingga baseline menjadi lebih
lemah secara artifisial. Nilai `k - 1` hanya boleh menjadi fitur, bukan baseline.

### 13.2 Populasi analisis

| Populasi | Definisi | Pemakaian |
|---|---|---|
| `full` | semua baris dengan target `k+1` tersedia | statistik deskriptif |
| `primary` | `semester_asal >= 2` **dan** `has_prev == 1` **dan** `target_count == 9` | gate penerbitan |
| `cold_start` | `has_prev == 0` | laporan terpisah, bukan gate |

- `has_prev == 1` berarti semester `k - 1` benar-benar memiliki nilai pada
  mapel umum, bukan hanya ada baris kosong.
- `target_count == 9` berarti target rata-rata dihitung dari 9 mapel umum yang
  sama pada kedua angkatan (§12.2).
- Murid pindahan **tidak dihapus**. Baris pertama mereka masuk `cold_start`;
  baris berikutnya masuk `primary` bila syarat terpenuhi.
- Baris `k = 1` untuk seluruh siswa juga masuk `cold_start`.
- Baseline cold-start adalah nilai sekarang / rata-rata angkatan, bukan
  "semester sebelumnya".

### 13.3 Baseline ketat

- **B0 ketat** (`B0_ketat`) = nilai terakhir yang tersedia pada semester `<= k`:
  rata-rata 9 mapel untuk target utama, nilai mapel untuk target sekunder.
  Pada baris dengan data semester `k`, nilainya sama dengan `avg_k`. Nilainya
  hanya dipakai pada populasi yang punya riwayat (`has_prev == 1`).
- **B0 `k - 1` tidak dipakai sebagai baseline** karena memprediksi `k + 1`
  sambil melewati semester `k`; nilai `k - 1` hanya boleh menjadi fitur.
- **B1 ketat** tetap rata-rata angkatan pada semester `k`; fallback ke B0 hanya
  dipakai pada cold-start.
- **B2 ketat** = aturan deterministik §10.3 diterapkan pada B0 ketat dengan
  acuan nilai semester `k`: acuan `< 70` → `B0 - 5`; acuan `>= 80` → `B0 + 1`;
  selain itu tetap `B0`; hasil di-clip 0–100.
- **B0 fallback** (`last_available_avg`) tetap dilaporkan untuk audit dan
  perbandingan dengan hasil §10, tetapi **bukan** baseline gate pada §13.

### 13.4 Fitur inti yang dibekukan (19)

Eksperimen V1 memakai tepat 19 fitur berikut. Daftar ini dibekukan agar jumlah
fitur tidak berubah diam-diam antar-eksekusi.

Akademik dan agregat (15):

1. `avg_prev`
2. `avg_k`
3. `delta_prev`
4. `last_available_avg`
5. `min_k`
6. `max_k`
7. `std_k`
8. `n_mapel_k`
9. `trend_slope`
10. `avg_cum`
11. `z_angkatan_k`
12. `z_kelas_k`
13. `angkatan_avg_k`
14. `kelas_avg_k`
15. `semester_asal`

Kehadiran (3):

16. `rasio_hadir`
17. `cum_alpa`
18. `n_semester_kehadiran`

Demografi (1):

19. `jenis_kelamin_L`

Aturan tambahan:

- Hanya satu dummy jenis kelamin (`L`); `P` dibuang karena kolinier sempurna.
- Flag histori (`has_prev`, `cold_start`, `first_sem`, `late_entry`,
  `n_missing_early`, `n_observed_before`) adalah **metadata/filter**, bukan
  fitur. `semester_sejak_masuk` hanya boleh dipakai sebagai fitur interaksi
  pada varian V2.
- Model 54 fitur (V0) dipertahankan sebagai pembanding dan tidak diubah oleh
  addendum ini.

### 13.5 Spesifikasi varian V1

- Target latih: residual `y - B0_ketat`.
- Prediksi akhir: `clip(B0_ketat + prediksi_residual, 0, 100)`.
- Model: Ridge dan ElasticNet dengan imputer/scaler di dalam fold training.
- Fitur: 19 fitur inti (§13.4).
- Populasi latih dan evaluasi: `primary` saja.
- Pemilihan hiperparameter: `GroupKFold` per `siswa_id` di dalam data latih;
  outer test tidak boleh dipakai untuk tuning.
- V2 (hinge/interaksi) dan V3 (hybrid B2) belum dijalankan pada tahap ini dan
  harus ditetapkan lebih dulu sebelum dieksekusi.

### 13.6 Gate dan pelaporan

- Gate tetap seperti §12.8, tetapi diukur terhadap **B0 ketat**:
  `ΔMAE < 0` **dan** batas atas CI95 dari `ΔMAE` `< 0`.
- Gate tambahan: model harus mengalahkan B0 pada **setiap fold** LOGO, bukan
  hanya secara agregat. Kemenangan agregat yang berasal dari satu fold saja
  tidak cukup untuk penerbitan.
- Laporkan `n_siswa`, `n_pasangan`, MAE, RMSE, MAPE, bias (mean error), per
  fold, per semester, per angkatan, per kelas, serta `cold_start` terpisah.
- Bootstrap tetap di-cluster per `siswa_id`.
- Bila V1 gagal, hasil ditulis sebagai hasil negatif; tabel `Prediksi` tetap
  kosong dan tidak ada klaim bahwa model lebih baik.

### 13.7 Relasi dengan addendum sebelumnya

- §12 tetap berlaku untuk definisi data, target 9 mapel umum, kehadiran 100
  hari, dan aturan anti-leakage.
- §13 mengoreksi implementasi B0 dan menetapkan populasi gate untuk eksperimen
  Revisi 3.
- Hasil §10 (Revisi 2) tetap disimpan untuk audit dan tidak ditimpa.

---

## 14. Addendum Revisi 4 — Varian V2/V3 dan Gate B2 Keras

Addendum ini melengkapi §13 dan tidak mengganti §1–§12. §13 tetap berlaku untuk
definisi populasi `primary`, B0 ketat, dan B2 ketat. Karena V2/V3 ditetapkan
setelah hasil V1 dilihat, seluruh eksperimen pada Revisi 4 dilabeli
**eksploratif**.

### 14.1 Keputusan penerbitan

- **B2 adalah syarat keras.** Model ML hanya boleh diterbitkan bila lebih baik
  daripada B2, di samping tetap lulus gate B0 pada §13.6.
- Bila model tidak dapat mengalahkan B2, jalur produk yang sah adalah
  menerbitkan **B2 sebagai rule engine** dengan label yang jujur, bukan
  mengklaimnya sebagai model ML.
- Tidak ada penerbitan sebagian yang mengklaim ML lebih baik dari B2 ketika
  angkanya tidak mendukung.

### 14.2 Gate penerbitan Revisi 4

Sebuah target hanya boleh diterbitkan bila **semua** syarat berikut terpenuhi:

1. `ΔMAE` terhadap B0 ketat `< 0` **dan** batas atas CI95 dari `ΔMAE` `< 0`.
2. Model mengalahkan B0 pada **setiap fold** LOGO, bukan hanya agregat.
3. `MAE_model < MAE_B2` (ketat). Gate ini yang membedakan jalur ML dari jalur
   rule engine.

Aturan tambahan:

- CI95 dari `ΔMAE` terhadap B2 tetap dilaporkan, tetapi **bukan** syarat
  penerbitan. Model hybrid yang identik dengan B2 akan menghasilkan `ΔMAE = 0`
  dan interval yang melewati nol; menuntut batas atas `< 0` akan menolak model
  yang sebenarnya setara B2.
- Bila syarat 1 dan 2 lulus tetapi `MAE_model == MAE_B2`, tidak ada perbaikan
  atas B2: jalur produk adalah B2 rule engine (§14.5), bukan model ML.
- Gate diterapkan per target yang akan diterbitkan. Target `RATA_RATA` wajib
  lulus lebih dulu; target per-mapel hanya terbit bila lulus gate yang sama.

### 14.3 Spesifikasi V2 — hinge dan interaksi (23 fitur)

V2 memakai 19 fitur inti §13.4 ditambah tepat 4 fitur berikut:

1. `hinge_70 = max(0, 70 - last_available_avg)`
2. `hinge_80 = max(0, last_available_avg - 80)`
3. `ix_semester_trend = semester_asal × trend_slope`
4. `ix_sejak_avg = semester_sejak_masuk × avg_k`

Aturan:

- `hinge_70` dan `hinge_80` memakai `last_available_avg` karena nilai itu adalah
  `acuan` yang sama dengan B2 ketat (§13.3), sehingga fitur ini mengukur jarak
  terhadap ambang aturan yang sedang dilawan.
- `semester_sejak_masuk = k - first_sem + 1`, yaitu jumlah semester sejak nilai
  pertama diamati (`first_sem`). Fitur ini hanya boleh muncul sebagai bagian
  interaksi, tidak sebagai fitur tunggal (§13.4).
- Target latih tetap residual `y - B0_ketat`; prediksi akhir
  `clip(B0_ketat + prediksi_residual, 0, 100)`.
- Populasi latih dan evaluasi `primary`; pemilihan hiperparameter
  `GroupKFold` per `siswa_id` di dalam data latih.
- V2 dinyatakan gagal bila tidak memenuhi §14.2, dan hasilnya dilaporkan sebagai
  hasil negatif tanpa penerbitan.

### 14.4 Spesifikasi V3 — hybrid B2 (20 fitur)

V3 memakai 19 fitur inti ditambah tepat 1 fitur:

1. `b2_delta = b2_next - last_available_avg`

dengan `b2_next = clip(B2_rule(last_available_avg), 0, 100)` dan `B2_rule`
adalah aturan §13.3. Karena aturannya deterministik, `b2_delta` hanya bernilai
`-5`, `0`, atau `+1` sebelum clipping.

Aturan:

- Target latih adalah residual `y - b2_next`; prediksi akhir
  `clip(b2_next + prediksi_residual, 0, 100)`.
- Kandidat **residual nol** (prediksi = `b2_next`) wajib disertakan dalam
  seleksi hiperparameter sebagai pembanding internal. Bila tidak ada kandidat
  yang mengalahkan kandidat nol pada `GroupKFold` di dalam data latih, prediksi
  V3 untuk fold tersebut adalah `b2_next`. Ini menjamin V3 tidak sengaja menjadi
  lebih buruk daripada B2.
- Populasi, tuning, dan pelaporan mengikuti §13.6 dan §14.2.
- Bila `MAE_V3 == MAE_B2`, V3 tidak dianggap menambah nilai; jalur produk
  kembali ke B2 rule engine.

### 14.5 Pelabelan artefak dan tabel `Prediksi`

- Model ML yang lulus gate ditulis dengan `model_versi` yang memuat varian
  pemenang, mis. `a1-logo2-<hash>-v3-b2`.
- Bila yang diterbitkan adalah B2, `model_versi` memakai penanda aturan, mis.
  `b2-rule-<hash>`, dan `metrik` wajib memuat `jenis: "rule-engine"`.
- `metrik` pada tabel `Prediksi` harus tetap memuat `mae_model`, `mae_b0`,
  `n_siswa`, dan `n_pasangan`; untuk jalur B2, `mae_model` diisi MAE B2 dan
  diberi penanda bahwa itu bukan model terlatih.
- Dilarang menyebut B2 sebagai "model ML" pada UI, laporan, atau dokumentasi.

### 14.6 Relasi dengan addendum sebelumnya

- §13.3 dan §13.6 tetap berlaku untuk B0 ketat, populasi gate, dan pelaporan.
- §14 hanya menambah syarat B2 dan membekukan V2/V3; model produksi 54 fitur
  tidak berubah oleh addendum ini.
- Semua hasil V2/V3, termasuk yang gagal, dicatat di
  `ML_Roadmap_Capstone.md` dan tidak menghapus hasil §10/V1.

---

## Checklist sebelum menjalankan training

- [ ] Split ditentukan angkatan, bukan siswa
- [ ] Scaler dihitung di dalam fold training
- [ ] Mapel tidak berlaku dikecualikan dari metrik
- [ ] B0, B1, B2 diimplementasikan di pipeline yang sama
- [ ] MAE + RMSE + bootstrap CI
- [ ] Ablasi berurutan dijalankan
- [ ] `n` = jumlah siswa, bukan jumlah baris nilai
- [ ] Laporan memuat per-kelas dan per-Angkatan
- [ ] Target lintas angkatan memakai 9 mapel umum, bukan gabungan 11 mapel
- [ ] Rasio kehadiran memakai denominator 100 dari config yang sama dengan aplikasi
- [ ] Bootstrap di-cluster per siswa, bukan per baris
- [ ] Klasifikasi absolut tidak dijalankan pada ambang yang tidak punya kelas positif
- [ ] Gate memakai B0 ketat = nilai terakhir pada semester `<= k`; semester `k - 1` bukan baseline
- [ ] Populasi gate memakai `has_prev == 1` dan `target_count == 9`
- [ ] Cold-start dilaporkan terpisah dan tidak masuk gate persistence
- [ ] Flag histori tidak masuk fitur produksi; fitur inti V1 tepat 19
- [ ] Model mengalahkan B0 pada setiap fold, bukan hanya agregat
- [ ] B2 ketat dihitung dari B0 ketat dan dipakai sebagai syarat keras penerbitan
- [ ] V2 tepat 23 fitur dan V3 tepat 20 fitur; daftar dibekukan sebelum eksekusi
- [ ] V3 menyertakan kandidat residual nol (B2) dalam seleksi
- [ ] Model ML hanya terbit bila `MAE < MAE_B2`; bila sama, terbitkan B2 berlabel rule engine
