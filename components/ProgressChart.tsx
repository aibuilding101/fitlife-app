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
      <div style={{ color: "#444", padding: "20px", textAlign: "center", fontSize: "14px" }}>
        No hay datos todavía. Registra medidas para ver gráficos.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 11 }} axisLine={{ stroke: "#1a1a1a" }} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fill: "#444", fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "kg", angle: -90, position: "insideLeft", fill: "#444", fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#444", fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "%", angle: 90, position: "insideRight", fill: "#444", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#141414", border: "1px solid #222", borderRadius: "8px", color: "#fff", fontSize: "13px" }} />
          <Legend wrapperStyle={{ color: "#555", fontSize: "12px" }} />
          <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#00ff88" name="Peso (kg)" dot={false} strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="bodyFat" stroke="#7c3aed" name="Grasa (%)" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
