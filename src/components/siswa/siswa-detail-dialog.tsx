"use client";

import { useCallback, useState } from "react";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KehadiranBar } from "@/components/charts/kehadiran-bar";
import { RekapBar } from "@/components/charts/rekap-bar";
import { formatNumber } from "@/lib/format";

interface SiswaDetail {
  siswa: {
    id: string;
    nis: string;
    nama: string;
    jenis_kelamin: string;
    status_aktif: string;
  };
  kelas?: { id: string; nama_kelas: string };
  angkatan?: { id: string; tahun_lulus: number };
  mapels: { id: string; kode: string; nama_mapel: string }[];
  ringkasan: { totalSiswa: number; totalSakit: number; totalIzin: number; totalAlpa: number };
  kehadiran: { semester: string; Sakit: number; Izin: number; Alpa: number }[];
  rekapPerSemester: { kode: string; mapel: string; nilai: number }[][];
  peringkatPerSemester: { kode: string; mapel: string; nilai: number }[][];
}

interface SiswaDetailDialogProps {
  siswaId: string;
}

export function SiswaDetailDialog({ siswaId }: SiswaDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SiswaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semester, setSemester] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/siswa/${siswaId}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal memuat data siswa");
      }
      setData((await res.json()) as SiswaDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data siswa");
    } finally {
      setLoading(false);
    }
  }, [siswaId]);

  const smt = Math.min(Number(semester), data?.rekapPerSemester.length ?? 1);
  const rekap = data?.rekapPerSemester[smt - 1] ?? [];
  const peringkat = data?.peringkatPerSemester[smt - 1] ?? [];

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) void load();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Lihat detail">
          <Eye className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {loading && !data ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-destructive">{error}</p>
        ) : data ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {data.siswa.nama
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div className="min-w-0">
                  <p className="truncate">{data.siswa.nama}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    NIS {data.siswa.nis} · Kelas {data.kelas?.nama_kelas} ·{" "}
                    Angkatan {data.angkatan?.tahun_lulus} ·{" "}
                    {data.siswa.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-2">
              {[
                ["Sakit", data.ringkasan.totalSakit, "text-amber-600"],
                ["Izin", data.ringkasan.totalIzin, "text-blue-600"],
                ["Alpa", data.ringkasan.totalAlpa, "text-red-600"],
              ].map(([label, value, cls]) => (
                <div key={String(label)} className="rounded-md border p-3 text-center">
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {formatNumber(Number(value))}
                  </p>
                  <p className={`text-xs ${String(cls)}`}>{label}</p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="nilai">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="nilai">Nilai</TabsTrigger>
                <TabsTrigger value="kehadiran">Kehadiran</TabsTrigger>
              </TabsList>

              <TabsContent value="nilai" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Pilih semester</p>
                  <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
                    {data.rekapPerSemester.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSemester(String(i + 1))}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          smt === i + 1
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Sem {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <RekapBar data={rekap} height={220} />
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="p-2 font-medium">Peringkat</th>
                        <th className="p-2 font-medium">Mata Pelajaran</th>
                        <th className="p-2 text-right font-medium">Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peringkat.map((r, i) => (
                        <tr key={r.kode} className="border-b last:border-0">
                          <td className="p-2">
                            <Badge variant={i === 0 ? "default" : "outline"} className="w-8 justify-center">
                              {i + 1}
                            </Badge>
                          </td>
                          <td className="p-2">{r.mapel}</td>
                          <td className="p-2 text-right font-semibold tabular-nums">
                            {r.nilai}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="kehadiran" className="space-y-4">
                <KehadiranBar data={data.kehadiran} height={220} />
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="p-2 font-medium">Semester</th>
                        <th className="p-2 text-right font-medium">Sakit</th>
                        <th className="p-2 text-right font-medium">Izin</th>
                        <th className="p-2 text-right font-medium">Alpa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.kehadiran.map((k) => (
                        <tr key={k.semester} className="border-b last:border-0">
                          <td className="p-2">{k.semester}</td>
                          <td className="p-2 text-right tabular-nums">{k.Sakit}</td>
                          <td className="p-2 text-right tabular-nums">{k.Izin}</td>
                          <td className="p-2 text-right tabular-nums">{k.Alpa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
