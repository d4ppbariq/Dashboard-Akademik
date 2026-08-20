"use client";

import { useTransition, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addNilai, updateNilai } from "@/lib/siswa/academic-actions";

interface MapelOption {
  id: string;
  kode: string;
  nama_mapel: string;
}

interface NilaiData {
  id?: string;
  mata_pelajaran_id: string;
  semester: number;
  nilai: number;
}

interface NilaiFormDialogProps {
  siswaId: string;
  mapels: MapelOption[];
  semesterList: number[];
  data?: NilaiData;
  onDone?: () => void;
}

export function NilaiFormDialog({
  siswaId,
  mapels,
  semesterList,
  data,
  onDone,
}: NilaiFormDialogProps) {
  const isEdit = !!data?.id;
  const [open, setOpen] = useState(false);
  const [mapelId, setMapelId] = useState(data?.mata_pelajaran_id ?? mapels[0]?.id ?? "");
  const [semester, setSemester] = useState(String(data?.semester ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("siswa_id", siswaId);
    formData.set("mata_pelajaran_id", mapelId);
    formData.set("semester", semester);
    if (isEdit && data?.id) formData.set("id", data.id);

    startTransition(async () => {
      const result = isEdit ? await updateNilai(formData) : await addNilai(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setOpen(false);
        onDone?.();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setError(null);
        if (v) {
          setMapelId(data?.mata_pelajaran_id ?? mapels[0]?.id ?? "");
          setSemester(String(data?.semester ?? 1));
        }
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" title="Edit nilai">
            <Pencil className="size-3" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="size-3" />
            Tambah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Nilai" : "Tambah Nilai"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Ubah nilai siswa." : "Tambah nilai baru untuk siswa ini."}
          </DialogDescription>
        </DialogHeader>
        <form id="nilai-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Mata Pelajaran</Label>
            <select
              value={mapelId}
              onChange={(e) => setMapelId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              disabled={isEdit}
            >
              {mapels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.kode} — {m.nama_mapel}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Semester</Label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              disabled={isEdit}
            >
              {semesterList.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nilai">Nilai (0-100)</Label>
            <Input
              id="nilai"
              name="nilai"
              type="number"
              min={0}
              max={100}
              defaultValue={data?.nilai ?? ""}
              placeholder="cth: 85"
              required
            />
          </div>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="nilai-form" disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
