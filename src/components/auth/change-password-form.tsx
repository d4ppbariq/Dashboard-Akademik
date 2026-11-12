"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PASSWORD_MIN, PASSWORD_MAX } from "@/lib/auth/password-policy";
import type { ChangePasswordResult } from "@/lib/auth/change-password";

export function ChangePasswordForm({ action }: {
  action: (form: FormData) => Promise<ChangePasswordResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [revision, setRevision] = useState(0);
  const [state, submit, pending] = useActionState<ChangePasswordResult, FormData>(
    async (_previous, data) => {
      try {
        const result = await action(data);
        if (result.success) {
          formRef.current?.reset();
          // Remount password inputs to also reset visibility after success.
          setRevision((value) => value + 1);
        }
        return result;
      } catch {
        return { error: "Password belum dapat disimpan. Silakan coba lagi." };
      }
    },
    {},
  );

  return (
    <form ref={formRef} action={submit} className="space-y-5" aria-busy={pending}>
      <fieldset key={revision} disabled={pending} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current_password">Password saat ini</Label>
          <PasswordInput id="current_password" name="current_password" autoComplete="current-password" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password baru</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} aria-describedby="password-policy" required />
          <p id="password-policy" className="text-xs text-muted-foreground">
            Gunakan {PASSWORD_MIN}–{PASSWORD_MAX} karakter dan password yang berbeda dari password saat ini.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password_confirm">Konfirmasi password baru</Label>
          <PasswordInput id="password_confirm" name="password_confirm" autoComplete="new-password" minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} required />
        </div>
      </fieldset>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-primary">Password berhasil diganti. Gunakan password baru saat login berikutnya.</p>}
      <p className="text-sm text-muted-foreground">
        Anda tetap masuk. Mengganti password tidak otomatis mengakhiri sesi di perangkat lain.
      </p>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Menyimpan..." : "Simpan password baru"}
      </Button>
    </form>
  );
}
