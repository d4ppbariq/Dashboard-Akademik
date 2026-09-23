"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = { error?: string } | undefined;

interface EditDescriptionDialogProps {
  id: string;
  title: string;
  fieldLabel: string;
  currentValue: string;
  action: (id: string, formData: FormData) => Promise<{ error?: string }>;
}

export function EditDescriptionDialog({
  id,
  title,
  fieldLabel,
  currentValue,
  action,
}: EditDescriptionDialogProps) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState<Result, FormData>(
    async (_prev, formData) => {
      const res = await action(id, formData);
      if (res?.error) return res;
      setOpen(false);
      toast.success("Perubahan berhasil disimpan");
      return res;
    },
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title={title}>
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="deskripsi">{fieldLabel}</Label>
            <Input id="deskripsi" name="deskripsi" defaultValue={currentValue} required />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}