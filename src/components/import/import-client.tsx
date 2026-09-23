"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "@e965/xlsx";
import { Download, UploadCloud, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyImportFlat,
  validateImportFlat,
  type ImportResult,
  type ImportRow,
} from "@/lib/import/actions";
import { getImportMeta } from "@/lib/master/actions";

interface ImportMeta {
  angkatan: {
    id: string;
    tahunLulus: number;
    kelas: { id: string; nama: string }[];
  }[];
  mapel: { kode: string; nama: string }[];
}

function detectSheetRows(wb: XLSX.WorkBook): ImportRow[] {
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<ImportRow>(wb.Sheets[name], { defval: "" });
    if (rows.length > 0) return rows;
  }
  return [];
}

function sanitizeValue(v: unknown): unknown {
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return String(v);
  return v;
}

function sanitizeRows(rows: ImportRow[]): ImportRow[] {
  return rows.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, sanitizeValue(v)]))
  );
}

export function ImportClient() {
  const [meta, setMeta] = useState<ImportMeta | null>(null);
  const [angkatanId, setAngkatanId] = useState<string>("");
  const [kelasId, setKelasId] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [applied, setApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getImportMeta().then(setMeta);
  }, []);

  const selectedAngkatan = meta?.angkatan.find((a) => a.id === angkatanId);
  const kelasOptions = selectedAngkatan?.kelas ?? [];

  const resetAll = () => {
    setFileName(null);
    setRows(null);
    setResult(null);
    setApplied(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAngkatanChange = (v: string) => {
    setAngkatanId(v);
    setKelasId("");
    resetAll();
  };

  const handleKelasChange = (v: string) => {
    setKelasId(v);
    resetAll();
  };

  const handleFile = async (file: File) => {
    if (!angkatanId || !kelasId) return;
    setLoading(true);
    setResult(null);
    setApplied(false);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parsed = sanitizeRows(detectSheetRows(wb));
      setRows(parsed);
      const res = await validateImportFlat(parsed, angkatanId, kelasId);
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
    if (!rows || !angkatanId || !kelasId) return;
    setLoading(true);
    const res = await applyImportFlat(rows, angkatanId, kelasId);
    setResult(res);
    setApplied(res.ok && res.ditolak === 0);
    setLoading(false);
  };

  const previewRows = rows?.slice(0, 10) ?? [];
  const step2Enabled = angkatanId !== "" && kelasId !== "";

  if (!meta) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-3 text-sm font-semibold">1. Pilih Target Impor</h3>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Angkatan</label>
              <Select value={angkatanId} onValueChange={handleAngkatanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih angkatan" />
                </SelectTrigger>
                <SelectContent>
                  {meta.angkatan.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      Angkatan {a.tahunLulus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Kelas</label>
              <Select value={kelasId} onValueChange={handleKelasChange} disabled={!angkatanId}>
                <SelectTrigger>
                  <SelectValue placeholder={angkatanId ? "Pilih kelas" : "Pilih angkatan dulu"} />
                </SelectTrigger>
                <SelectContent>
                  {kelasOptions.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      Kelas {k.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {step2Enabled && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Format <span className="font-mono">.xlsx</span> atau <span className="font-mono">.csv</span> — satu
              sheet berisi NIS, Nama, Jenis Kelamin, Semester, Sakit, Izin, Tanpa Keterangan, lalu kolom nilai per
              mapel.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/import/template">
                <Download className="size-4" />
                Unduh Template
              </a>
            </Button>
          </div>

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
                  {fileName ?? "Pilih file impor"}
                </label>
              </Button>
              {fileName && (
                <p className="text-xs text-muted-foreground">
                  {fileName} · {rows?.length ?? 0} baris
                </p>
              )}
            </CardContent>
          </Card>

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
                        {result.ok ? "File valid" : `${result.ditolak} baris bermasalah`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {result.diterima} siap diproses · {result.ditolak} ditolak
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetAll}>
                      Ulangi
                    </Button>
                    {result.diterima > 0 && !applied && (
                      <Button size="sm" onClick={() => void handleApply()} disabled={loading}>
                        Proses {result.diterima} Baris
                      </Button>
                    )}
                    {applied && (
                      <Badge className="bg-emerald-500">Data berhasil diproses</Badge>
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
        </>
      )}
    </div>
  );
}
