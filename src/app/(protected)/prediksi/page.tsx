import { requireRoute } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import {
  getPrediksi,
  ringkasPrediksi,
  type PrediksiBaris,
} from "@/server/service/prediksi";

function formatNilai(nilai: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(nilai);
}

function formatMae(nilai: number | null): string {
  if (nilai === null) return "—";
  return nilai.toFixed(3).replace(".", ",");
}

function labelCakupan(row: PrediksiBaris): string {
  if (row.cakupan === "RATA_RATA") return "Rata-rata 9 mapel";
  return row.nama_mapel ?? row.cakupan;
}

const JENIS_LABEL: Record<string, string> = {
  "rule-engine": "Rule engine B2",
  model: "Model ML",
};

export default async function PrediksiPage() {
  await requireRoute("/prediksi");

  const rows = await getPrediksi();
  const ringkasan = ringkasPrediksi(rows);
  const acuan =
    rows.find((row) => row.cakupan === "RATA_RATA") ?? rows[0];
  const maeModel = acuan?.mae_model ?? null;
  const maeB0 = acuan?.mae_b0 ?? null;
  const nSiswa = acuan?.n_siswa ?? null;
  const nPasangan = acuan?.n_pasangan ?? null;

  return (
    <div>
      <PageHeader
        title="Prediksi Nilai"
        description="Snapshot backtest angkatan 2026: proyeksi nilai semester 6 dari riwayat semester 1–5."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Baris Prediksi</p>
            <p className="text-xl font-semibold tabular-nums tracking-tight">
              {formatNumber(ringkasan.totalBaris)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Siswa</p>
            <p className="text-xl font-semibold tabular-nums tracking-tight">
              {formatNumber(ringkasan.totalSiswa)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cakupan</p>
            <p className="text-xl font-semibold tabular-nums tracking-tight">
              {formatNumber(ringkasan.totalCakupan)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Versi</p>
            <p className="truncate font-mono text-sm font-medium">
              {ringkasan.modelVersi}
            </p>
            <p className="text-xs text-muted-foreground">
              {JENIS_LABEL[ringkasan.jenis] ?? ringkasan.jenis}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Catatan Metodologi</CardTitle>
          <CardDescription>
            {ringkasan.jenis === "rule-engine"
              ? "Prediksi ini dihasilkan oleh rule engine B2, bukan model machine learning terlatih."
              : "Prediksi ini dihasilkan oleh model machine learning yang sudah lulus gate publikasi."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {ringkasan.jenis === "rule-engine" && (
            <>
              <p>
                Aturan B2: acuan di bawah 70 diturunkan 5 poin, acuan 80 atau
                lebih dinaikkan 1 poin, selain itu tetap, lalu dibatasi pada
                rentang 0–100. Acuan adalah nilai terakhir yang tersedia per
                cakupan.
              </p>
              <p>
                Model ML (V1, V2, V3) belum memenuhi gate publikasi terhadap B2,
                sehingga B2 diterbitkan sebagai rule engine. Pada evaluasi
                cakupan rata-rata, MAE B2{" "}
                <span className="font-medium text-foreground">
                  {formatMae(maeModel)}
                </span>{" "}
                dibandingkan B0{" "}
                <span className="font-medium text-foreground">
                  {formatMae(maeB0)}
                </span>
                {nSiswa !== null && nPasangan !== null && (
                  <>
                    {" "}
                    ({formatNumber(nSiswa)} siswa,{" "}
                    {formatNumber(nPasangan)} pasangan semester)
                  </>
                )}
                .
              </p>
            </>
          )}
          <p>
            Snapshot ini adalah <span className="font-medium text-foreground">backtest</span>{" "}
            untuk angkatan 2026: fitur dihitung dari semester 1–5, lalu nilai
            semester 6 diproyeksikan. Kedua angkatan di database sudah memiliki
            riwayat lengkap sampai semester 6, sehingga tidak ada siswa aktif
            yang dapat diprediksi untuk semester berikutnya. Hasil ini dipakai
            untuk memverifikasi perilaku rule engine, bukan sebagai peringatan
            dini untuk siswa yang sedang berjalan.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Siswa</th>
                  <th className="p-3 font-medium">Cakupan</th>
                  <th className="p-3 font-medium">Semester</th>
                  <th className="p-3 text-right font-medium">Prediksi</th>
                  <th className="p-3 text-right font-medium">Interval 95%</th>
                  <th className="p-3 text-right font-medium">MAE B2</th>
                  <th className="p-3 text-right font-medium">MAE B0</th>
                  <th className="p-3 font-medium">Jenis</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="p-3">
                      <p className="font-medium">{row.nama}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.nis} · {row.nama_kelas} · {row.tahun_lulus}
                      </p>
                    </td>
                    <td className="p-3">{labelCakupan(row)}</td>
                    <td className="whitespace-nowrap p-3 tabular-nums text-muted-foreground">
                      {row.semester_asal} → {row.semester_target}
                    </td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {formatNilai(row.nilai_prediksi)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-right tabular-nums text-muted-foreground">
                      {formatNilai(row.interval_bawah)} –{" "}
                      {formatNilai(row.interval_atas)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatMae(row.mae_model)}
                    </td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {formatMae(row.mae_b0)}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {JENIS_LABEL[row.jenis] ?? row.jenis}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center text-sm text-muted-foreground"
                    >
                      Belum ada prediksi yang diterbitkan. Jalankan{" "}
                      <code className="font-mono">npm run ml:publish-b2</code>{" "}
                      lalu{" "}
                      <code className="font-mono">npm run ml:post:b2</code>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
