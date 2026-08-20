import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { Card, CardContent } from "@/components/ui/card";
import { SiswaDetailDialog } from "@/components/siswa/siswa-detail-dialog";

interface SiswaPageProps {
  searchParams: Promise<{ kelas?: string }>;
}

export default async function SiswaPage({ searchParams }: SiswaPageProps) {
  await requireRoute("/siswa");
  const { kelas: kelasParam } = await searchParams;

  const db = await getDb();
  const angkatanList = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);

  const kelasList = [...db.kelas].sort((a, b) => {
    const ay = angkatanList.find((x) => x.id === a.angkatan_id)?.tahun_lulus ?? 0;
    const by = angkatanList.find((x) => x.id === b.angkatan_id)?.tahun_lulus ?? 0;
    return by - ay || a.nama_kelas.localeCompare(b.nama_kelas);
  });

  const kelasId = kelasList.find((k) => k.id === kelasParam)?.id ?? kelasList[0]?.id;
  const kelas = kelasList.find((k) => k.id === kelasId)!;
  const angkatan = angkatanList.find((a) => a.id === kelas.angkatan_id);

  const siswaList = db.siswa
    .filter((s) => s.kelas_id === kelasId)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  const stats = new Map<
    string,
    { rataNilai: number; totalAlpa: number; totalHadir: number }
  >();
  for (const s of siswaList) {
    const nilai = db.nilai_siswa.filter((n) => n.siswa_id === s.id);
    const kehadiran = db.kehadiran_siswa.filter((k) => k.siswa_id === s.id);
    const rata =
      nilai.length === 0 ? 0 : nilai.reduce((a, n) => a + n.nilai, 0) / nilai.length;
    stats.set(s.id, {
      rataNilai: Math.round(rata * 10) / 10,
      totalAlpa: kehadiran.reduce((a, k) => a + k.tanpa_keterangan, 0),
      totalHadir: kehadiran.reduce(
        (a, k) => a + 36 - k.sakit - k.izin - k.tanpa_keterangan,
        0
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title="Pencarian Siswa"
        description={`Daftar siswa kelas ${kelas.nama_kelas} · Angkatan ${angkatan?.tahun_lulus}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SegmentedNav
          param="kelas"
          basePath="/siswa"
          options={kelasList
            .filter((k) => k.angkatan_id === kelas.angkatan_id)
            .map((k) => ({ value: k.id, label: `Kelas ${k.nama_kelas}` }))}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">NIS</th>
                  <th className="p-3 font-medium">Nama</th>
                  <th className="p-3 font-medium">JK</th>
                  <th className="p-3 text-right font-medium">Rata-rata Nilai</th>
                  <th className="p-3 text-right font-medium">Total Alpa</th>
                  <th className="p-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {siswaList.map((s) => {
                  const st = stats.get(s.id)!;
                  const nilaiTone =
                    st.rataNilai >= 80
                      ? "text-emerald-600 dark:text-emerald-400"
                      : st.rataNilai >= 70
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400";
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3 tabular-nums text-muted-foreground">{s.nis}</td>
                      <td className="p-3 font-medium">{s.nama}</td>
                      <td className="p-3 text-muted-foreground">
                        {s.jenis_kelamin === "L" ? "L" : "P"}
                      </td>
                      <td className={`p-3 text-right font-semibold tabular-nums ${nilaiTone}`}>
                        {st.rataNilai}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <span className={st.totalAlpa > 5 ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                          {st.totalAlpa}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <SiswaDetailDialog siswaId={s.id} />
                      </td>
                    </tr>
                  );
                })}
                {siswaList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Belum ada siswa di kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
