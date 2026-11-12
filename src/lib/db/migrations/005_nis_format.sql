-- ============================================================================
-- 005_nis_format.sql
--
-- Setelah duplikat NIS dibersihkan, pastikan NIS hanya berisi angka. NIS tetap
-- disimpan sebagai TEXT agar leading zero tidak hilang.
--
-- File ini idempoten. Dijalankan manual via psql / DBeaver, dan otomatis oleh
-- `npm run db:setup` untuk database baru.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ck_siswa_nis_digit'
       AND conrelid = '"Siswa"'::regclass
  ) THEN
    ALTER TABLE "Siswa"
      ADD CONSTRAINT "ck_siswa_nis_digit"
      CHECK (nis ~ '^[0-9]+$');
    RAISE NOTICE 'Ditambahkan: ck_siswa_nis_digit';
  ELSE
    RAISE NOTICE 'Sudah ada: ck_siswa_nis_digit';
  END IF;
END;
$$;

-- ====================== PEMERIKSAAN =========================================
-- SELECT nis FROM "Siswa" WHERE nis !~ '^[0-9]+$';
-- ============================================================================

-- ====================== ROLLBACK ============================================
-- ALTER TABLE "Siswa" DROP CONSTRAINT IF EXISTS "ck_siswa_nis_digit";
-- ============================================================================
