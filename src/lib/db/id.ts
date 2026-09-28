import type { Database } from "./types";

/**
 * Pembuat id string tanpa lock database.
 *
 * Format dipertahankan sama dengan implementasi lama agar id yang sudah
 * tersimpan tidak berubah:
 *   "<prefix>-<waktu base36>-<acak base36 6 char>"
 *
 * Alasan diekstrak ke modul murni: jalur impor membangkitkan ribuan id dalam
 * satu permintaan. Versi lama memindai array penuh pada tiap pemanggilan
 * (O(n^2) total), sehingga impor satu kelas menggantung pada database yang
 * sudah bertumbuh.
 */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomSuffix()}`;
}

/**
 * Mengalokasikan id yang dijamin unik terhadap id yang sudah ada, memakai Set
 * (O(1)) alih-alih memindai array.
 *
 * Gunakan untuk operasi massal; untuk satu atau dua id, `newId` sudah cukup.
 */
export class IdAllocator {
  private readonly used = new Map<string, Set<string>>();

  reserve(prefix: string, id: string): void {
    let set = this.used.get(prefix);
    if (!set) {
      set = new Set<string>();
      this.used.set(prefix, set);
    }
    set.add(id);
  }

  next(prefix: string): string {
    let set = this.used.get(prefix);
    if (!set) {
      set = new Set<string>();
      this.used.set(prefix, set);
    }
    let id: string;
    do {
      id = `${prefix}-${Date.now().toString(36)}-${randomSuffix()}`;
    } while (set.has(id));
    set.add(id);
    return id;
  }
}

type IdBearing = { id?: unknown };

/** Membangun allocator yang sudah mengingat seluruh id yang ada di database. */
export function createIdAllocator(db: Database): IdAllocator {
  const allocator = new IdAllocator();

  const seed = (prefix: string, rows: unknown[] | undefined): void => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      const id = (row as IdBearing).id;
      if (typeof id === "string") allocator.reserve(prefix, id);
    }
  };

  seed("u", db.users);
  seed("perm", db.permissions);
  seed("menu", db.menus);
  seed("route", db.routes);
  seed("s", db.siswa);
  seed("n", db.nilai_siswa);
  seed("k", db.kehadiran_siswa);
  seed("log", db.audit_log);

  return allocator;
}

/**
 * Versi sederhana satu-id untuk jalur dingin (buat satu user, satu menu, dll).
 * Tetap menerima array agar tidak harus mengubah semua call site.
 */
export function newId(prefix: string, list?: unknown[]): string {
  let id: string;
  do {
    id = generateId(prefix);
  } while (list?.some((item) => (item as IdBearing).id === id));
  return id;
}
