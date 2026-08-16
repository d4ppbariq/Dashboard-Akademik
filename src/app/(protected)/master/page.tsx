import { requireRoute, requireAuth } from "@/lib/auth/dal";
import { getDb } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AngkatanForm,
  KelasForm,
  MapelForm,
  DeleteButton,
} from "@/components/master/master-forms";
import { deleteAngkatan, deleteKelas, deleteMapel } from "@/lib/master/actions";

interface MasterPageProps {
  searchParams: Promise<{ angkatan?: string }>;
}

export default async function MasterPage({ searchParams }: MasterPageProps) {
  await requireRoute("/master");
  const user = await requireAuth();
  const { angkatan: angkatanParam } = await searchParams;

  const db = await getDb();
  const angkatanList = [...db.angkatan].sort((a, b) => b.tahun_lulus - a.tahun_lulus);
  const angkatanId =
    angkatanList.find((a) => a.id === angkatanParam)?.id ?? angkatanList[0]?.id;

  const kelasList = db.kelas
    .filter((k) => k.angkatan_id === angkatanId)
    .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas));

  return (
    <div>
      <PageHeader
        title="Master Data"
        description="Kelola angkatan, kelas, dan mata pelajaran."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Angkatan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AngkatanForm />
            <ul className="space-y-2">
              {angkatanList.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="font-medium">
                    Angkatan {a.tahun_lulus}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {db.kelas.filter((k) => k.angkatan_id === a.id).length} kelas
                    </span>
                  </span>
                  <DeleteButton
                    id={a.id}
                    action={deleteAngkatan}
                    label={`hapus angkatan ${a.tahun_lulus}`}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              Kelas · Angkatan{" "}
              {angkatanList.find((a) => a.id === angkatanId)?.tahun_lulus ?? "-"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <KelasForm angkatanId={angkatanId ?? ""} />
            <div className="flex flex-wrap gap-2">
              {kelasList.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center gap-2 rounded-full border py-1 pl-3 pr-1"
                >
                  <Badge variant="secondary">Kelas {k.nama_kelas}</Badge>
                  <DeleteButton
                    id={k.id}
                    action={deleteKelas}
                    label={`hapus kelas ${k.nama_kelas}`}
                  />
                </div>
              ))}
              {kelasList.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Pilih angkatan untuk melihat daftar kelasnya.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Mata Pelajaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MapelForm />
            <ul className="grid gap-2 sm:grid-cols-2">
              {db.mata_pelajaran.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {m.kode}
                    </Badge>
                    <span className="text-sm font-medium">{m.nama_mapel}</span>
                  </div>
                  <DeleteButton
                    id={m.id}
                    action={deleteMapel}
                    label={`hapus mapel ${m.nama_mapel}`}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {user.id !== "u-1" && (
        <p className="mt-4 text-xs text-muted-foreground">
          Perubahan hanya dapat dilakukan oleh akun dengan izin {`master.write`}.
        </p>
      )}
    </div>
  );
}
