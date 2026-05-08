"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function RoutinesPage() {
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/auth/login"); return; }
        const res = await fetch("/api/get-routines", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [router]);

  if (loading) return (
    <div className="loading-center" style={{ minHeight: "60vh" }}><div className="loading" /></div>
  );

  const { routines = [], suggestions = [] } = data || {};

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Training</p>
          <h1 className="page-title">Routines</h1>
        </div>
      </div>

      {/* ── Progressive Overload Suggestions ── */}
      {suggestions.length > 0 && (
        <div className="content-card" style={{ marginBottom: "24px" }}>
          <h3 className="card-title">Suggested Next Week</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Rutina</th>
                <th>Peso actual</th>
                <th>Sugerencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s: any, i: number) => (
                <tr key={i}>
                  <td style={{ color: "var(--text)", fontWeight: 500 }}>{s.exercise}</td>
                  <td>{s.routine}</td>
                  <td>{s.currentWeight > 0 ? `${s.currentWeight} kg` : "--"}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text)" }}>
                    {s.suggestion}
                  </td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Routine cards ── */}
      {routines.length === 0 ? (
        <div className="content-card" style={{ textAlign: "center", padding: "60px 32px" }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "var(--text)", marginBottom: "10px" }}>
            Sin entrenamientos todavía
          </p>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            Registra workouts en el Overview para ver tus rutinas aquí.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {routines.map((r: any) => (
            <RoutineCard
              key={r.name}
              routine={r}
              expanded={expanded === r.name}
              onToggle={() => setExpanded(expanded === r.name ? null : r.name)}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Routine card ──────────────────────────────────────────────────────────────

function RoutineCard({ routine: r, expanded, onToggle }: {
  routine: any; expanded: boolean; onToggle: () => void;
}) {
  const plateaued = (r.exercises || []).filter((e: any) => e.isPlateaued).length;

  return (
    <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none", padding: "24px 28px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: "18px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
              {r.name}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              {r.sessionCount} sesiones
              {r.lastTrainedDaysAgo !== null && (
                <span> · hace {r.lastTrainedDaysAgo === 0 ? "hoy" : `${r.lastTrainedDaysAgo}d`}</span>
              )}
            </div>
          </div>
          {plateaued > 0 && (
            <span className="badge badge-yellow">{plateaued} plateau{plateaued !== 1 ? "s" : ""}</span>
          )}
        </div>
        <span style={{ color: "var(--muted)", fontSize: "18px", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
          ↓
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "24px 28px" }}>
          {/* Volume chart */}
          {r.weeklyVolume?.length > 1 && (
            <div style={{ marginBottom: "28px" }}>
              <div className="section-label" style={{ margin: "0 0 12px" }}>Volumen semanal (kg×reps)</div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.weeklyVolume} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3530" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#8a9590", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#8a9590", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      contentStyle={{ background: "#1c2521", border: "1px solid #2a3530", borderRadius: "8px", color: "#e8efea", fontSize: "12px" }}
                      cursor={{ fill: "rgba(125,240,168,0.04)" }}
                    />
                    <Bar dataKey="volume" fill="#7df0a8" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Exercise table */}
          {r.exercises?.length > 0 && (
            <>
              <div className="section-label" style={{ margin: "0 0 12px" }}>Ejercicios</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ejercicio</th>
                    <th>Peso actual</th>
                    <th>vs 4 semanas</th>
                    <th>Sesiones</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {r.exercises.map((ex: any, i: number) => {
                    const change = ex.change4w;
                    const changeColor = change === null ? "var(--muted)"
                      : change > 0 ? "var(--accent)"
                      : change < 0 ? "var(--coral)"
                      : "var(--muted)";
                    const changeStr = change === null ? "—"
                      : change > 0 ? `+${change} kg`
                      : change < 0 ? `${change} kg`
                      : "= mismo";
                    return (
                      <tr key={i}>
                        <td style={{ color: "var(--text)", fontWeight: 500 }}>{ex.name}</td>
                        <td>
                          {ex.currentWeight > 0
                            ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>{ex.currentWeight} kg</span>
                            : "--"}
                        </td>
                        <td style={{ color: changeColor }}>{changeStr}</td>
                        <td>{ex.sessionCount}</td>
                        <td>
                          {ex.isPlateaued
                            ? <span className="badge badge-yellow">Plateau</span>
                            : change !== null && change > 0
                              ? <span className="badge badge-green">Progresando</span>
                              : <span className="badge badge-gray">OK</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "ready")       return <span className="badge badge-green">● Ready</span>;
  if (status === "progressing") return <span className="badge badge-gray">✓ Progresando</span>;
  return <span className="badge badge-yellow">◐ Almost</span>;
}
