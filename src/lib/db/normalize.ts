/**
 * Normalisasi baris PostgreSQL ke bentuk data aplikasi.
 *
 * Driver pg mengubah kolom TIMESTAMPTZ menjadi objek Date, sedangkan tipe
 * AuditLog menyatakan `waktu` sebagai string ISO. Tanpa normalisasi, kode
 * server yang mengira field itu string akan gagal saat dijalankan, misalnya
 * `waktu.localeCompare(...)` pada halaman audit log.
 *
 * Writer sudah memakai `new Date().toISOString()`, jadi dikonversi ke ISO
 * string di sini membuat jalur baca dan tulis konsisten.
 */

export function normalizeRow<T>(row: Record<string, unknown>): T {
  let normalized: Record<string, unknown> | null = null;
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      normalized ??= { ...row };
      normalized[key] = value.toISOString();
    }
  }
  // Tanpa kolom waktu, baris dikembalikan apa adanya supaya tidak disalin.
  return (normalized ?? row) as T;
}

export function normalizeRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => normalizeRow<T>(row));
}
