import { requireRoute, requireAuth } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ChartCard } from "@/components/charts/chart-card";
import { GenderDonut } from "@/components/charts/gender-donut";
import { KehadiranBar } from "@/components/charts/kehadiran-bar";
import { TrenLine } from "@/components/charts/tren-line";
import { RekapBar } from "@/components/charts/rekap-bar";
import { PeringkatBar } from "@/components/charts/peringkat-bar";
import {
  getRingkasan,
  getGenderDistribution,
  getKehadiranPerSemester,
  getTrenNilai,
  getRekapNilaiPerSemester,
  getPeringkatMapel,
  siswaIdsInAngkatan,
} from "@/server/service/statistics";
import { JUMLAH_SEMESTER } from "@/lib/db/seed";

interface DashboardPageProps {
  searchParams: Promise<{ angkatan?: string; semester?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireRoute("/dashboard");
  const user = await requireAuth();
  const { angkatan: angkatanParam, semester: semesterParam } = await searchParams;

  const db = await getDb();
  const angkatanList = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);

  const angkatanId =
    angkatanList.find((a) => a.id === angkatanParam)?.id ?? angkatanList[0].id;
  const angkatan = angkatanList.find((a) => a.id === angkatanId)!;

  const semester = clamp(Number(semesterParam ?? JUMLAH_SEMESTER), 1, JUMLAH_SEMESTER);

  const siswaIds = siswaIdsInAngkatan(db, angkatanId);
  const ringkasan = getRingkasan(db, siswaIds);
  const gender = getGenderDistribution(db, siswaIds);
  const kehadiran = getKehadiranPerSemester(db, siswaIds);
  const mapels = db.mata_pelajaran;
  const tren = getTrenNilai(db, siswaIds, mapels.map((m) => m.id));
  const rekap = getRekapNilaiPerSemester(db, siswaIds, semester);
  const peringkat = getPeringkatMapel(db, siswaIds, semester);

  const semesterOptions = Array.from({ length: JUMLAH_SEMESTER }, (_, i) => ({
    value: String(i + 1),
    label: `Sem ${i + 1}`,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard Akademik"
        description={`Selamat datang, ${user.nama}. Pantau performa akademik per angkatan.`}
        actions={
          <SegmentedNav
            param="angkatan"
            basePath="/dashboard"
            options={angkatanList.map((a) => ({
              value: a.id,
              label: `Angkatan ${a.tahun_lulus}`,
            }))}
          />
        }
      />

      <StatCards
        totalSiswa={ringkasan.totalSiswa}
        totalSakit={ringkasan.totalSakit}
        totalIzin={ringkasan.totalIzin}
        totalAlpa={ringkasan.totalAlpa}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Komposisi Gender" description={`Angkatan ${angkatan.tahun_lulus}`}>
          <GenderDonut data={gender} />
        </ChartCard>

        <ChartCard
          title="Rekap Nilai per Mapel"
          description={`Rata-rata nilai angkatan ${angkatan.tahun_lulus} pada ${semesterOptions.find((s) => s.value === String(semester))?.label}`}
          className="lg:col-span-2"
          action={
            <SegmentedNav param="semester" basePath="/dashboard" options={semesterOptions} />
          }
        >
          <RekapBar data={rekap} />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4">
        <ChartCard
          title="Kehadiran per Semester"
          description={`Total sakit, izin, dan alpa seluruh siswa angkatan ${angkatan.tahun_lulus}`}
        >
          <KehadiranBar data={kehadiran} />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4">
        <ChartCard
          title="Tren Nilai per Mapel"
          description={`Rata-rata nilai angkatan ${angkatan.tahun_lulus} per semester`}
        >
          <TrenLine data={tren} mapels={mapels} />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4">
        <ChartCard
          title="Peringkat Nilai per Mapel"
          description={`Tertinggi hingga terendah pada ${semesterOptions.find((s) => s.value === String(semester))?.label}`}
        >
          <PeringkatBar data={peringkat} />
        </ChartCard>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}
