"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  Menu as MenuIcon,
  type LucideIcon,
} from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserSearch,
  Eye,
  FileSpreadsheet,
  Database,
  BookOpen,
  ScrollText,
  UserCog,
  ShieldCheck,
  KeyRound,
  MenuSquare,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Menu } from "@/lib/db/types";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserSearch,
  Eye,
  FileSpreadsheet,
  Database,
  BookOpen,
  ScrollText,
  UserCog,
  ShieldCheck,
  KeyRound,
  MenuSquare,
  Waypoints,
};

interface TopbarProps {
  menus: Menu[];
  userNama: string;
  roleName: string;
}

export function Topbar({ menus, userNama, roleName }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" title="Menu">
            <MenuIcon className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="size-4" />
              </span>
              <span className="text-sm font-semibold">
                Nesaciba · SMPN 1 Cibalong
              </span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {menus.map((menu) => {
              const Icon = ICONS[menu.icon] ?? LayoutDashboard;
              const active = pathname === menu.path;
              return (
                <Link
                  key={menu.id}
                  href={menu.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent font-medium"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {menu.nama_menu}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 border-t p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {userNama
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">{userNama}</p>
              <p className="truncate text-xs text-muted-foreground">{roleName}</p>
            </div>
            <form action={logout}>
              <Button variant="ghost" size="icon" title="Keluar">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Dashboard Akademik</p>
        <p className="truncate text-xs text-muted-foreground">
          SMPN 1 Cibalong
        </p>
      </div>
    </header>
  );
}
