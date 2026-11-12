# Rencana — Konfigurasi Hari Efektif & Validasi Kehadiran

Status: **diimplementasikan sebagian** · 12 November 2026
Dokumen terkait: `ML_Roadmap_Capstone.md`, `Protokol_Evaluasi_A1.md`, `docs/DRAFT4_Proposal_Capstone.md`

> **Catatan pelaksanaan.** Denominator yang dipakai bukan 36, melainkan
> **100 hari efektif sementara** dari `config/hari-efektif.json`, karena 36
> membuat rasio negatif. Modul `src/lib/attendance/calendar.ts`, penggantian
> dua literal, validasi impor, validasi form manual, dan test sudah
> diimplementasikan. Langkah 5 (ringkasan kualitas kehadiran di halaman impor)
> belum dikerjakan. Data aktual setelah deduplikasi: 2 angkatan, 351 siswa, dan
> 3 baris dengan total absen >36.

---

## 1. Latar Belakang

Asumsi "36 hari efektif per semester" saat ini tertulis sebagai literal di dua
file dan tidak punya sumber yang dapat diaudit:

- `src/app/(protected)/siswa/page.tsx:70`
- `src/app/(protected)/akademik/page.tsx:55`

Keduanya menghitung `36 - k.sakit - k.izin - k.tanpa_keterangan`.

Dua masalah muncul dari keadaan sekarang.

**1.1 Angka 36 menghasilkan rasio negatif pada data yang sudah ada.**
Pemeriksaan terhadap 1.086 baris `KehadiranSiswa` menemukan 2 baris yang total
kehilangan hari melebihi 36:

| NIS | Nama | Semester | Sakit | Izin | Alpa | Total |
|---|---|---|---|---|---|---|
| 232470157 | Wildan Reo Alfandi | 5 | 38 | 1 | 0 | 39 |
| 232470165 | Bagas Aryanta Pamungkas | 5 | 6 | 0 | 58 | 64 |

> **Data 12 November 2026 (2 angkatan).** Ada satu baris tambahan yang juga
> melebihi 36: Zahra Amelia, semester 3, total 42 hari. Karena itu jumlah
> baris bermasalah pada dataset saat ini adalah **3**, bukan 2.

Deret semester Bagas: 8 → 11 → 6 → 26 → **64** → 17. Pola lonjakan pada satu
semester, bukan ketidakhadiran yang wajar. Diduga kesalahan input operator.

Distribusinya sendiri sehat — p50 3 hari, p95 16 hari, p99 22,2 hari, mean
4,60. Jadi yang bermasalah adalah 3 baris tersebut, bukan konstantanya.

**1.2 Angka yang sama tidak bisa diturunkan dari data.**
Hari efektif adalah properti kalender sekolah, bukan statistik. Menyimpulkan
nilainya dari dataAccessor berarti angka itu bergeser setiap kali data bertambah,
dan aplikasi serta pipeline ML bisa sampai berbeda angka untuk angkatan yang
sama. `Protokol_Evaluasi_A1.md:81-84` menyebut konsekuensi ini secara eksplisit:
kalau pipeline memakai definisi sendiri, laporan model dan laporan dashboard bisa
berbeda angka, dan ketika berbeda tidak ada yang bisa bilang mana yang benar.

---

## 2. Tujuan

- Satu sumber tunggal untuk angka hari efektif, dapat diimpor aplikasi **dan**
  pipeline ML.
- Rasio kehadiran tidak pernah negatif, dan kondisi data yang tidak masuk akal
  selalu terlihat — tidak pernah ter-clip diam-diam.
- Impor dan form manual sama-sama menolak angka kehadiran yang melebihi hari
  efektif semester tersebut.
- Angka hanya berubah bila kalender sekolah berubah (keputusan sadar), bukan
  sebagai efek samping pertumbuhan data.

## 3. Di Luar Cakupan

- Menentukan nilai akhir hari efektif. Itu memerlukan kalender resmi SMPN 1
  Cibalong yang belum tersedia. Langkah 1 memakai 36 sebagai nilai sementara.
- Memperbaiki 2 baris yang sudah ada di database. Perbaikan dilakukan operator
  lewat form yang sudah ada.
