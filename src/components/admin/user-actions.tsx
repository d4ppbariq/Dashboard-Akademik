"use client";

import { useActionState, useState } from "react";
import { KeyRound, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import {
  createUser,
  resetUserPassword,
  toggleUserStatus,
  deleteUser,
} from "@/lib/admin/actions";

type FormState = { error?: string } | undefined;

export function UserForm({ roles }: { roles: { id: string; nama_role: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => await createUser(formData),
    undefined
  );

  return (
    <form action={action} className="grid gap-3 md:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="nama">Nama</Label>
        <Input id="nama" name="nama" placeholder="Nama lengkap" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="nama@sch.id" required />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select name="role_id" required defaultValue="role-guru">
          <SelectTrigger>
            <SelectValue placeholder="Pilih role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nama_role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password awal</Label>
        <Input id="password" name="password" type="password" placeholder="min. 4 karakter" required />
      </div>
      <div className="md:col-span-4 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Buat User"}
        </Button>
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}

function ResetPasswordDialog({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const res = await resetUserPassword(userId, formData);
      if (!res?.error) setOpen(false);
      return res;
    },
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Reset Password"
          className="text-muted-foreground hover:text-foreground"
        >
          <KeyRound className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{email}</p>
        <form action={action} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`password-${userId}`}>Password baru</Label>
            <Input
              id={`password-${userId}`}
              name="password"
              type="password"
              placeholder="min. 4 karakter"
              required
              minLength={4}
            />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Menyimpan..." : "Reset Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UserActions({
  userId,
  email,
  status,
}: {
  userId: string;
  email: string;
  status: string;
}) {
  return (
    <div className="flex justify-end gap-1">
      <ResetPasswordDialog userId={userId} email={email} />
      <form
        action={async () => {
          const res = await toggleUserStatus(userId);
          if (res?.error) alert(res.error);
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          title={status === "AKTIF" ? "Nonaktifkan" : "Aktifkan"}
          className="text-muted-foreground hover:text-foreground"
        >
          <Power className="size-4" />
        </Button>
      </form>
      <form
        action={async () => {
          if (!confirm("Yakin ingin menghapus user ini?")) return;
          const res = await deleteUser(userId);
          if (res?.error) alert(res.error);
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          title="Hapus"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </form>
    </div>
  );
}
