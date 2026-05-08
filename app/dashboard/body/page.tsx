"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ProgressChart } from "@/components/ProgressChart";

export default function BodyPage() {
  const router  = useRouter();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/auth/login"); return; }
        const res = await fetch("/api/get-body", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [router]);

  if (loading) return (
    <div className="loading-center" style={{ minHeight: "60vh" }}><div className="loading" /></div>
  );

  const d = data || {};

  if (!d.hasData) return (
    <>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Composición</p>
          <h1 className="page-title">Body</h1>
        </div>
      </div>
      <div className="content-card" style={{ textAlign: "center", padding: "60px 32px" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "var(--text)", marginBottom: "10px" }}>
          Sin medidas todavía
        </p>
        <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "24px" }}>
          Registra tu primer peso y grasa corporal para comenzar.
        </p>
        <a href="/dashboard" className="btn btn-primary">Ir a Measurements</a>
      </div>
    </>
  );

  const { latest, changes, chartData, measurements } = d;

  const changeColor = (v: number) => v < 0 ? "var(--coral)" : v > 0 ? "var(--accent)" : "var(--muted)";
  const fmt = (v: number) => (v > 0 ? "+" : "") + v;

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Composición</p>
          <h1 className="page-title">Body</h1>
        </div>
        <span className="page-date">{measurements?.length} mediciones</span>
      </div>

      {/* Top stat cards */}
      <div className="stats-grid" style={{ marginBottom: "28px" }}>
        <div className="stat-card">
          <div className="stat-label">Peso actual</div>
          <div className="stat-row">
            <span className="stat-value">{latest?.weight ?? "--"}</span>
            <span className="stat-unit">kg</span>
          </div>
          <div className="stat-meta" style={{ color: changes?.weightChange != null ? changeColor(changes.weightChange) : "var(--muted)" }}>
            {changes?.weightChange != null ? `${fmt(changes.weightChange)} kg` : "—"}
          </div>
          <div className="stat-track"><div className="stat-fill" style={{ width: "100%", background: "var(--border)" }} /></div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Grasa corporal</div>
          <div className="stat-row">
            <span className="stat-value">{latest?.bodyFat ?? "--"}</span>
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-meta" style={{ color: changes?.fatChange != null ? changeColor(-changes.fatChange) : "var(--muted)" }}>
            {changes?.fatChange != null ? `${fmt(changes.fatChange)}%` : "—"}
          </div>
          <div className="stat-track"><div className="stat-fill" style={{ width: latest?.bodyFat ? `${Math.min(100,(latest.bodyFat/30)*100)}%` : "0%", background: "var(--coral)" }} /></div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Masa magra est.</div>
          <div className="stat-row">
            <span className="stat-value">
              {changes?.muscleDelta != null ? fmt(changes.muscleDelta) : "--"}
            </span>
            <span className="stat-unit">kg</span>
          </div>
          <div className="stat-meta">en {changes?.daySpan ?? "—"} días</div>
          <div className="stat-track">
            <div className="stat-fill" style={{ width: changes?.muscleDelta != null && changes.muscleDelta > 0 ? "80%" : "0%", background: "var(--accent)" }} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="content-card" style={{ marginBottom: "20px" }}>
        <h3 className="card-title">Peso y Grasa Corporal</h3>
        <ProgressChart data={chartData || []} />
      </div>

      {/* Measurement log */}
      <div className="content-card">
        <h3 className="card-title">Historial</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso (kg)</th>
              <th>Grasa (%)</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {[...(measurements || [])].reverse().map((m: any, i: number) => (
              <tr key={i}>
                <td>{m.date}</td>
                <td>{m.weight_kg ?? "--"}</td>
                <td>{m.body_fat_percent ?? "--"}</td>
                <td style={{ color: "var(--muted)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.notes || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
