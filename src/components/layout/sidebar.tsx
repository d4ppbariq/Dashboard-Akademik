"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  TrendingUp,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth/actions";
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
  TrendingUp,
};

interface SidebarProps {
  menus: Menu[];
  userNama: string;
  roleName: string;
}

export function Sidebar({ menus, userNama, roleName }: SidebarProps) {
  const pathname = usePathname();
  const groups = new Map<string, Menu[]>();
  for (const menu of menus) {
    const arr = groups.get(menu.grup) ?? [];
    arr.push(menu);
    groups.set(menu.grup, arr);
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <Image
          src="/logo.jpg"
          alt="Logo SMPN 1 Cibalong"
          width={36}
          height={36}
          className="size-9 rounded-lg object-contain ring-1 ring-border"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">SINAR</p>
          <p className="text-xs text-muted-foreground">SMPN 1 CIBALONG</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {Array.from(groups.entries()).map(([grup, items]) => (
          <div key={grup} className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {grup}
            </p>
            <ul className="space-y-1">
              {items.map((menu) => {
                const Icon = ICONS[menu.icon] ?? LayoutDashboard;
                const active =
                  pathname === menu.path ||
                  (menu.path !== "/dashboard" &&
                    pathname.startsWith(`${menu.path}/`));
                return (
                  <li key={menu.id}>
                    <Link
                      href={menu.path}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={2} />
                      <span className="truncate">{menu.nama_menu}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
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
            <button
              type="submit"
              title="Keluar"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
