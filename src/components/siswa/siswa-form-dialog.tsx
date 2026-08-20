"use client";

import { useActionState, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addSiswa, updateSiswa } from "@/lib/siswa/actions";

type FormState = { error?: string } | undefined;

interface SiswaData {
  id: string;
  nis: string;
  nama: string;
  jenis_kelamin: string;
}

interface SiswaFormDialogProps {
  kelasId: string;
  siswa?: SiswaData;
  onDone?: () => void;
}

function ErrorMsg({ error }: { error: string | undefined }) {
  if (!error) return null;
  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {error}
    </p>
  );
}

export function SiswaFormDialog({ kelasId, siswa, onDone }: SiswaFormDialogProps) {
  const isEdit = !!siswa;
  const [open, setOpen] = useState(false);
  const [jk, setJk] = useState("L");

  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      formData.set("kelas_id", kelasId);
      formData.set("jenis_kelamin", jk);
      let result: { error?: string };
      if (isEdit) {
        formData.set("id", siswa.id);
        result = await updateSiswa(formData);
      } else {
        result = await addSiswa(formData);
      }
      if (!result?.error) {
        setOpen(false);
        onDone?.();
      }
      return result;
    },
    undefined
  );

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setJk(siswa?.jenis_kelamin ?? "L");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" title="Edit siswa">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Tambah Siswa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Siswa" : "Tambah Siswa Baru"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ubah data siswa di bawah ini."
              : "Isi data siswa baru untuk kelas ini."}
          </DialogDescription>
        </DialogHeader>
        <form id="siswa-form" action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nis">NIS</Label>
            <Input
              id="nis"
              name="nis"
              defaultValue={siswa?.nis ?? ""}
              placeholder="cth: 2610001"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nama">Nama Lengkap</Label>
            <Input
              id="nama"
              name="nama"
              defaultValue={siswa?.nama ?? ""}
              placeholder="cth: Ahmad Fauzi"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Jenis Kelamin</Label>
            <Select value={jk} onValueChange={setJk}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Laki-laki</SelectItem>
                <SelectItem value="P">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ErrorMsg error={state?.error} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="siswa-form" disabled={pending}>
            {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Siswa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
