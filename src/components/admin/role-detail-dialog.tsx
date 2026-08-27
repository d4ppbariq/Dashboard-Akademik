"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  setRolePermission,
  setRoleMenu,
  setRoleRoute,
} from "@/lib/admin/actions";

interface RoleDetailDialogProps {
  roleId: string;
  roleName: string;
  permissions: { id: string; kode_permission: string; deskripsi: string; assigned: boolean }[];
  menus: { id: string; nama_menu: string; path: string; assigned: boolean }[];
  routes: { id: string; path: string; method: string; deskripsi: string; assigned: boolean }[];
}

export function RoleDetailDialog({
  roleId,
  roleName,
  permissions,
  menus,
  routes,
}: RoleDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async (
    fn: (roleId: string, id: string, assigned: boolean) => Promise<{ error?: string }>,
    id: string,
    nextAssigned: boolean
  ) => {
    setBusy(true);
    const res = await fn(roleId, id, nextAssigned);
    setBusy(false);
    if (res?.error) alert(res.error);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Atur role">
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Role: {roleName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="permissions">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="permissions">
              Permission ({permissions.filter((p) => p.assigned).length}/{permissions.length})
            </TabsTrigger>
            <TabsTrigger value="menus">
              Menu ({menus.filter((m) => m.assigned).length}/{menus.length})
            </TabsTrigger>
            <TabsTrigger value="routes">
              Rute ({routes.filter((r) => r.assigned).length}/{routes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-1">
            {permissions.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold">{p.kode_permission}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.deskripsi}</p>
                </div>
                <Switch
                  checked={p.assigned}
                  disabled={busy}
                  onCheckedChange={(v) => void toggle(setRolePermission, p.id, v)}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="menus" className="space-y-1">
            {menus.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.nama_menu}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{m.path}</p>
                </div>
                <Switch
                  checked={m.assigned}
                  disabled={busy}
                  onCheckedChange={(v) => void toggle(setRoleMenu, m.id, v)}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="routes" className="space-y-1">
            {routes.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {r.method}
                    </Badge>
                    <p className="font-mono text-xs font-semibold">{r.path}</p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{r.deskripsi}</p>
                </div>
                <Switch
                  checked={r.assigned}
                  disabled={busy}
                  onCheckedChange={(v) => void toggle(setRoleRoute, r.id, v)}
                />
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
