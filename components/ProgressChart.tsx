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
      <div style={{ color: "#888", padding: "20px", textAlign: "center" }}>
        No hay datos de mediciones todavía. Registra tu peso y grasa corporal para ver gráficos.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: "Peso (kg)", angle: -90, position: "insideLeft" }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: "Grasa (%)", angle: 90, position: "insideRight" }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#0066cc" name="Peso (kg)" />
          <Line yAxisId="right" type="monotone" dataKey="bodyFat" stroke="#ff6b6b" name="Grasa (%)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
