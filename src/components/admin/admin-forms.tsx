"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPermission,
  createMenu,
  createRoute,
  deletePermission,
  deleteMenu,
  deleteRoute,
} from "@/lib/admin/actions";

type FormState = { error?: string } | undefined;

function ErrorLine({ error }: { error: string | undefined }) {
  if (!error) return null;
  return <p className="text-sm text-destructive">{error}</p>;
}

export function PermissionForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => await createPermission(formData),
    undefined
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="kode">Kode permission</Label>
        <Input id="kode" name="kode_permission" placeholder="cth: nilai.write" required />
      </div>
      <div className="min-w-56 flex-1 space-y-1.5">
        <Label htmlFor="deskripsi">Deskripsi</Label>
        <Input id="deskripsi" name="deskripsi" placeholder="Deskripsi permission" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah"}
      </Button>
      <ErrorLine error={state?.error} />
    </form>
  );
}

export function MenuForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => await createMenu(formData),
    undefined
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="namaMenu">Nama menu</Label>
        <Input id="namaMenu" name="nama_menu" placeholder="cth: Laporan" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="path">Path</Label>
        <Input id="path" name="path" placeholder="cth: /laporan" required />
      </div>
      <div className="w-36 space-y-1.5">
        <Label htmlFor="icon">Ikon (lucide)</Label>
        <Input id="icon" name="icon" placeholder="cth: LayoutDashboard" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="urutan">Urutan</Label>
        <Input id="urutan" name="urutan" type="number" min={1} defaultValue={99} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="grup">Grup</Label>
        <Input id="grup" name="grup" placeholder="Analitik / Data / Sistem" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah"}
      </Button>
      <ErrorLine error={state?.error} />
    </form>
  );
}

export function RouteForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => await createRoute(formData),
    undefined
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="w-28 space-y-1.5">
        <Label>Method</Label>
        <Select name="method" required defaultValue="GET">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["GET", "POST", "PUT", "DELETE"].map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="path">Path</Label>
        <Input id="path" name="path" placeholder="cth: /api/laporan" required />
      </div>
      <div className="min-w-56 flex-1 space-y-1.5">
        <Label htmlFor="deskripsi">Deskripsi</Label>
        <Input id="deskripsi" name="deskripsi" placeholder="Deskripsi rute" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Tambah"}
      </Button>
      <ErrorLine error={state?.error} />
    </form>
  );
}

export function EntityDeleteButton({
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
        if (!confirm(`Yakin ingin menghapus ${label}?`)) return;
        const res = await action(id);
        if (res?.error) alert(res.error);
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title={`Hapus ${label}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

export { deletePermission, deleteMenu, deleteRoute };
