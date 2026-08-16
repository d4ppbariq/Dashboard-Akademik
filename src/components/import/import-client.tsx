"use client";

import { useRef, useState } from "react";
import * as XLSX from "@e965/xlsx";
import { Download, UploadCloud, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  applyImport,
  validateImport,
  type ImportKind,
  type ImportResult,
  type ImportRow,
} from "@/lib/import/actions";

const KINDS: { value: ImportKind; label: string; hint: string }[] = [
  {
    value: "siswa",
    label: "Data Siswa",
    hint: "NIS, NAMA, JENIS_KELAMIN, ANGKATAN_ID, KELAS",
  },
  {
    value: "nilai",
    label: "Nilai",
    hint: "NIS, KODE_MAPEL, SEMESTER, NILAI",
  },
  {
    value: "kehadiran",
    label: "Kehadiran",
    hint: "NIS, SEMESTER, SAKIT, IZIN, ALPA",
  },
];

const LABELS: Record<ImportKind, string> = {
  siswa: "Siswa",
  nilai: "Nilai",
  kehadiran: "Kehadiran",
};

export function ImportClient() {
  const [kind, setKind] = useState<ImportKind>("siswa");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [applied, setApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setResult(null);
    setApplied(false);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const first = wb.SheetNames[0];
      const sheet = wb.Sheets[first];
      const parsed = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });
      setRows(parsed);
      const res = await validateImport(kind, parsed);
      setResult(res);
    } catch (e) {
      setResult({
        ok: false,
        diterima: 0,
        ditolak: 1,
        errors: [{ baris: 1, pesan: e instanceof Error ? e.message : "Gagal membaca file" }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!rows) return;
    setLoading(true);
    const res = await applyImport(kind, rows);
    setResult(res);
    setApplied(res.ok && res.ditolak === 0);
    setLoading(false);
  };

  const previewRows = (result?.errors ?? []).length > 0 ? rows?.slice(0, 5) ?? [] : rows?.slice(0, 10) ?? [];

  return (
    <div className="space-y-4">
      <Tabs value={kind} onValueChange={(v) => {
        setKind(v as ImportKind);
        setRows(null);
        setResult(null);
        setApplied(false);
        setFileName(null);
        if (fileRef.current) fileRef.current.value = "";
      }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            {KINDS.map((k) => (
              <TabsTrigger key={k.value} value={k.value}>
                {k.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/import/template?kind=${kind}`}>
              <Download className="size-4" />
              Unduh Template
            </a>
          </Button>
        </div>

        {KINDS.map((k) => (
          <TabsContent key={k.value} value={k.value} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Format file <span className="font-mono">.xlsx</span> atau{" "}
              <span className="font-mono">.csv</span>. Kolom yang dibutuhkan:{" "}
              <span className="font-mono">{k.hint}</span>.
            </p>

            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 p-8">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="file-import"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                <Button asChild variant={fileName ? "outline" : "default"}>
                  <label htmlFor="file-import" className="cursor-pointer">
                    <UploadCloud className="size-4" />
                    {fileName ?? `Pilih file ${k.label}`}
                  </label>
                </Button>
                {fileName && (
                  <p className="text-xs text-muted-foreground">
                    {fileName} · {rows?.length ?? 0} baris terdeteksi
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {loading && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      )}

      {!loading && result && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {result.ok ? (
                  <CheckCircle2 className="size-6 text-emerald-500" />
                ) : (
                  <AlertTriangle className="size-6 text-amber-500" />
                )}
                <div>
                  <p className="font-semibold">
                    {result.ok
                      ? "File valid"
                      : `${result.ditolak} baris bermasalah`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.diterima} siap diproses · {result.ditolak} ditolak
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setRows(null);
                  setResult(null);
                  setFileName(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}>
                  Ulangi
                </Button>
                {result.diterima > 0 && !applied && (
                  <Button size="sm" onClick={() => void handleApply()} disabled={loading}>
                    Proses {result.diterima} Baris
                  </Button>
                )}
                {applied && (
                  <Badge className="bg-emerald-500">
                    Data {LABELS[kind]} berhasil diproses
                  </Badge>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="p-2 font-medium">Baris</th>
                      <th className="p-2 font-medium">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 100).map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2 tabular-nums">{e.baris}</td>
                        <td className="p-2 text-destructive">{e.pesan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      {Object.keys(previewRows[0]).map((h) => (
                        <th key={h} className="p-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {Object.values(r).map((v, j) => (
                          <td key={j} className="p-2">
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
