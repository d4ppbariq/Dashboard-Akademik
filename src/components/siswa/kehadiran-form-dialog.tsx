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
import { upsertKehadiran } from "@/lib/siswa/academic-actions";

interface KehadiranData {
  id?: string;
  semester: number;
  sakit: number;
  izin: number;
  tanpa_keterangan: number;
}

interface KehadiranFormDialogProps {
  siswaId: string;
  semesterList: number[];
  data?: KehadiranData;
  onDone?: () => void;
}

export function KehadiranFormDialog({
  siswaId,
  semesterList,
  data,
  onDone,
}: KehadiranFormDialogProps) {
  const isEdit = !!data;
  const [open, setOpen] = useState(false);
  const [semester, setSemester] = useState(String(data?.semester ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("siswa_id", siswaId);
    formData.set("semester", semester);
    if (data?.id) formData.set("id", data.id);

    startTransition(async () => {
      const result = await upsertKehadiran(formData);
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
        if (v) setSemester(String(data?.semester ?? 1));
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" title="Edit kehadiran">
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
          <DialogTitle>{isEdit ? "Edit Kehadiran" : "Tambah Kehadiran"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Ubah data kehadiran siswa." : "Tambah data kehadiran baru."}
          </DialogDescription>
        </DialogHeader>
        <form id="kehadiran-form" onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sakit">Sakit</Label>
              <Input
                id="sakit"
                name="sakit"
                type="number"
                min={0}
                defaultValue={data?.sakit ?? 0}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="izin">Izin</Label>
              <Input
                id="izin"
                name="izin"
                type="number"
                min={0}
                defaultValue={data?.izin ?? 0}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tanpa_keterangan">Alpa</Label>
              <Input
                id="tanpa_keterangan"
                name="tanpa_keterangan"
                type="number"
                min={0}
                defaultValue={data?.tanpa_keterangan ?? 0}
                required
              />
            </div>
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
          <Button type="submit" form="kehadiran-form" disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
