import { Users, HeartPulse, ClipboardList, Ban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

interface StatCardsProps {
  totalSiswa: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
}

const items = [
  { key: "siswa", label: "Total Siswa", color: "text-primary", bg: "bg-primary/10" },
  { key: "sakit", label: "Sakit", color: "text-amber-600", bg: "bg-amber-500/10" },
  { key: "izin", label: "Izin", color: "text-blue-600", bg: "bg-blue-500/10" },
  { key: "alpa", label: "Alpa", color: "text-red-600", bg: "bg-red-500/10" },
];

const icons = {
  siswa: Users,
  sakit: HeartPulse,
  izin: ClipboardList,
  alpa: Ban,
};

export function StatCards({ totalSiswa, totalSakit, totalIzin, totalAlpa }: StatCardsProps) {
  const values = { siswa: totalSiswa, sakit: totalSakit, izin: totalIzin, alpa: totalAlpa };
  const keys = ["siswa", "sakit", "izin", "alpa"] as const;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = icons[item.key as keyof typeof icons];
        return (
          <Card key={item.key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", item.bg)}>
                <Icon className={cn("size-5", item.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight">
                  {formatNumber(values[keys[i]])}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

