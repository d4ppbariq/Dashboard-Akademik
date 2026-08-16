import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import {
  getRingkasan,
  siswaIdsInKelas,
} from "@/server/service/statistics";

interface KelasPageProps {
  searchParams: Promise<{ angkatan?: string }>;
}

export default async function KelasPage({ searchParams }: KelasPageProps) {
  await requireRoute("/kelas");
  const { angkatan: angkatanParam } = await searchParams;

  const db = await getDb();
  const angkatanList = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);
  const angkatanId =
    angkatanList.find((a) => a.id === angkatanParam)?.id ?? angkatanList[0].id;
  const angkatan = angkatanList.find((a) => a.id === angkatanId)!;

  const kelasList = db.kelas
    .filter((k) => k.angkatan_id === angkatanId)
    .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));

  return (
    <div>
      <PageHeader
        title="Kelas"
        description={`Pilih kelas pada angkatan ${angkatan.tahun_lulus} untuk melihat detail siswanya.`}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kelasList.map((kelas) => {
          const siswaIds = siswaIdsInKelas(db, kelas.id);
          const ringkasan = getRingkasan(db, siswaIds);
          const kelasSiswa = db.siswa.filter((s) => s.kelas_id === kelas.id);
          const l = kelasSiswa.filter((s) => s.jenis_kelamin === "L").length;
          const p = kelasSiswa.length - l;

          return (
            <Link key={kelas.id} href={`/siswa?kelas=${kelas.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="size-4 text-muted-foreground" />
                    Kelas {kelas.nama_kelas}
                  </CardTitle>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Siswa</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatNumber(ringkasan.totalSiswa)}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          L {l} · P {p}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Sakit</dt>
                      <dd className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                        {formatNumber(ringkasan.totalSakit)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Izin</dt>
                      <dd className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                        {formatNumber(ringkasan.totalIzin)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Alpa</dt>
                      <dd className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                        {formatNumber(ringkasan.totalAlpa)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
