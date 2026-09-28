# Protokol Evaluasi A1 — Prediksi Nilai Semester Berikutnya

Status: **bekukan (frozen)** · Berlaku sejak Tahap Persiapan · Revisi 1

Dokumen ini dikunci **sebelum** ada model, metrik, atau angka hasil apa pun yang
dilihat. Tujuannya sederhana: supaya tahap ML nanti tidak memilih metrik,
baseline, atau cara split *setelah* melihat hasilnya. Yang diukur harus
ditentukan lebih dulu.

Rujukan: `ML_Roadmap_Capstone.md` Tahap 1 dan §3.2–3.3.

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
