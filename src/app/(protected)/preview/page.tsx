import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { GenderDonut } from "@/components/charts/gender-donut";
import { KehadiranBar } from "@/components/charts/kehadiran-bar";
import { TrenLine } from "@/components/charts/tren-line";
import { RekapBar } from "@/components/charts/rekap-bar";
import { PeringkatBar } from "@/components/charts/peringkat-bar";
import {
  getGenderDistribution,
  getKehadiranPerSemester,
  getTrenNilai,
  getRekapNilaiPerSemester,
  getPeringkatMapel,
  siswaIdsInAngkatan,
} from "@/server/service/statistics";
import { JUMLAH_SEMESTER } from "@/lib/db/seed";

export default async function PreviewPage() {
  await requireRoute("/preview");

  const db = await getDb();
  const angkatanList = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);

  if (angkatanList.length === 0) {
    return (
      <div>
        <PageHeader
          title="Contoh / Pratinjau"
          description="Galeri jenis visualisasi yang tersedia di dashboard, diisi data aktual angkatan terakhir."
        />
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Belum ada data akademik. Visualisasi akan tampil setelah data angkatan diisi.
        </div>
      </div>
    );
  }

  const angkatan = angkatanList[0];
  const siswaIds = siswaIdsInAngkatan(db, angkatan.id);
  const mapels = db.mata_pelajaran;
  const semester = JUMLAH_SEMESTER;

  const gender = getGenderDistribution(db, siswaIds);
  const kehadiran = getKehadiranPerSemester(db, siswaIds);
  const tren = getTrenNilai(db, siswaIds, mapels.map((m) => m.id));
  const rekap = getRekapNilaiPerSemester(db, siswaIds, semester);
  const peringkat = getPeringkatMapel(db, siswaIds, semester);

  return (
    <div>
      <PageHeader
        title="Contoh / Pratinjau"
        description="Galeri jenis visualisasi yang tersedia di dashboard, diisi data aktual angkatan terakhir."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Distribusi Gender (Donut)">
          <GenderDonut data={gender} />
        </ChartCard>
        <ChartCard title="Kehadiran per Semester (Bar Kelompok)" className="lg:col-span-2">
          <KehadiranBar data={kehadiran} />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4">
        <ChartCard title="Tren Nilai per Mapel (Line)">
          <TrenLine data={tren} mapels={mapels} />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Rekap Nilai per Mapel (Bar Vertikal)">
          <RekapBar data={rekap} />
        </ChartCard>
        <ChartCard title="Peringkat Mapel (Bar Horizontal)">
          <PeringkatBar data={peringkat} />
        </ChartCard>
      </div>
    </div>
  );
}
