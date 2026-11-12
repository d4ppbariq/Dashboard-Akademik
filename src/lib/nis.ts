export type HasilNormalisasiNis =
  | { ok: true; nis: string }
  | { ok: false; error: string };

/**
 * NIS disimpan sebagai teks agar leading zero tidak hilang. Nilai dari Excel
 * kadang datang sebagai angka atau string berdesimal; hanya angka bulat yang
 * diterima, dan bagian pecahan nol dinormalisasi ke bentuk bulat.
 */
export function normalisasiNis(value: unknown): HasilNormalisasiNis {
  if (value === null || value === undefined) {
    return { ok: false, error: "NIS wajib diisi" };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value) || value < 0) {
      return { ok: false, error: "NIS harus bilangan bulat tanpa desimal" };
    }
    return { ok: true, nis: String(value) };
  }

  const raw = String(value).trim();
  if (raw === "") {
    return { ok: false, error: "NIS wajib diisi" };
  }

  if (/^\d+$/.test(raw)) {
    return { ok: true, nis: raw };
  }

  if (/^\d+\.\d+$/.test(raw)) {
    const parsed = Number(raw);
    if (Number.isSafeInteger(parsed) && parsed >= 0) {
      return { ok: true, nis: String(parsed) };
    }
    return { ok: false, error: "NIS harus bilangan bulat tanpa desimal" };
  }

  return { ok: false, error: "NIS hanya boleh berisi angka" };
}

/** Bagian bulat NIS, dipakai untuk mencocokkan data lama yang masih berpecahan. */
export function nisDasar(value: string): string {
  const trimmed = value.trim();
  const dot = trimmed.indexOf(".");
  return dot === -1 ? trimmed : trimmed.slice(0, dot);
}
