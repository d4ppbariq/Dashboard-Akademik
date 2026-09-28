import Link from "next/link";
import { requireRoute } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { SegmentedNav } from "@/components/layout/segmented-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiswaDetailDialog } from "@/components/siswa/siswa-detail-dialog";
import { saringSiswa } from "@/lib/siswa-search";

interface SiswaPageProps {
  searchParams: Promise<{ angkatan?: string; kelas?: string; q?: string; semua?: string }>;
}

export default async function SiswaPage({ searchParams }: SiswaPageProps) {
  await requireRoute("/siswa");
  const { angkatan: angkatanParam, kelas: kelasParam, q: qParam, semua } =
    await searchParams;

  const db = await getDb();
  const angkatanList = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);

  const angkatanId =
    angkatanList.find((a) => a.id === angkatanParam)?.id ?? angkatanList[0]?.id;
  const angkatan = angkatanList.find((a) => a.id === angkatanId);

  const kelasList = db.kelas
    .filter((k) => k.angkatan_id === angkatanId)
    .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));

  const kelasId = kelasList.find((k) => k.id === kelasParam)?.id ?? kelasList[0]?.id;
  const kelas = kelasList.find((k) => k.id === kelasId);

  // Mode global: operator tidak menemukan siswa di kelas yang sedang dibuka,
  // sehingga ia perlu mencari di seluruh sekolah sekaligus.
  const global = semua === "1";
  const q = (qParam ?? "").trim();

  // Hoist keluar dari filter: sebelumnya dihitung ulang untuk tiap siswa.
  const kelasAngkatanIds = new Set(kelasList.map((k) => k.id));
  const kelasById = new Map(db.kelas.map((k) => [k.id, k]));
  const namaKelas = new Map(db.kelas.map((k) => [k.id, k.nama_kelas]));
  const tahunAngkatan = new Map(db.angkatan.map((a) => [a.id, a.tahun_lulus]));

  const siswaList = saringSiswa(
    db.siswa
      .filter((s) => {
        if (global) return true;
        if (kelasId) return s.kelas_id === kelasId;
        return kelasAngkatanIds.has(s.kelas_id);
      })
      .sort((a, b) => a.nama.localeCompare(b.nama)),
    q
  );

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

  const kolom = global ? 7 : 6;
  const labelKonteks = global
    ? "Mencari di seluruh sekolah"
    : `Daftar siswa${kelas ? ` kelas ${kelas.nama_kelas}` : ""} · Angkatan ${
        angkatan?.tahun_lulus ?? "-"
      }`;

  return (
    <div>
      <PageHeader
        title="Pencarian Siswa"
        description={q ? `${labelKonteks} · ${siswaList.length} cocok dengan "${q}"` : labelKonteks}
        actions={
          global ? undefined : (
            <SegmentedNav
              param="angkatan"
              basePath="/siswa"
              options={angkatanList.map((a) => ({
                value: a.id,
                label: `Angkatan ${a.tahun_lulus}`,
              }))}
            />
          )
        }
      />

      {global && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Mode cari semua angkatan. Filter angkatan dan kelas diabaikan.
          </span>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/siswa?${new URLSearchParams({
                ...(angkatanId ? { angkatan: angkatanId } : {}),
                ...(kelasId ? { kelas: kelasId } : {}),
              }).toString()}`}
            >
              Kembali ke kelas terpilih
            </Link>
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {kelas && !global && (
          <SegmentedNav
            param="kelas"
            basePath="/siswa"
            options={kelasList.map((k) => ({
              value: k.id,
              label: `Kelas ${k.nama_kelas}`,
            }))}
          />
        )}

        <form action="/siswa" method="get" className="flex gap-2">
          <input type="hidden" name="angkatan" value={angkatanId ?? ""} />
          <input type="hidden" name="kelas" value={kelasId ?? ""} />
          {global && <input type="hidden" name="semua" value="1" />}
          <Input
            name="q"
            defaultValue={qParam ?? ""}
            placeholder="Cari nama atau NIS..."
            aria-label="Cari nama atau NIS"
            className="h-8 w-64"
          />
          <Button type="submit" size="sm" className="h-8">
            Cari
          </Button>
        </form>
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
                  {global && <th className="p-3 font-medium">Kelas</th>}
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
                  const angkatanSiswa = kelasById.get(s.kelas_id);
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3 tabular-nums text-muted-foreground">{s.nis}</td>
                      <td className="p-3 font-medium">{s.nama}</td>
                      <td className="p-3 text-muted-foreground">
                        {s.jenis_kelamin === "L" ? "L" : "P"}
                      </td>
                      {global && (
                        <td className="p-3 text-muted-foreground">
                          {namaKelas.get(s.kelas_id) ?? "-"}
                          {angkatanSiswa && (
                            <span className="ml-1 text-xs">
                              {tahunAngkatan.get(angkatanSiswa.angkatan_id) ?? "-"}
                            </span>
                          )}
                        </td>
                      )}
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
                    <td colSpan={kolom} className="p-6 text-center text-muted-foreground">
                      {q ? (
                        <span className="flex flex-col items-center gap-3">
                          <span>
                            {global
                              ? `Tidak ada siswa dengan nama atau NIS "${q}" di seluruh sekolah.`
                              : `Tidak ada siswa yang cocok dengan "${q}" di kelas ${kelas?.nama_kelas ?? "-"} · Angkatan ${angkatan?.tahun_lulus ?? "-"}.`}
                          </span>
                          {!global && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/siswa?q=${encodeURIComponent(q)}&semua=1`}>
                                Cari di semua angkatan
                              </Link>
                            </Button>
                          )}
                        </span>
                      ) : global ? (
                        "Belum ada siswa yang tercatat di sekolah ini."
                      ) : (
                        "Belum ada siswa di kelas ini."
                      )}
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
