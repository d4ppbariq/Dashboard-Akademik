"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { MAPEL_PALETTE } from "./chart-colors";

interface TrenLineProps {
  data: { semester: string; [mapelKode: string]: string | number | null }[];
  mapels: { id: string; kode: string; nama_mapel: string }[];
  height?: number;
}

export function TrenLine({ data, mapels, height = 300 }: TrenLineProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  const visibleMapels = useMemo(
    () => mapels.filter((m) => !hidden.has(m.kode)),
    [mapels, hidden]
  );

  const toggle = (kode: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {mapels.map((m, i) => {
          const isHidden = hidden.has(m.kode);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.kode)}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent"
              style={{
                borderColor: isHidden ? "var(--border)" : MAPEL_PALETTE[i % MAPEL_PALETTE.length],
                color: isHidden ? "var(--muted-foreground)" : "inherit",
                opacity: isHidden ? 0.55 : 1,
              }}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: MAPEL_PALETTE[i % MAPEL_PALETTE.length] }}
              />
              {m.kode}
            </button>
          );
        })}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
            <XAxis dataKey="semester" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <Tooltip />
            {visibleMapels.map((m, i) => (
              <Line
                key={m.id}
                type="monotone"
                dataKey={m.kode}
                name={m.kode}
                stroke={MAPEL_PALETTE[i % MAPEL_PALETTE.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {visibleMapels.length}/{mapels.length} mapel ditampilkan
        </Badge>
        <p className="text-xs text-muted-foreground">
          Klik kode mapel untuk menampilkan atau menyembunyikan.
        </p>
      </div>
    </div>
  );
}
