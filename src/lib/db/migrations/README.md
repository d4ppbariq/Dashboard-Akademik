# Migrasi Database

Migrasi ini dijalankan **manual** lewat DBeaver atau `psql`. Belum ada migration
runner di proyek; menambahkannya beserta pemecahan `src/lib/db/schema.sql`
ditunda ke tahap berikutnya.

## Urutan

| Berkas | Isi | Status |
|---|---|---|
| `001_unique_constraints.sql` | UNIQUE untuk `NilaiSiswa`, `KehadiranSiswa`, `Kelas` | ☐ belum dijalankan |

## Cara menjalankan

```bash
psql -U <user> -d <dbname> -f src/lib/db/migrations/001_unique_constraints.sql
```

Atau di DBeaver: **klik kanan file → Execute SQL Script**.

## Sebelum menjalankan

`001_unique_constraints.sql` akan **GAGAL** bila masih ada duplikat. Jalankan
terlebih dahulu ketiga query pada bagian "PEMERIKSAAN" di kepala file tersebut.
Setiap query harus mengembalikan 0 baris.

Bila ada duplikat, **Jangan dihapus diam-diam.** Periksa dulu apakah itu data
yang salah input atau memang duplikat sah. Setelah yakin, hapus sisanya
dengan tetap menyimpan satu baris. Contoh untuk nilai:

```sql
DELETE FROM "NilaiSiswa" a
 USING "NilaiSiswa" b
 WHERE a.id > b.id
   AND a.siswa_id = b.siswa_id
   AND a.mata_pelajaran_id = b.mata_pelajaran_id
   AND a.semester = b.semester;
```

## Rollback

```sql
ALTER TABLE "NilaiSiswa"    DROP CONSTRAINT IF EXISTS "uq_nilai_siswa_siswa_mapel_semester";
ALTER TABLE "KehadiranSiswa" DROP CONSTRAINT IF EXISTS "uq_kehadiran_siswa_siswa_semester";
ALTER TABLE "Kelas"          DROP CONSTRAINT IF EXISTS "uq_kelas_angkatan_nama";
```

Menjatuhkan constraint **tidak menghapus data**. Tetap ambil backup sebelum
menjalankan apa pun.

## Catatan hasil eksekusi

_Isi tabel ini setelah migrasi benar-benar dijalankan._

| Tanggal |Migrasi | Hasil dupe sebelum | Catatan |
|---|---|---|---|
| — | 001 | belum diperiksa | — |
