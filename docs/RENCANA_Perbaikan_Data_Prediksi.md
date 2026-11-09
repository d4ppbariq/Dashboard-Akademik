# Rencana Perbaikan Data Prediksi

Status: **rencana, belum dieksekusi**  
Tanggal: 9 November 2026  
Konteks: temuan record parsial/duplikat pada publikasi halaman `/prediksi`

---

## 1. Ringkasan

Data hasil ekstraksi menunjukkan:

| Kelompok | Jumlah record | Keterangan |
|---|---:|---|
| Siswa dengan riwayat lengkap semester 1-6 | 350 | Tidak masuk publikasi karena tidak ada semester 7 |
| Siswa dengan riwayat parsial | 5 | Masing-masing hanya memiliki satu semester nilai |
| Siswa tanpa nilai | 1 | Tidak menghasilkan prediksi |
| **Total record siswa** | **356** | |

Lima record parsial tersebut bukan lima siswa yang berbeda. Semuanya memiliki nama dan NIS dasar yang sama:

- Nama: **Pitri Dinarti**
- NIS dasar: **232470119**
- Kelas: **D**
- Angkatan: **2026**

Perbedaannya hanya pada `siswa_id` dan NIS yang diberi pecahan:

| siswa_id | NIS | Semester yang memiliki nilai |
|---|---|---|
| `s-mup9f4xy-1zm2z3` | `232470119` | 1 |
| `s-mup9f4xy-dzbijh` | `232470119.083077` | 2 |
| `s-mup9f4xy-ysgzob` | `232470119.294359` | 3 |
| `s-mup9f4xy-sa8j7i` | `232470119.505641` | 4 |
| `s-mup9f4xy-eekahj` | `232470119.716923` | 5 |
| `s-mup9f4xy-wn7nkp` | `232470119.928205` | tidak ada |

Karena setiap record hanya memiliki satu semester, data satu siswa terpecah menjadi beberapa kartu siswa. Dashboard kemudian menghitung kartu, bukan orang.

Akibatnya:

- UI menampilkan **5 siswa** dan **35 baris prediksi**.
- 35 baris berasal dari 5 record x 7 cakupan.
- 350 siswa lengkap tidak muncul karena semester terakhir mereka adalah 6 dan tidak ada semester 7.
- Kelima record parsial **tidak masuk populasi evaluasi** 342/345 siswa karena tidak memiliki pasangan semester berurutan (`has_prev = false`).
- Kelima record parsial **tetap masuk publikasi** karena `latest_prediction_rows()` hanya mengambil baris terakhir yang diamati dan `semester_asal < 6`.

Dengan demikian, prediksi yang tampil di UI saat ini berasal dari record yang tidak memiliki metrik evaluasi yang sebanding. Ini adalah masalah kualitas data dan konsistensi publikasi, bukan hasil evaluasi model.

---

## 2. Bukti dan lokasi kode

### 2.1 Data mentah

| Berkas | Isi yang relevan |
|---|---|
| `ml/data/raw/siswa.csv` | 356 record, termasuk 6 record dengan NIS dasar `232470119` |
| `ml/data/raw/nilai.csv` | Lima record parsial masing-masing hanya memiliki nilai satu semester |
| `ml/data/raw/metadata.json` | Ekstraksi read-only: 2 angkatan, 12 kelas, 356 siswa, 22.477 nilai, 2.101 kehadiran |
| `ml/artefak/prediksi_terbaru.csv` | 35 baris, 5 `siswa_id`, 7 cakupan, versi `b2-rule-99448f467d` |

### 2.2 Kode yang relevan

| Lokasi | Peran |
|---|---|
| `src/lib/db/schema.sql` | `Siswa.nis` hanya `UNIQUE` pada string persis, bukan pada NIS dasar |
| `src/lib/import/validate.ts` | NIS dibaca dengan `String(value).trim()` dan belum divalidasi sebagai angka bulat |
| `src/lib/import/apply.ts` | Siswa dicari berdasarkan `nis` persis; NIS berbeda menghasilkan record baru |
| `ml/features.py:428` | `latest_prediction_rows()` memilih `is_latest_observed` dan `semester_asal < 6` |
| `ml/publish_b2.py:28` | `_filter_primary()` dipakai untuk evaluasi, bukan untuk publikasi |
| `ml/publish_b2.py:124` | Publikasi memakai `build_supervised(..., require_target=False)` |
| `src/server/service/prediksi.ts` | `ringkasPrediksi()` menghitung `totalSiswa` dari `siswa_id` unik |

