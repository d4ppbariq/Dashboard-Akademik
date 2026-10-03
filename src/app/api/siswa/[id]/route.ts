import { NextResponse } from "next/server";
import { requireAuth, hasPermission } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import {
  getKehadiranSiswa,
  getPeringkatMapelSiswa,
  getRekapNilaiSiswa,
  getRingkasan,
} from "@/server/service/statistics";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  // requireAuth() tidak pernah mengembalikan null: ia memanggil redirect() saat
  // sesi tidak ada. Karena itu cabang 401 di sini adalah kode mati. Yang
  // hilang sebelumnya adalah pemeriksaan permission, bukan cek 401.
  const user = await requireAuth();
  if (!(await hasPermission(user, "siswa.read"))) {
    return NextResponse.json({ error: "Tidak memiliki izin" }, { status: 403 });
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
    ...db.nilai_siswa.filter((n) => n.siswa_id === id).map((n) => n.semester),
    ...db.kehadiran_siswa.filter((k) => k.siswa_id === id).map((k) => k.semester)
  );

  const rekapPerSemester = Array.from({ length: semesterCount }, (_, i) =>
    getRekapNilaiSiswa(db, id, i + 1)
  );

  const nilaiRaw = db.nilai_siswa
    .filter((n) => n.siswa_id === id)
    .map((n) => {
      const m = mapels.find((mp) => mp.id === n.mata_pelajaran_id);
      return { id: n.id, mata_pelajaran_id: n.mata_pelajaran_id, kode: m?.kode ?? "", nama_mapel: m?.nama_mapel ?? "", semester: n.semester, nilai: n.nilai };
    })
    .sort((a, b) => a.semester - b.semester || a.nama_mapel.localeCompare(b.nama_mapel));

  const kehadiranRaw = db.kehadiran_siswa
    .filter((k) => k.siswa_id === id)
    .map((k) => ({ id: k.id, semester: k.semester, sakit: k.sakit, izin: k.izin, tanpa_keterangan: k.tanpa_keterangan }))
    .sort((a, b) => a.semester - b.semester);

  return NextResponse.json({
    siswa,
    kelas,
    angkatan,
    mapels,
    ringkasan: getRingkasan(db, [id]),
    kehadiran: getKehadiranSiswa(db, id),
    rekapPerSemester,
    peringkatPerSemester: rekapPerSemester.map((_, i) =>
      getPeringkatMapelSiswa(db, id, i + 1)
    ),
    nilaiRaw,
    kehadiranRaw,
  });
}
