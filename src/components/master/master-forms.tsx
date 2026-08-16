"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAngkatan, addKelas, addMapel } from "@/lib/master/actions";

function ErrorMsg({ error }: { error: string | undefined }) {
  if (!error) return null;
  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {error}
    </p>
  );
}

type FormState = { error?: string } | undefined;

export function AngkatanForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => await addAngkatan(formData),
    undefined
  );

  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="tahun">Tahun lulus</Label>
        <Input
          id="tahun"
          name="tahun_lulus"
          type="number"
          min={2000}
          max={2100}
          placeholder="cth: 2027"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah Angkatan"}
      </Button>
      <ErrorMsg error={state?.error} />
    </form>
  );
}

interface KelasFormProps {
  angkatanId: string;
}

export function KelasForm({ angkatanId }: KelasFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      formData.set("angkatan_id", angkatanId);
      return await addKelas(formData);
    },
    undefined
  );

  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="namaKelas">Nama kelas</Label>
        <Input
          id="namaKelas"
          name="nama_kelas"
          maxLength={1}
          placeholder="cth: A"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah Kelas"}
      </Button>
      <ErrorMsg error={state?.error} />
    </form>
  );
}

export function MapelForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => await addMapel(formData),
    undefined
  );

  return (
    <form action={action} className="flex items-end gap-2">
      <div className="w-28 space-y-1.5">
        <Label htmlFor="kode">Kode</Label>
        <Input id="kode" name="kode" placeholder="cth: MTK" maxLength={5} required />
      </div>
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="namaMapel">Nama mapel</Label>
        <Input
          id="namaMapel"
          name="nama_mapel"
          placeholder="cth: Matematika"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah Mapel"}
      </Button>
      <ErrorMsg error={state?.error} />
    </form>
  );
}

export function DeleteButton({
  id,
  action,
  label,
}: {
  id: string;
  action: (id: string) => Promise<{ error?: string }>;
  label: string;
}) {
  return (
    <form
      action={async () => {
        const res = await action(id);
        if (res?.error) alert(res.error);
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title={label}
        onClick={(e) => {
          if (!confirm(`Yakin ingin ${label}?`)) e.preventDefault();
        }}
        type="submit"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}
