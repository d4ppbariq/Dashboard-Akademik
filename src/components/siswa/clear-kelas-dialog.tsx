"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { clearKelas } from "@/lib/siswa/actions";

interface ClearKelasDialogProps {
  kelasId: string;
  kelasNama: string;
  jumlahSiswa: number;
  onDone?: () => void;
}

export function ClearKelasDialog({
  kelasId,
  kelasNama,
  jumlahSiswa,
  onDone,
}: ClearKelasDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirm === "KOSONGKAN" && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    const res = await clearKelas(kelasId);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setOpen(false);
      setConfirm("");
      onDone?.();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setConfirm("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="size-4" />
          Kosongkan Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Kosongkan Kelas {kelasNama}?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p>
                Semua <strong>{jumlahSiswa} siswa</strong> beserta data nilai dan kehadiran
                di kelas ini akan <strong>dihapus permanen</strong>.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-clear">
                  Ketik <span className="font-mono font-semibold">KOSONGKAN</span> untuk
                  melanjutkan:
                </Label>
                <Input
                  id="confirm-clear"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="KOSONGKAN"
                  autoFocus
                />
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {loading ? "Menghapus..." : "Kosongkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
