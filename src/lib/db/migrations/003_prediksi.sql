-- ============================================================================
-- 003_prediksi.sql
--
-- Tabel penerbitan hasil prediksi ML (skenario A1 dan lanjutan).
-- Model dilatih di luar aplikasi; web hanya membaca hasil jadi.
--
-- Catatan desain:
--   * `cakupan` = 'RATA_RATA' untuk target rata-rata 9 mapel umum, atau kode
--     mapel (mis. 'MTK') untuk target per-mapel.
--   * `mata_pelajaran_id` NULL hanya untuk cakupan 'RATA_RATA'. Kolom ini
--     dipakai bersama `cakupan` agar UNIQUE tetap bekerja (NULL tidak unik di
--     PostgreSQL).
--   * `model_versi` memungkinkan beberapa versi hidup berdampingan untuk audit.
--   * `metrik` menyimpan ringkasan evaluasi (MAE/RMSE/baseline) sebagai JSONB.
--
-- File ini idempoten. Dijalankan manual via DBeaver / psql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Prediksi" (
  id                 TEXT PRIMARY KEY,
  skenario           TEXT NOT NULL DEFAULT 'A1',
  level              TEXT NOT NULL DEFAULT 'siswa'
                     CHECK (level IN ('siswa', 'kelas', 'angkatan')),
  siswa_id           TEXT REFERENCES "Siswa"(id) ON DELETE CASCADE,
  mata_pelajaran_id  TEXT REFERENCES "MataPelajaran"(id) ON DELETE CASCADE,
  cakupan            TEXT NOT NULL DEFAULT 'RATA_RATA',
  semester_asal      INTEGER NOT NULL CHECK (semester_asal BETWEEN 1 AND 5),
  semester_target    INTEGER NOT NULL CHECK (semester_target BETWEEN 2 AND 6),
  horizon            INTEGER NOT NULL CHECK (horizon BETWEEN 1 AND 5),
  nilai_prediksi     NUMERIC(5, 2) NOT NULL
                     CHECK (nilai_prediksi BETWEEN 0 AND 100),
  interval_bawah     NUMERIC(5, 2) NOT NULL
                     CHECK (interval_bawah BETWEEN 0 AND 100),
  interval_atas      NUMERIC(5, 2) NOT NULL
                     CHECK (interval_atas BETWEEN 0 AND 100),
  model_versi        TEXT NOT NULL,
  metrik             JSONB NOT NULL DEFAULT '{}'::jsonb,
  dibuat_pada        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (semester_target = semester_asal + horizon),
  CHECK (interval_bawah <= interval_atas),
  CHECK (interval_bawah <= nilai_prediksi AND nilai_prediksi <= interval_atas),
  CHECK (
    (cakupan = 'RATA_RATA' AND mata_pelajaran_id IS NULL)
    OR
    (cakupan <> 'RATA_RATA' AND mata_pelajaran_id IS NOT NULL)
  ),
  CHECK (level <> 'siswa' OR siswa_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_prediksi_siswa_cakupan_target_versi
  ON "Prediksi" (siswa_id, cakupan, semester_target, model_versi);

CREATE INDEX IF NOT EXISTS idx_prediksi_siswa
  ON "Prediksi" (siswa_id);

CREATE INDEX IF NOT EXISTS idx_prediksi_target
  ON "Prediksi" (semester_target);

-- ====================== PEMERIKSAAN =========================================
-- SELECT COUNT(*) FROM "Prediksi";
-- SELECT * FROM "Prediksi" ORDER BY dibuat_pada DESC LIMIT 10;
-- ============================================================================

-- ====================== ROLLBACK ============================================
-- DROP TABLE IF EXISTS "Prediksi";
-- ============================================================================
