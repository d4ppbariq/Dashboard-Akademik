"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { KEHADIRAN_COLORS } from "./chart-colors";

interface KehadiranBarProps {
  data: { semester: string; Sakit: number; Izin: number; Alpa: number }[];
  height?: number;
}

export function KehadiranBar({ data, height = 280 }: KehadiranBarProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
          <XAxis dataKey="semester" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            allowDecimals={false}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} />
          <Legend iconType="circle" iconSize={8} />
          <Bar dataKey="Sakit" fill={KEHADIRAN_COLORS.Sakit} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Izin" fill={KEHADIRAN_COLORS.Izin} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Alpa" fill={KEHADIRAN_COLORS.Alpa} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
