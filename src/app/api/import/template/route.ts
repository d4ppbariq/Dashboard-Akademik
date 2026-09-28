import { NextResponse } from "next/server";
import * as XLSX from "@e965/xlsx";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";

const FIXED_HEADERS = [
  "NIS",
  "Nama",
  "Jenis Kelamin",
  "Semester",
  "Sakit",
  "Izin",
  "Tanpa Keterangan",
];

const SHEET_DATA = "Import Data";
const SHEET_PANDUAN = "Panduan";

export async function GET() {
  const user = await requireAuth();
  if (!(await hasPermission(user, "import.execute"))) {
    return NextResponse.json({ error: "Tidak memiliki izin" }, { status: 403 });
  }

  const db = await getDb();
  // Header memakai KODE, bukan nama mapel: nama panjang mudah salah ketik dan
  // sulit dicocokkan, sedangkan kode stabil dan unik.
  const mapel = [...db.mata_pelajaran].sort((a, b) => a.urutan - b.urutan);
  const headers = [...FIXED_HEADERS, ...mapel.map((m) => m.kode)];

  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length, 10) + 4 }));
  XLSX.utils.book_append_sheet(wb, ws, SHEET_DATA);

  // Sheet panduan: memetakan kode ke nama lengkap, plus aturan singkat.
  const panduan = [
    ["Kode", "Nama Mata Pelajaran", "Keterangan"],
    ...mapel.map((m) => [m.kode, m.nama_mapel, ""]),
    [],
    ["Aturan", "Keterangan", ""],
    ["NIS", "Wajib, unik per kelas. NIS yang sudah ada di kelas yang sama akan diperbarui.", ""],
    ["Jenis Kelamin", "Wajib L atau P.", ""],
    ["Semester", "Wajib bilangan bulat 1-6.", ""],
    ["Sakit / Izin / Tanpa Keterangan", "Opsional. Kosongkan seluruh bagian bila tidak ingin mengubah data kehadiran lama.", ""],
    ["Kolom nilai", "Isi 0-100. Kosong berarti tidak ada nilai. Nilai di luar 0-100 membatalkan seluruh impor.", ""],
    ["Impor", "All-or-nothing: bila satu baris tidak valid, tidak ada baris yang ditulis.", ""],
  ];
  const wsPanduan = XLSX.utils.aoa_to_sheet(panduan);
  wsPanduan["!cols"] = [{ wch: 32 }, { wch: 70 }, { wch: 4 }];
  XLSX.utils.book_append_sheet(wb, wsPanduan, SHEET_PANDUAN);

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import.xlsx"',
    },
  });
}