- Mengubah tampilan persentase kehadiran di UI.
- Perubahan pada tabel `KehadiranSiswa` atau skema SQL.

---

## 4. Rencana Langkah

### Langkah 1 — Modul konfigurasi (baru)

Berkas: `src/lib/attendance/calendar.ts`

```ts
export const HARI_EFAKTIF: Record<number, number>;
export function hariEfektif(semester: number): number;
export function rasioHadir(
  sakit: number,
  izin: number,
  alpa: number,
  semester: number
): { nilai: number; melebihi: boolean };
```

- `hariEfektif` melempar error untuk semester di luar 1..6, memakai
  `SEMESTER_MAX` yang sudah ada di `src/lib/import/validate.ts:12`, atau
  `JUMLAH_SEMESTER` di `src/lib/db/seed.ts:3` bila dependensi itu lebih tepat.
  Putuskan satu sumber agar tidak ada konstanta ganda.
- `rasioHadir` meng-clip ke rentang 0..1 dan mengembalikan `melebihi` agar
  caller bisa menampilkan penanda kondisi data yang tidak wajar.
- Nilai `HARI_EFAKTIF` diisi 36 untuk semester 1..6, disertai komentar yang
  menyatakan bahwa angka itu **asumsi warisan aplikasi, bukan hasil kalender
  sekolah**.

### Langkah 2 — Ganti dua literal

- `src/app/(protected)/siswa/page.tsx:70`
- `src/app/(protected)/akademik/page.tsx:55`

Kedua loop menjumlahkan seluruh semester milik satu siswa, sehingga pemanggilan
wajib per-semester (`k.semester` tersedia pada baris tersebut) lalu
dijumlahkan — bukan memakai satu konstanta global.

Perhatikan bentuknya: yang ditampilkan adalah **jumlah hari hadir**, bukan
rasio. Jadi hasilnya `rasioHadir(...) * hariEfektif(...)`.

### Langkah 3 — Validasi impor

Berkas: `src/lib/import/validate.ts`, di dalam `numField` (baris 248-261),
tepat di sebelah pemeriksaan `n < 0` yang sudah ada.

Tambahkan pemeriksaan total `sakit + izin + tanpaKeterangan` terhadap
`hariEfektif(semester)`.

Dipakai `fail` (tolak baris), bukan `warn`. Alasannya: impor bersifat
all-or-nothing (`ML_Roadmap_Capstone.md:190`), sehingga menolak seluruh file
memang konsekuensi yang sudah diharapkan operator. Menerima 64 hari alpa
berarti mengabadikan angka salah ke tabel yang menjadi bahan penelitian.

Pesan error menyebut batasnya, contoh:
`Total kehadiran semester 5 = 64 hari, melebihi 36 hari efektif`

### Langkah 4 — Validasi form manual

Berkas: `src/lib/siswa/academic-actions.ts`, `KehadiranSchema` (baris 25-32).

Saat ini hanya `.min(0)` per komponen, sehingga angka melebihi hari efektif tetap
bisa masuk lewat form manual meski impor sudah ketat. Tambahkan `.refine()` atas
totalnya agar kedua jalur konsisten.

### Langkah 5 — Laporan kualitas kehadiran

Berkas: `src/components/import/import-client.tsx`, di sekitar baris 163-164.

Halaman laporan saat ini hanya meringkas kolom mapel (`terisiKolom` /
`kosongKolom`). Tambahkan ringkasan kehadiran: jumlah hari sakit, izin, alpa,
rata-rata, dan berapa baris yang melebihi hari efektif.

### Langkah 6 — Test

Perintah: `npm test`, `npm run lint`, `npm run typecheck`.

Berkas baru `src/lib/attendance/calendar.test.ts`:

- `rasioHadir(38, 1, 0, 5)` tidak negatif dan `melebihi` bernilai `true`
- `rasioHadir(6, 0, 58, 5)` tidak negatif dan `melebihi` bernilai `true`
- `hariEfektif(0)` dan `hariEfektif(7)` melempar error
- total tepat sama dengan hari efektif diterima — boundary, tanpa off-by-one

Berkas `src/lib/import/validate.test.ts` (tambahan):

- baris dengan total melebihi batas masuk ke `ditolak`
- pesan error menyebut angka batasnya

