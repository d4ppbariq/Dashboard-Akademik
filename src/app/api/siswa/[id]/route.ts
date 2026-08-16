import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import {
  getGenderDistribution,
  getKehadiranSiswa,
  getPeringkatMapelSiswa,
  getRekapNilaiSiswa,
  getRingkasan,
} from "@/server/service/statistics";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  const siswa = db.siswa.find((s) => s.id === id);
  if (!siswa) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }

  const kelas = db.kelas.find((k) => k.id === siswa.kelas_id);
  const angkatan = db.angkatan.find((a) => a.id === kelas?.angkatan_id);
  const mapels = db.mata_pelajaran;
  const semesterCount = Math.max(
    1,
    ...db.nilai_siswa.filter((n) => n.siswa_id === id).map((n) => n.semester)
  );

  const rekapPerSemester = Array.from({ length: semesterCount }, (_, i) =>
    getRekapNilaiSiswa(db, id, i + 1)
  );

  return NextResponse.json({
    siswa,
    kelas,
    angkatan,
    mapels,
    ringkasan: getRingkasan(db, [id]),
    gender: getGenderDistribution(db, [id]),
    kehadiran: getKehadiranSiswa(db, id),
    tren: rekapPerSemester.map((rekap, i) => {
      const item: Record<string, string | number | null> = {
        semester: `Sem ${i + 1}`,
      };
      for (const r of rekap) item[r.kode] = r.nilai;
      return item;
    }),
    rekapPerSemester,
    peringkatPerSemester: rekapPerSemester.map((rekap, i) =>
      getPeringkatMapelSiswa(db, id, i + 1)
    ),
  });
}
