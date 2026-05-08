"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChartDataPoint {
  date: string;
  weight?: number;
  bodyFat?: number;
}

export function ProgressChart({ data }: { data: ChartDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ color: "#3a4a44", padding: "32px 0", textAlign: "center", fontSize: "13px" }}>
        Sin datos todavía. Registra medidas para ver gráficos.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3530" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#8a9590", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left"  tick={{ fill: "#8a9590", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#8a9590", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ background: "#1c2521", border: "1px solid #2a3530", borderRadius: "10px", color: "#e8efea", fontSize: "12px" }}
            labelStyle={{ color: "#8a9590", marginBottom: "4px" }}
            cursor={{ stroke: "#2a3530" }}
          />
          <Legend wrapperStyle={{ color: "#8a9590", fontSize: "12px", paddingTop: "16px" }} />
          <Line yAxisId="left"  type="monotone" dataKey="weight"  stroke="#7df0a8" name="Peso (kg)"  dot={false} strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="bodyFat" stroke="#ff7670" name="Grasa (%)" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
