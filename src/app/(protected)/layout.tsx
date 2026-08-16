import { getMenusForRole, requireAuth } from "@/lib/auth/dal";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const menus = await getMenusForRole(user.role_id);

  return (
    <div className="min-h-dvh">
      <Sidebar
        menus={menus}
        userNama={user.nama}
        roleName={roleNameFromId(user.role_id)}
      />
      <Topbar
        menus={menus}
        userNama={user.nama}
        roleName={roleNameFromId(user.role_id)}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function roleNameFromId(roleId: string): string {
  switch (roleId) {
    case "role-superadmin":
      return "Superadmin";
    case "role-operator":
      return "Operator";
    case "role-guru":
      return "Guru";
    default:
      return "User";
  }
}
