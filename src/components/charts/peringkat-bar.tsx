"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { CHART_COLORS } from "./chart-colors";

interface PeringkatBarProps {
  data: { kode: string; mapel: string; nilai: number }[];
  height?: number;
}

export function PeringkatBar({ data, height = 320 }: PeringkatBarProps) {
  const ranked = [...data].sort((a, b) => b.nilai - a.nilai);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={ranked}
          layout="vertical"
          margin={{ left: 8, right: 24 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.4} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="kode"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={40}
          />
          <Tooltip
            formatter={(value, _name, entry) => {
              const item = (entry as { payload?: { mapel?: string } })?.payload;
              return [String(value ?? ""), item?.mapel ?? ""];
            }}
            cursor={{ fill: "var(--muted)" }}
          />
          <Bar dataKey="nilai" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="nilai"
              position="right"
              fontSize={10}
            />
            {ranked.map((d, i) => (
              <Cell
                key={d.kode}
                fill={
                  i === 0
                    ? CHART_COLORS.emerald
                    : i === ranked.length - 1
                      ? CHART_COLORS.red
                      : CHART_COLORS.blue
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