### 2.3 Dugaan akar masalah

Dugaan utama: NIS dari file Excel terbaca sebagai angka desimal, lalu disimpan sebagai teks apa adanya. Hal ini belum dapat dipastikan tanpa memeriksa file sumber dan audit import. Karena itu langkah pertama rencana ini adalah verifikasi, bukan penghapusan data.

---

## 3. Dampak

### 3.1 Dampak pada UI

- Ringkasan `/prediksi` menampilkan **5 siswa**.
- Tabel menampilkan **35 baris** dari 5 record.
- Pengguna dapat mengira ada lima siswa berisiko, padahal semuanya adalah satu siswa yang datanya terpecah.
- Prediksi untuk record dengan satu semester riwayat kurang dapat dipertanggungjawabkan.

### 3.2 Dampak pada evaluasi dan publikasi

- Evaluasi model memakai populasi `primary`: 342 siswa dan 1.336 pasangan untuk `RATA_RATA`, serta 345 siswa dan 1.342 pasangan untuk sebagian besar target per-mapel.
- Publikasi memakai populasi yang berbeda: record dengan `is_latest_observed` dan `semester_asal < 6`.
- Kelima record parsial tidak memiliki baris evaluasi, sehingga prediksi yang terbit tidak memiliki metrik error yang benar-benar mewakili record tersebut.
- Ini melanggar prinsip konsistensi: populasi yang dipublikasikan seharusnya menjadi bagian dari populasi yang dievaluasi, atau perbedaannya harus dijelaskan dan dibatasi.

### 3.3 Dampak pada laporan

Laporan tidak boleh menyebut "5 siswa" tanpa penjelasan. Yang benar adalah:

> Lima baris prediksi berasal dari lima record parsial yang terindikasi merupakan duplikat dari satu siswa.

---

## 4. Prinsip perbaikan

1. **Jangan menghapus data sebelum diverifikasi.** Duplikat harus dibuktikan dengan NIS dasar, nama, kelas, nilai, dan audit import.
2. **Backup sebelum menulis.** Semua operasi perbaikan harus dapat di-rollback.
3. **Pisahkan pengaman dan pembersihan.** Filter publikasi dapat diperbaiki lebih dulu tanpa menyentuh data siswa.
4. **Jangan mengklaim dua record berbeda sebagai satu siswa tanpa bukti.** Penggabungan harus berdasarkan NIS dasar dan konfirmasi sumber data.
5. **Setelah data bersih, baru pasang constraint.** Unique index NIS dasar tidak boleh dipasang sebelum duplikat diselesaikan.

---

## 5. Rencana eksekusi

### Tahap 0 - Backup dan pencatatan kondisi awal

Tujuan: menyediakan titik pulih dan baseline angka sebelum perubahan.

Langkah:

1. Backup database, minimal tabel:
   - `Siswa`
   - `NilaiSiswa`
   - `KehadiranSiswa`
   - `Prediksi`
   - `AuditLog`
2. Catat kondisi awal:
   - jumlah record `Siswa` = 356;
   - jumlah baris `Prediksi` = 35;
   - versi publikasi = `b2-rule-99448f467d`;
   - hash data = `99448f467d7ac375835809c9de9624d45b171f5b90f602c3351b85060611180c`.
3. Simpan salinan `ml/data/raw` dan `ml/artefak/prediksi_terbaru.csv`.

Kriteria selesai: backup tersedia dan dapat dipulihkan.

### Tahap 1 - Verifikasi read-only

Tujuan: memastikan duplikasi, cakupan nilai, dan konflik data.

#### 1.1 Cari semua NIS dasar yang duplikat

```sql
SELECT
  regexp_replace(nis, '\..*$', '') AS nis_base,
  count(*) AS jumlah_record,
  array_agg(nis ORDER BY nis) AS variasi_nis,
  array_agg(id ORDER BY nis) AS siswa_id
FROM "Siswa"
GROUP BY 1
HAVING count(*) > 1
ORDER BY jumlah_record DESC, nis_base;
```

