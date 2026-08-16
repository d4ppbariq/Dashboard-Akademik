import { NextResponse } from "next/server";
import * as XLSX from "@e965/xlsx";
import { requireAuth, hasPermission } from "@/lib/auth/dal";

const TEMPLATES: Record<string, { sheet: string; headers: string[] }> = {
  siswa: {
    sheet: "Siswa",
    headers: ["NIS", "NAMA", "JENIS_KELAMIN", "ANGKATAN_ID", "KELAS"],
  },
  nilai: {
    sheet: "Nilai",
    headers: ["NIS", "KODE_MAPEL", "SEMESTER", "NILAI"],
  },
  kehadiran: {
    sheet: "Kehadiran",
    headers: ["NIS", "SEMESTER", "SAKIT", "IZIN", "ALPA"],
  },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "";
  const template = TEMPLATES[kind];
  if (!template) {
    return NextResponse.json({ error: "Jenis template tidak dikenal" }, { status: 400 });
  }

  const user = await requireAuth();
  if (!(await hasPermission(user, "import.execute"))) {
    return NextResponse.json({ error: "Tidak memiliki izin" }, { status: 403 });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([template.headers]);
  ws["!cols"] = template.headers.map((h) => ({ wch: h.length + 6 }));
  XLSX.utils.book_append_sheet(wb, ws, template.sheet);

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template-${kind}.xlsx"`,
    },
  });
}
