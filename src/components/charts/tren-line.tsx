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
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(mapels.map((m) => m.kode))
  );

  const visibleMapels = useMemo(
    () => mapels.filter((m) => selected.has(m.kode)),
    [mapels, selected]
  );

  const toggle = (kode: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode);
      else next.add(kode);
      return next;
    });
  };

  const allSelected =
    mapels.length > 0 && visibleMapels.length === mapels.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(mapels.map((m) => m.kode)));
  };

  const yScale = useMemo(() => {
    const values = data
      .flatMap((row) => visibleMapels.map((m) => row[m.kode]))
      .filter((v): v is number => typeof v === "number");

    if (values.length === 0) {
      return { domain: [0, 100] as [number, number], ticks: undefined };
    }

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = Math.max(2, Math.round((rawMax - rawMin) * 0.05));

    const min = Math.max(0, rawMin - pad);
    const max = Math.min(100, rawMax + pad);

    if (max <= min) {
      return { domain: [min, max] as [number, number], ticks: undefined };
    }

    const roughStep = (max - min) / 8;
    const magnitude = Math.max(1, 10 ** Math.floor(Math.log10(roughStep)));
    const step =
      [1, 2, 5, 10].map((c) => c * magnitude).find((c) => c >= roughStep) ??
      10 * magnitude;

    const first = Math.ceil(min / step) * step;
    const count = Math.floor((max - first) / step);

    return {
      domain: [min, max] as [number, number],
      ticks: Array.from({ length: count + 1 }, (_, i) =>
        +(first + i * step).toFixed(2)
      ),
    };
  }, [data, visibleMapels]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={toggleAll}
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            allSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
        >
          Pilih Semua
        </button>
        {mapels.map((m, i) => {
          const isSelected = selected.has(m.kode);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.kode)}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent"
              style={{
                borderColor: isSelected
                  ? MAPEL_PALETTE[i % MAPEL_PALETTE.length]
                  : "var(--border)",
                color: isSelected ? "inherit" : "var(--muted-foreground)",
                opacity: isSelected ? 1 : 0.55,
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
              domain={yScale.domain}
              ticks={yScale.ticks}
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
                dot={{ r: 3 }}
                activeDot={{ r: 4 }}
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
