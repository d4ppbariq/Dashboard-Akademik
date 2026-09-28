import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import {
  getRingkasan,
  getRekapNilaiPerSemester,
  siswaIdsInKelas,
} from "@/server/service/statistics";
import { JUMLAH_SEMESTER } from "@/lib/db/seed";

interface KelasPageProps {
  searchParams: Promise<{ angkatan?: string; semester?: string }>;
}

export default async function KelasPage({ searchParams }: KelasPageProps) {
  await requireRoute("/kelas");
  const { angkatan: angkatanParam, semester: semesterParam } = await searchParams;

  const db = await getDb();
  const angkatanList = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);

  if (angkatanList.length === 0) {
    return (
      <div>
        <PageHeader
          title="Rekap Akademik"
          description="Rekapitulasi gabungan nilai dan kehadiran per kelas"
        />
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Belum ada data akademik. Silakan buat angkatan di menu Master Data terlebih
          dahulu.
        </div>
      </div>
    );
  }

  const angkatanId =
    angkatanList.find((a) => a.id === angkatanParam)?.id ?? angkatanList[0].id;
  const angkatan = angkatanList.find((a) => a.id === angkatanId)!;
  const semester = clamp(Number(semesterParam ?? JUMLAH_SEMESTER), 1, JUMLAH_SEMESTER);

  const kelasList = db.kelas
    .filter((k) => k.angkatan_id === angkatanId)
    .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));

  const rows = kelasList.map((kelas) => {
    const siswaIds = siswaIdsInKelas(db, kelas.id);
    const ringkasan = getRingkasan(db, siswaIds);
    const rekap = getRekapNilaiPerSemester(db, siswaIds, semester);
    // Hanya mapel yang benar-benar punya nilai ikut dihitung. Jika null ikut
    // dijumlahkan, rata-rata kelas turun karena(mapel yang tidak berlaku
    // untuk angkatan ini ikut membagi.
    const adaNilai = rekap.filter((r) => r.nilai !== null);
    const rataNilai =
      adaNilai.length === 0
        ? 0
        : adaNilai.reduce((a, r) => a + (r.nilai as number), 0) / adaNilai.length;
    return { kelas, ringkasan, rekap, rataNilai: Math.round(rataNilai * 10) / 10 };
  });

  const semesterOptions = Array.from({ length: JUMLAH_SEMESTER }, (_, i) => ({
    value: String(i + 1),
    label: `Sem ${i + 1}`,
  }));

  return (
    <div>
      <PageHeader
        title="Rekap Akademik"
        description={`Rekapitulasi gabungan nilai dan kehadiran per kelas · Angkatan ${angkatan.tahun_lulus}`}
        actions={
          <SegmentedNav
            param="angkatan"
            basePath="/kelas"
            options={angkatanList.map((a) => ({
              value: a.id,
              label: `Angkatan ${a.tahun_lulus}`,
            }))}
          />
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">Per Kelas</CardTitle>
          <SegmentedNav
            param="semester"
            basePath="/kelas"
            options={semesterOptions}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Kelas</th>
                  <th className="p-3 text-right font-medium">Siswa</th>
                  <th className="p-3 text-right font-medium">Rata-rata Nilai</th>
                  <th className="p-3 text-right font-medium">Sakit</th>
                  <th className="p-3 text-right font-medium">Izin</th>
                  <th className="p-3 text-right font-medium">Alpa</th>
                  <th className="p-3 text-right font-medium">Terbaik</th>
                  <th className="p-3 text-right font-medium">Terendah</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ kelas, ringkasan, rataNilai, rekap }) => {
                  // null (mapel tidak berlaku) tidak boleh menjadi "Terendah".
                  const sorted = rekap
                    .filter((r) => r.nilai !== null)
                    .sort((a, b) => (b.nilai as number) - (a.nilai as number));
                  return (
                    <tr key={kelas.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3 font-medium">Kelas {kelas.nama_kelas}</td>
                      <td className="p-3 text-right tabular-nums">
                        {formatNumber(ringkasan.totalSiswa)}
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums text-emerald-600">
                        {rataNilai}
                      </td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(ringkasan.totalSakit)}</td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(ringkasan.totalIzin)}</td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(ringkasan.totalAlpa)}</td>
                      <td className="p-3 text-right tabular-nums">{sorted[0]?.mapel}</td>
                      <td className="p-3 text-right tabular-nums">{sorted[sorted.length - 1]?.mapel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {rows.map(({ kelas, rekap }) => (
          <Card key={kelas.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Kelas {kelas.nama_kelas} · Sem {semester}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {rekap.map((r) => (
                      <tr key={r.kode} className="border-b last:border-0">
                        <td className="p-2 text-muted-foreground">{r.kode}</td>
                        <td className="p-2">{r.mapel}</td>
                        <td className="p-2 text-right font-semibold tabular-nums">
                          {r.nilai}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}
