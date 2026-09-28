/**
 * Pencarian siswa di sisi server.
 *
 * Modul murni supaya aturan pencocokannya bisa diuji. Prinsipnya operator
 * tidak ingat urutan ejaan, jadi pencocokan harus longgar: contains untuk
 * nama, prefix untuk NIS.
 */

export interface SiswaCariKey {
  nama: string;
  nis: string;
}

export function siswaMencocok(s: SiswaCariKey, q: string): boolean {
  const cari = q.trim().toLowerCase();
  // Kueri kosong berarti operator belum mengetik apa pun: jangan saring.
  if (cari === "") return true;

  // Prefix, bukan contains: NIS diketik dari digit awal. Dengan contains,
  // mengetik "2507" ikut memunculkan NIS "12507" yang tidak relevan.
  if (s.nis.toLowerCase().startsWith(cari)) return true;

  return s.nama.toLowerCase().includes(cari);
}

export function saringSiswa<T extends SiswaCariKey>(siswa: T[], q: string): T[] {
  return siswa.filter((s) => siswaMencocok(s, q));
}
