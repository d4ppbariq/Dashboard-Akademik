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
  mapelDenganNilai,
  siswaIdsInAngkatan,
  siswaIdsInKelas,
} from "@/server/service/statistics";
import { JUMLAH_SEMESTER } from "@/lib/db/seed";

interface DashboardPageProps {
  searchParams: Promise<{ angkatan?: string; semester?: string; kelas?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireRoute("/dashboard");
  const user = await requireAuth();
  const { angkatan: angkatanParam, semester: semesterParam, kelas: kelasParam } =
    await searchParams;

  const db = await getDb();
  const angkatanList = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);

  if (angkatanList.length === 0) {
    return (
      <div>
        <PageHeader
          title="Dashboard Akademik"
          description={`Selamat datang, ${user.nama}. Pantau performa akademik per angkatan.`}
        />
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Belum ada data akademik. Silakan buat angkatan di menu Master Data terlebih
          dahulu, lalu tambahkan data siswa.
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

  const kelasId = kelasList.find((k) => k.id === kelasParam)?.id ?? null;
  const kelas = kelasId ? kelasList.find((k) => k.id === kelasId) : null;

  const kelasOptions = [
    { value: "_all", label: "Semua Kelas" },
    ...kelasList.map((k) => ({ value: k.id, label: `Kelas ${k.nama_kelas}` })),
  ];

  const semesterOptions = Array.from({ length: JUMLAH_SEMESTER }, (_, i) => ({
    value: String(i + 1),
    label: `Sem ${i + 1}`,
  }));

  const siswaIdsAngkatan = siswaIdsInAngkatan(db, angkatanId);
  const ringkasan = getRingkasan(db, siswaIdsAngkatan);
  const gender = getGenderDistribution(db, siswaIdsAngkatan);
  const kehadiran = getKehadiranPerSemester(db, siswaIdsAngkatan);
  // Hanya mapel yang punya nilai pada angkatan ini. Tanpa penyaringan, mapel
  // kurikulum lama ikut tampil sebagai garis kosong di TrenLine.
  const trenMapels = mapelDenganNilai(db, siswaIdsAngkatan);
  const tren = getTrenNilai(db, siswaIdsAngkatan, trenMapels.map((m) => m.id));
  const rekap = getRekapNilaiPerSemester(db, siswaIdsAngkatan, semester).filter(
    (r) => r.nilai !== null
  );
  const peringkat = getPeringkatMapel(db, siswaIdsAngkatan, semester).filter(
    (r) => r.nilai !== null
  );

  const showKelasCharts = kelasId !== null;

  let kelasSiswaIds: string[] = [];
  let kelasRingkasan = { totalSiswa: 0, totalSakit: 0, totalIzin: 0, totalAlpa: 0 };
  let kelasGender: { name: string; value: number }[] = [];
  let kelasKehadiran: { semester: string; Sakit: number; Izin: number; Alpa: number }[] = [];
  let kelasTren: { semester: string; [key: string]: string | number | null }[] = [];
  let kelasRekap: { kode: string; mapel: string; nilai: number | null }[] = [];
  let kelasPeringkat: { kode: string; mapel: string; nilai: number | null }[] = [];

  if (showKelasCharts && kelasId) {
    kelasSiswaIds = siswaIdsInKelas(db, kelasId);
    kelasRingkasan = getRingkasan(db, kelasSiswaIds);
    kelasGender = getGenderDistribution(db, kelasSiswaIds);
    kelasKehadiran = getKehadiranPerSemester(db, kelasSiswaIds);
    kelasTren = getTrenNilai(db, kelasSiswaIds, trenMapels.map((m) => m.id));
    kelasRekap = getRekapNilaiPerSemester(db, kelasSiswaIds, semester).filter(
      (r) => r.nilai !== null
    );
    kelasPeringkat = getPeringkatMapel(db, kelasSiswaIds, semester).filter(
      (r) => r.nilai !== null
    );
  }

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

      <div className="mt-4">
        <SegmentedNav param="kelas" basePath="/dashboard" options={kelasOptions} />
      </div>

      {showKelasCharts && (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total Siswa", value: kelasRingkasan.totalSiswa },
            { label: "Sakit", value: kelasRingkasan.totalSakit },
            { label: "Izin", value: kelasRingkasan.totalIzin },
            { label: "Alpa", value: kelasRingkasan.totalAlpa },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {!showKelasCharts && (
        <>
          <h2 className="mt-6 text-sm font-semibold uppercase text-muted-foreground">
            Grafik Angkatan
          </h2>

          <div className="mt-3 grid gap-4 lg:grid-cols-3">
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
              <TrenLine data={tren} mapels={trenMapels} />
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
        </>
      )}

      {showKelasCharts && kelas && (
        <>
          <h2 className="mt-6 text-sm font-semibold uppercase text-muted-foreground">
            Grafik Kelas {kelas.nama_kelas}
          </h2>

          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Komposisi Gender"
              description={`Kelas ${kelas.nama_kelas} · Angkatan ${angkatan.tahun_lulus}`}
            >
              <GenderDonut data={kelasGender} />
            </ChartCard>

            <ChartCard
              title="Rekap Nilai per Mapel"
              description={`Kelas ${kelas.nama_kelas} · ${semesterOptions.find((s) => s.value === String(semester))?.label}`}
              className="lg:col-span-2"
            >
              <RekapBar data={kelasRekap} />
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4">
            <ChartCard
              title="Kehadiran per Semester"
              description={`Kelas ${kelas.nama_kelas} · Total sakit, izin, dan alpa`}
            >
              <KehadiranBar data={kelasKehadiran} />
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4">
            <ChartCard
              title="Tren Nilai per Mapel"
              description={`Kelas ${kelas.nama_kelas} · Rata-rata nilai per semester`}
            >
              <TrenLine data={kelasTren} mapels={trenMapels} />
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4">
            <ChartCard
              title="Peringkat Nilai per Mapel"
              description={`Kelas ${kelas.nama_kelas} · Tertinggi hingga terendah`}
            >
              <PeringkatBar data={kelasPeringkat} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}