Yang dicari: bukan hanya `232470119`, tetapi semua NIS dasar yang memiliki lebih dari satu record.

#### 1.2 Periksa cakupan nilai setiap record

```sql
SELECT
  s.id,
  s.nis,
  s.nama,
  s.kelas_id,
  n.semester,
  count(*) AS jumlah_mapel
FROM "Siswa" s
LEFT JOIN "NilaiSiswa" n ON n.siswa_id = s.id
WHERE regexp_replace(s.nis, '\..*$', '') = '232470119'
GROUP BY s.id, s.nis, s.nama, s.kelas_id, n.semester
ORDER BY s.nis, n.semester;
```

#### 1.3 Periksa kehadiran

```sql
SELECT
  s.id,
  s.nis,
  k.semester,
  k.sakit,
  k.izin,
  k.tanpa_keterangan
FROM "Siswa" s
LEFT JOIN "KehadiranSiswa" k ON k.siswa_id = s.id
WHERE regexp_replace(s.nis, '\..*$', '') = '232470119'
ORDER BY s.nis, k.semester;
```

#### 1.4 Periksa prediksi yang sudah terbit

```sql
SELECT
  p.siswa_id,
  s.nis,
  s.nama,
  p.cakupan,
  p.semester_asal,
  p.semester_target,
  p.nilai_prediksi,
  p.model_versi
FROM "Prediksi" p
JOIN "Siswa" s ON s.id = p.siswa_id
WHERE regexp_replace(s.nis, '\..*$', '') = '232470119'
ORDER BY s.nis, p.cakupan;
```

#### 1.5 Periksa konflik bila record digabung

Untuk setiap NIS dasar, cek apakah ada kombinasi `(mata_pelajaran_id, semester)` yang muncul lebih dari sekali dengan nilai berbeda:

```sql
SELECT
  regexp_replace(s.nis, '\..*$', '') AS nis_base,
  n.mata_pelajaran_id,
  n.semester,
  count(*) AS jumlah,
  array_agg(n.nilai ORDER BY s.nis) AS nilai
FROM "NilaiSiswa" n
JOIN "Siswa" s ON s.id = n.siswa_id
GROUP BY 1, n.mata_pelajaran_id, n.semester
HAVING count(*) > 1
ORDER BY nis_base, n.semester, n.mata_pelajaran_id;
```

Bila ada konflik nilai, jangan pilih salah satu secara otomatis. Minta operator atau sekolah memverifikasi nilai yang benar.

#### 1.6 Periksa audit import

```sql
SELECT waktu, user_nama, aksi, entitas, detail
FROM "AuditLog"
WHERE aksi = 'IMPORT'
ORDER BY waktu DESC;
```

Cari import yang menghasilkan NIS berpecahan atau record ganda. Bila audit tidak menyimpan nama file, cocokkan dengan tanggal dan kelas import.

Kriteria selesai: daftar lengkap duplikat, cakupan nilai, konflik, dan riwayat import tersedia.

### Tahap 2 - Pastikan akar masalah

Langkah:

1. Minta atau cari file Excel sumber import untuk kelas D angkatan 2026.
2. Periksa format kolom NIS:
   - apakah kolom diformat sebagai angka;
   - apakah ada formula;
   - apakah ada nilai desimal;
   - apakah leading zero hilang.
3. Cocokkan dengan `validateRows()` dan `applyRows()`:
   - NIS saat ini hanya di-trim, belum divalidasi sebagai angka bulat;
   - pencarian siswa memakai NIS persis, sehingga NIS berpecahan membuat record baru.
4. Periksa apakah ada record lain dengan pola NIS berpecahan di luar Pitri Dinarti.
5. Periksa apakah `001_unique_constraints.sql` sudah dijalankan. Saat dokumen ini dibuat, migrasi tersebut masih berstatus belum dijalankan, sehingga duplikat nilai/kehadiran belum dicegah oleh constraint.

Kriteria selesai: penyebab teknis dan penyebab operasional diketahui, bukan hanya gejalanya.

