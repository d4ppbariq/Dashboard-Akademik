import { redirect } from "next/navigation";
import { requireRoute } from "@/lib/auth/dal";
import { canChangeOwnPassword } from "@/lib/auth/change-password";
import { changePassword } from "@/lib/auth/change-password-action";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const user = await requireRoute("/ganti-password");
  const db = await getDb();
  if (!canChangeOwnPassword(db, user.id)) redirect("/dashboard");

  return (
    <div>
      <PageHeader title="Ganti Password" description="Perbarui password akun superadmin Anda sendiri." />
      <Card className="max-w-xl">
        <CardContent className="p-4 sm:p-6">
          <ChangePasswordForm action={changePassword} />
        </CardContent>
      </Card>
    </div>
  );
}
