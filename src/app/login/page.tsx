"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { login, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[65fr_35fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r bg-zinc-950 p-10 text-zinc-100 lg:flex">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-6xl font-extrabold tracking-tight">SINAR</p>
            <p className="mt-3 text-sm tracking-widest text-zinc-400">
              SISTEM NILAI, ANALISIS, REKAP
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            ["6", "semester nilai"],
            ["11", "mata pelajaran"],
            ["3", "level analisis"],
          ].map(([angka, label]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold">{angka}</p>
              <p className="mt-1 text-xs text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-slate-50 px-4">
        <div className="absolute left-1/2 top-10 flex -translate-x-1/2 flex-col items-center text-center">
          <Image
            src="/logo.jpg"
            alt="Logo SMPN 1 Cibalong"
            width={80}
            height={80}
            className="size-20 rounded-2xl object-contain ring-1 ring-border"
          />
          <p className="mt-3 text-lg font-semibold tracking-wide">
            SMPN 1 CIBALONG
          </p>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-end">
            <ThemeToggle />
          </div>

          <div className="rounded-xl bg-white p-8 shadow-lg">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Masuk
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Satu jendela untuk nilai dan kehadiran siswa.
            </p>

            <form action={action} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@nesaciba.sch.id"
                  autoComplete="email"
                  required
                />
                {state?.fieldErrors?.email && (
                  <p className="text-sm text-destructive">
                    {state.fieldErrors.email[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {state?.fieldErrors?.password && (
                  <p className="text-sm text-destructive">
                    {state.fieldErrors.password[0]}
                  </p>
                )}
              </div>

              {state?.error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Memeriksa..." : "Masuk"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
