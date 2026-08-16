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

export async function GET() {
  const user = await requireAuth();
  if (!(await hasPermission(user, "import.execute"))) {
    return NextResponse.json({ error: "Tidak memiliki izin" }, { status: 403 });
  }

  const db = await getDb();
  const mapelHeaders = db.mata_pelajaran
    .sort((a, b) => a.urutan - b.urutan)
    .map((m) => m.nama_mapel);

  const headers = [...FIXED_HEADERS, ...mapelHeaders];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length, 10) + 4 }));
  XLSX.utils.book_append_sheet(wb, ws, "Import Data");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import.xlsx"',
    },
  });
}
