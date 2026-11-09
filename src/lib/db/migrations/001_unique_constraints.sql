-- ============================================================================
-- 001_unique_constraints.sql
--
-- Menambahkan constraint UNIQUE pada tiga tabel akademik yang tadinya bebas
-- duplikat. File ini idempoten (aman dijalankan berulang) karena setiap
-- penambahan dibungkus pemeriksaan pg_constraint.
--
-- JALAN DULU: query diagnostik di bagian "PEMERIKSAAN" pada file ini, dan catat
-- hasilnya di migrations/README.md. Bila masih ada duplikat, constraint akan
-- GAGAL dipasang — dan itu memang perilaku yang diinginkan: jangan memasukkan
-- data ganda diam-diam.
--
-- Dijalankan manual via DBeaver / psql (belum ada migration runner).
-- ============================================================================

-- ====================== PEMERIKSAAN (JALAN DULU) =============================
-- Setiap query di bawah harus mengembalikan 0 baris sebelum constraint dipasang.
--
-- SELECT siswa_id, mata_pelajaran_id, semester, COUNT(*) AS jumlah
--   FROM "NilaiSiswa"
--  GROUP BY 1, 2, 3
-- HAVING COUNT(*) > 1;
--
-- SELECT siswa_id, semester, COUNT(*) AS jumlah
--   FROM "KehadiranSiswa"
--  GROUP BY 1, 2
-- HAVING COUNT(*) > 1;
--
-- SELECT angkatan_id, nama_kelas, COUNT(*) AS jumlah
--   FROM "Kelas"
--  GROUP BY 1, 2
-- HAVING COUNT(*) > 1;
-- ============================================================================

-- ====================== KONSTRAINT ==========================================

-- Nilai satu siswa untuk satu mapel pada satu semester hanya boleh satu baris.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'uq_nilai_siswa_siswa_mapel_semester'
       AND conrelid = '"NilaiSiswa"'::regclass
  ) THEN
    ALTER TABLE "NilaiSiswa"
      ADD CONSTRAINT "uq_nilai_siswa_siswa_mapel_semester"
      UNIQUE (siswa_id, mata_pelajaran_id, semester);
    RAISE NOTICE 'Ditambahkan: uq_nilai_siswa_siswa_mapel_semester';
  ELSE
    RAISE NOTICE 'Sudah ada: uq_nilai_siswa_siswa_mapel_semester';
  END IF;
END;
$$;

-- Kehadiran satu siswa pada satu semester hanya boleh satu baris.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'uq_kehadiran_siswa_siswa_semester'
       AND conrelid = '"KehadiranSiswa"'::regclass
  ) THEN
    ALTER TABLE "KehadiranSiswa"
      ADD CONSTRAINT "uq_kehadiran_siswa_siswa_semester"
      UNIQUE (siswa_id, semester);
    RAISE NOTICE 'Ditambahkan: uq_kehadiran_siswa_siswa_semester';
  ELSE
    RAISE NOTICE 'Sudah ada: uq_kehadiran_siswa_siswa_semester';
  END IF;
END;
$$;

-- Nama kelas unik dalam satu angkatan (mis. tidak ada dua "7A").
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'uq_kelas_angkatan_nama'
       AND conrelid = '"Kelas"'::regclass
  ) THEN
    ALTER TABLE "Kelas"
      ADD CONSTRAINT "uq_kelas_angkatan_nama"
      UNIQUE (angkatan_id, nama_kelas);
    RAISE NOTICE 'Ditambahkan: uq_kelas_angkatan_nama';
  ELSE
    RAISE NOTICE 'Sudah ada: uq_kelas_angkatan_nama';
  END IF;
END;
$$;
