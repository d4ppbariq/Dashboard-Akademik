/**
 * Pembatasan percobaan login, tanpa I/O supaya bisa diuji.
 *
 * Dua penghitung terpisah:
 *  - per akun (email): batasnya kecil, inilah yang benar-benar melindungi akun
 *  - per IP: batasnya lebih longgar, menahan spray ke banyak akun
 *
 * Penghitung per IP bergantung pada header yang, tanpa reverse proxy, bisa
 * dipalsukan penyerang. Karena itu penghitung per akun tetap menjadi gerbang
 * utama: memalsukan X-Forwarded-For tidak melewati batas per akun.
 *
 * Penyimpanan di memori, jadi hilang saat restart. Untuk satu server sekolah
 * ini diterima; lihat catatan batasan di README.
 */

export interface LoginThrottleConfig {
  maxPercobaanPerAkun: number;
  maxPercobaanPerIp: number;
  windowMs: number;
  now?: () => number;
  /** Batas jumlah kunci yang disimpan, agar email acak tidak menumpuk. */
  maksKunci?: number;
}

export interface ThrottleVerdict {
  allowed: boolean;
  /** Sisa percobaan yang boleh sebelum jendela berikutnya, untuk pesan error. */
  sisa: number;
  /** Sisa detik sampai kunci dilepas. */
  tungguDetik: number;
}

interface Catatan {
  gagal: number;
  jendelaMulai: number;
}

const DEFAULT_MAKS_KUNCI = 1000;

export function createLoginThrottle({
  maxPercobaanPerAkun,
  maxPercobaanPerIp,
  windowMs,
  now = Date.now,
  maksKunci = DEFAULT_MAKS_KUNCI,
}: LoginThrottleConfig) {
  const catatan = new Map<string, Catatan>();

  function buangKedaluwarsa(saat: number): void {
    for (const [kunci, c] of catatan) {
      if (saat - c.jendelaMulai >= windowMs) catatan.delete(kunci);
    }
  }

  function kunciPerAkun(email: string): string {
    return `akun:${email.toLowerCase()}`;
  }

  function kunciPerIp(ip: string): string {
    return `ip:${ip}`;
  }

  function zona(kunci: string, batas: number, saat: number): ThrottleVerdict {
    const c = catatan.get(kunci);
    if (!c) return { allowed: true, sisa: batas, tungguDetik: 0 };
    const sisaWaktu = windowMs - (saat - c.jendelaMulai);
    if (sisaWaktu <= 0) return { allowed: true, sisa: batas, tungguDetik: 0 };
    if (c.gagal < batas) {
      return { allowed: true, sisa: batas - c.gagal, tungguDetik: 0 };
    }
    return { allowed: false, sisa: 0, tungguDetik: Math.ceil(sisaWaktu / 1000) };
  }

  return {
    periksa(email: string, ip: string): ThrottleVerdict {
      const saat = now();
      buangKedaluwarsa(saat);
      // Keduanya harus lolos. Per-email diperiksa lebih dulu karena inilah
      // batas yang tidak bisa dilewati dengan memalsukan header. Bila
      // keduanya lolos, sisa yang dilaporkan adalah batas per akun, karena itu
      // yang lebih sempit.
      const akun = zona(kunciPerAkun(email), maxPercobaanPerAkun, saat);
      if (!akun.allowed) return akun;
      const batasIp = zona(kunciPerIp(ip), maxPercobaanPerIp, saat);
      if (!batasIp.allowed) return batasIp;
      return akun;
    },

    catatGagal(email: string, ip: string): void {
      const saat = now();
      buangKedaluwarsa(saat);
      for (const kunci of [kunciPerAkun(email), kunciPerIp(ip)]) {
        const c = catatan.get(kunci);
        if (c && saat - c.jendelaMulai < windowMs) {
          c.gagal += 1;
        } else {
          catatan.set(kunci, { gagal: 1, jendelaMulai: saat });
        }
      }
      // Map mempertahankan urutan sisip, jadi kunci pertama adalah yang paling
      // lama. Cukup untuk menjaga memori tetap terbatas.
      while (catatan.size > maksKunci) {
        const terlama = catatan.keys().next();
        if (terlama.done) break;
        catatan.delete(terlama.value);
      }
    },

    reset(email: string, ip: string): void {
      catatan.delete(kunciPerAkun(email));
      catatan.delete(kunciPerIp(ip));
    },
  };
}