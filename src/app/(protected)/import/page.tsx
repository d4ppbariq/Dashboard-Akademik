import { requireRoute } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import { ImportClient } from "@/components/import/import-client";

export default async function ImportPage() {
  await requireRoute("/import");

  return (
    <div>
      <PageHeader
        title="Import Data Excel"
        description="Unggah file Excel untuk siswa, nilai, atau kehadiran. Data divalidasi sebelum diproses."
      />
      <ImportClient />
    </div>
  );
}
