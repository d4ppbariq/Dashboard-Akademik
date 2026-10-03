import { z } from "zod";

/**
 * Kebijakan password, satu sumber untuk server action, komponen form, dan seed.
 *
 * Modul ini murni (tanpa I/O) supaya bisa diuji. Yang TIDAK ada di sini adalah
 * cara password disimpan: itu tetap urusan password.ts dan belum berubah.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/**
 * Batas atas 72 dipilih sekarang, bukan nanti, karena bcrypt memotong input
 * pada 72 byte. Nilai ini juga mencegah isian sangat besar pada form. Tetap
 * berlaku apabila hash password berubah ke bcrypt atau argon2.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password minimal ${PASSWORD_MIN} karakter`)
  .max(PASSWORD_MAX, `Password maksimal ${PASSWORD_MAX} karakter`);

export const KONFIRMASI_GAGAL = "Konfirmasi password tidak cocok";

/**
 * Konfirmasi diperiksa di server, bukan hanya di form. Yang dibandingkan adalah
 * input mentah, bukan hasil hash: tujuannya hanya memastikan dua ketikan sama.
 */
export function konfirmasiCocok(password: string, konfirmasi: unknown): boolean {
  return typeof konfirmasi === "string" && password === konfirmasi;
}