### Tahap 3 - Pilih strategi perbaikan

#### Opsi A - Deduplikasi dan penggabungan data

Langkah:

1. Tentukan satu record kanonis untuk setiap NIS dasar.
2. Pindahkan seluruh `NilaiSiswa` dan `KehadiranSiswa` ke record kanonis.
3. Periksa konflik sebelum menghapus record lain.
4. Hapus record duplikat setelah semua data dipindahkan.
5. Regenerasi tabel `Prediksi`.

Kelebihan: data bersih dan UI menampilkan jumlah siswa yang benar.  
Risiko: operasi tulis dan potensi konflik nilai; memerlukan backup dan verifikasi manual.

#### Opsi B - Filter pengaman tanpa mengubah data

Langkah:

1. Kecualikan record parsial/duplikat dari publikasi.
2. Ubah ringkasan UI agar menghitung siswa unik atau memberi label "record".
3. Biarkan data mentah apa adanya.

Kelebihan: risiko perubahan data paling kecil.  
Risiko: data tetap kotor; UI bisa menjadi kosong karena hanya record parsial yang memenuhi syarat publikasi.

#### Opsi C - Hybrid (rekomendasi)

Langkah:

1. Terapkan filter pengaman agar UI dan laporan tidak menyesatkan.
2. Verifikasi dan backup.
3. Lakukan deduplikasi terkontrol.
4. Regenerasi publikasi dan perbarui laporan.

Kelebihan: mengurangi risiko sekaligus memperbaiki akar data.  
Risiko: membutuhkan dua tahap perubahan dan pengujian.

**Rekomendasi: Opsi C.**

### Tahap 4 - Implementasi perbaikan

#### 4.1 Validasi NIS

- Tetapkan format NIS yang sah bersama sekolah. Rekomendasi: hanya angka, tanpa spasi, tanpa desimal, leading zero dipertahankan sebagai teks.
- Normalisasi NIS saat:
  - import Excel;
  - tambah siswa;
  - edit siswa.
- Tolak NIS kosong, NIS berdesimal, dan NIS yang setelah normalisasi bertabrakan dengan NIS lain.
- Tambahkan test untuk:
  - NIS `232470119.083077` ditolak;
  - NIS dengan spasi di-trim;
  - NIS dengan leading zero tetap utuh.

#### 4.2 Pencegahan duplikat NIS dasar

Setelah data bersih, tambahkan constraint pada NIS dasar. Contoh pendekatan:

```sql
CREATE UNIQUE INDEX uq_siswa_nis_base
  ON "Siswa" ((regexp_replace(nis, '\..*$', '')));
```

Catatan: ekspresi ini hanya tepat bila format NIS final memang angka bulat. Sesuaikan bila sekolah mengizinkan huruf atau format lain. Jangan pasang index sebelum duplikat diselesaikan.

#### 4.3 Penggabungan record

Urutan operasi yang aman:

1. Mulai transaksi.
2. Tentukan record kanonis.
3. Pindahkan `NilaiSiswa` ke record kanonis.
4. Pindahkan `KehadiranSiswa` ke record kanonis.
5. Hapus record duplikat.
6. Perbarui atau hapus baris `Prediksi` lama.
7. Commit.
8. Jalankan `001_unique_constraints.sql` setelah query pemeriksaannya bersih.

Peringatan: foreign key `ON DELETE CASCADE` akan menghapus nilai dan kehadiran bila record dihapus sebelum datanya dipindahkan. Pindahkan data terlebih dahulu.

#### 4.4 Perbaikan filter publikasi ML

Pilih salah satu kebijakan dan tuliskan di laporan:

- **Kebijakan ketat:** hanya record dengan riwayat yang cukup, misalnya `has_prev == 1` atau minimal dua semester, yang boleh masuk publikasi.
- **Kebijakan early warning:** record dengan minimal dua semester boleh dipublikasikan, tetapi harus diberi label bahwa prediksinya berbasis riwayat terbatas.

Yang tidak boleh terjadi: publikasi memakai populasi yang tidak pernah dievaluasi tanpa penjelasan.

#### 4.5 Perbaikan hitungan UI