### Langkah 7 — Dokumentasi

- `ML_Roadmap_Capstone.md:87-89` — ubah catatan "asumsi 36 hari" menjadi
  rujukan modul, dan nyatakan bahwa pipeline **wajib** memanggil `rasioHadir`.
- `Protokol_Evaluasi_A1.md` §3 — tambahkan aturan yang dibekukan: definisi
  rasio kehadiran di pipeline tidak boleh dibuat ulang, harus sama persis dengan
  modul aplikasi.
- `DRAFT4_Proposal_Capstone.md` §3.5 — **sudah diperbarui** dengan angka
  ekstraksi 12 November 2026 setelah deduplikasi (2 angkatan, 351 siswa,
  22.477 nilai).

---

## 5. Angka Cakupan Data Saat Ini

Dokumen awal menyebut 61 siswa dan ±4.000 baris `NilaiSiswa`. Ekstraksi
12 November 2026 setelah deduplikasi menunjukkan kondisi aktual:

| Tabel | Baris |
|---|---|
| `NilaiSiswa` | 22.477 |
| `KehadiranSiswa` | 2.101 |
| `Siswa` | 351 |
| `Angkatan` | 2 |
| `Kelas` | 12 |
| `MataPelajaran` | 13 (9 mapel umum yang sama pada kedua angkatan) |
| `Role` / `User` | 3 / 3 |

Angka ini sudah dipakai di `DRAFT4_Proposal_Capstone.md` §3.5 dan
`ML_Roadmap_Capstone.md` §10. Rincian ekstraksi ada di
`ml/data/raw/metadata.json`.

---

## 6. Justifikasi Fitur Kehadiran

Kehadiran masuk ke ablation wajib `Protokol_Evaluasi_A1.md:120-142`:

```
B0 (nilai semester sebelumnya)
  → + kehadiran
    → + z-score relatif → + demografi
```

Pertanyaan yang harus dijawab: informasi apa yang benar-benar menambah nilai di
luar pengulangan nilai itu sendiri. Karena nilai antar semester sangat
autocorrelated, B0 saja sudah kuat. Bila kehadiran tidak menambah apa-apa, klaim
bahwa machine learning diperlukan tidak dapat dipertanggungjawabkan.

Pemeriksaan awal pada 1.066 pasangan siswa-semester (satu angkatan, sebelum
ekstraksi 2 angkatan) menunjukkan sinyal yang konsisten:

| Kelompok alpa | n | Rata-rata nilai |
|---|---|---|
| 0 | 835 | 86,96 |
| 1-2 | 129 | 84,85 |
| >2 | 102 | 83,69 |

Korelasi total kehilangan hari terhadap rata-rata nilai: **-0,329**. Korelasi
alpa terhadap rata-rata nilai: **-0,243**.

Rasio — bukan jumlah hari mentah — tetap dipakai karena menyamakan skala antar
angkatan ketika hari efektif berbeda antar tahun ajaran.

---

## 7. Risiko

| Risiko | Mitigasi |
|---|---|
| Nilai hari efektif salah, membuat rasio menyesatkan | Nilai sementara 36 diberi komentar yang jelas. Angka final diisi setelah ada konfirmasi kalender sekolah. |
| Operator lama mengirim angka yang kini ditolak | Pesan error menyebut batasnya dan semester berapa, sehingga mudah dipahami. |
| Divergensi antara dashboard dan laporan model | Aturan pada Langkah 7 mengunci pipeline ML memakai modul yang sama. |
| Angka 36 terbaca sebagai fakta kalender | Komentar berkode di `calendar.ts` menyatakan asal-usulnya adalah asumsi warisan. |
| Impor all-or-nothing menolak file yang sebelumnya diterima | Justru inilah tujuan rencana ini; 2 baris yang ada di database membuktikan nilai yang sebelumnya lolos tidak layak. |

---

## 8. Keputusan yang Masih Menunggu

Nilai akhir `HARI_EFAKTIF` memerlukan kalender resmi SMPN 1 Cibalong: jumlah
hari efektif tiap semester. Selama belum ada konfirmasi, Langkah 1 memakai 36
dan jejaknya dinyatakan jelas di dalam kode.