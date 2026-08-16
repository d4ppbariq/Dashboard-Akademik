"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { GENDER_COLORS } from "./chart-colors";

interface GenderDonutProps {
  data: { name: string; value: number }[];
  height?: number;
}

export function GenderDonut({ data, height = 260 }: GenderDonutProps) {
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={GENDER_COLORS[entry.name as keyof typeof GENDER_COLORS] ?? "#94a3b8"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value ?? 0);
              return [
                `${v} siswa (${total ? Math.round((v / total) * 100) : 0}%)`,
                String(name),
              ];
            }}
          />
          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
