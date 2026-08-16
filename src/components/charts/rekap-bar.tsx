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

interface RekapBarProps {
  data: { kode: string; mapel: string; nilai: number }[];
  height?: number;
}

export function RekapBar({ data, height = 300 }: RekapBarProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={26}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
          <XAxis
            dataKey="kode"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            interval={0}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <Tooltip
            formatter={(value, _name, entry) => {
              const item = (entry as { payload?: { mapel?: string } })?.payload;
              return [String(value ?? ""), item?.mapel ?? ""];
            }}
            cursor={{ fill: "var(--muted)" }}
          />
          <Bar dataKey="nilai" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="nilai" position="top" fontSize={10} />
            {data.map((d, i) => (
              <Cell
                key={d.kode}
                fill={i === 0 ? CHART_COLORS.emerald : CHART_COLORS.blue}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