- Setelah deduplikasi, `ringkasPrediksi()` akan benar karena `siswa_id` sudah unik.
- Sebelum deduplikasi, jangan menampilkan "5 siswa"; gunakan "5 record" atau hitung berdasarkan NIS dasar.
- Pertimbangkan menampilkan peringatan bila ada record dengan riwayat kurang dari dua semester.

#### 4.6 Pengujian

Tambahkan test untuk:

- import menolak NIS berdesimal;
- import menolak duplikat NIS dasar;
- record dengan riwayat tidak cukup tidak masuk publikasi;
- ringkasan menghitung siswa unik, bukan record;
- data yang sudah digabung menghasilkan satu baris per cakupan, bukan lima.

### Tahap 5 - Regenerasi pipeline

Setelah data diperbaiki:

1. Jalankan `npm run ml:extract`.
2. Jalankan `npm run ml:test`.
3. Jalankan `npm run ml:publish-b2`.
4. Jalankan `npm run ml:post:b2`.
5. Verifikasi tabel `Prediksi`:
   - jumlah baris;
   - jumlah `siswa_id` unik;
   - cakupan;
   - versi model.
6. Buka `/prediksi` dan cocokkan dengan data.

Perkiraan hasil setelah penggabungan:

- Jika siswa hasil penggabungan tetap boleh diprediksi: **1 siswa, 7 baris**.
- Jika publikasi dibatasi hanya untuk siswa dengan riwayat lengkap: **0 baris** karena semua siswa lengkap sudah berada di semester 6.

Angka final harus ditentukan setelah kebijakan publikasi dipilih.

### Tahap 6 - Perbarui laporan

Laporan ML harus memuat:

- temuan duplikasi NIS;
- perbedaan populasi evaluasi dan publikasi;
- jumlah record sebelum dan sesudah perbaikan;
- kebijakan publikasi yang dipilih;
- dampak terhadap jumlah baris di UI;
- bukti bahwa 35 baris lama berasal dari record parsial.

### Tahap 7 - Kriteria selesai

- Tidak ada lagi duplikat NIS dasar.
- NIS berdesimal tidak dapat masuk melalui import atau form.
- Populasi publikasi merupakan bagian dari populasi yang dievaluasi, atau perbedaannya dijelaskan dan dibatasi.
- UI menampilkan jumlah siswa yang benar.
- `Prediksi` tidak lagi memuat 35 baris dari record duplikat.
- Test, typecheck, lint, dan build lulus.
- Laporan ML memakai angka yang konsisten dengan data final.

---

## 6. Keputusan yang masih terbuka

1. **Format NIS:** apakah hanya angka bulat? Rekomendasi: ya.
2. **Kebijakan publikasi:** apakah siswa dengan riwayat semester 1-5 tetap boleh diprediksi? Rekomendasi: ya, dengan minimal dua semester riwayat dan label keterbatasan.
3. **Record kanonis:** record mana yang dipertahankan bila penggabungan dilakukan? Rekomendasi: record dengan NIS bersih `232470119`, setelah nilai dari record lain dipindahkan.
4. **Konflik nilai:** bila ada nilai berbeda untuk mapel dan semester yang sama, siapa yang berwenang memutuskan nilai yang benar?

---

## 7. Rollback

- Jika perbaikan data gagal di tengah transaksi, lakukan `ROLLBACK`; tidak ada perubahan yang tersimpan.
- Jika perubahan sudah commit tetapi hasilnya salah, pulihkan dari backup tahap 0.
- Jika hanya filter publikasi yang diubah, rollback cukup mengembalikan kode filter dan regenerasi ulang `Prediksi` dari artefak sebelumnya.
- Jangan menghapus backup sampai laporan final dan verifikasi UI selesai.

---

## 8. Referensi

- `ml/data/raw/siswa.csv`
- `ml/data/raw/nilai.csv`
- `ml/data/raw/metadata.json`
- `ml/artefak/prediksi_terbaru.csv`
- `ml/features.py`
- `ml/publish_b2.py`
- `src/lib/db/schema.sql`
- `src/lib/db/migrations/001_unique_constraints.sql`
- `src/lib/db/migrations/README.md`
- `src/lib/import/validate.ts`
- `src/lib/import/apply.ts`
- `src/server/service/prediksi.ts`
