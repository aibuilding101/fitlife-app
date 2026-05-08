"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function RoutinesPage() {
  const router = useRouter();
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quickLogging, setQuickLogging] = useState<string | null>(null);

  const reload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/get-routines", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) setData(await res.json());
  };

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

  const { suggestions = [] } = data || {};
  const routines = (data?.routines || []).filter((r: any) => r.sessionCount > 0);

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
              onToggle={() => { setExpanded(expanded === r.name ? null : r.name); setQuickLogging(null); }}
              quickLog={quickLogging === r.name}
              onToggleQuickLog={() => { setQuickLogging(quickLogging === r.name ? null : r.name); setExpanded(null); }}
              onSaved={reload}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Routine card ──────────────────────────────────────────────────────────────

function RoutineCard({ routine: r, expanded, onToggle, quickLog, onToggleQuickLog, onSaved }: {
  routine: any; expanded: boolean; onToggle: () => void;
  quickLog: boolean; onToggleQuickLog: () => void; onSaved: () => void;
}) {
  const plateaued = (r.exercises || []).filter((e: any) => e.isPlateaued).length;

  return (
    <div className="content-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onToggle}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1 }}
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
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onToggleQuickLog}
            style={{
              padding: "7px 14px", borderRadius: "var(--r-md)", border: `1px solid ${quickLog ? "var(--accent)" : "rgba(255,107,107,0.3)"}`,
              background: quickLog ? "rgba(255,107,107,0.12)" : "none",
              color: "var(--accent)", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {quickLog ? "Cerrar" : "Log rápido"}
          </button>
          <span
            onClick={onToggle}
            style={{ color: "var(--muted)", fontSize: "18px", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none", cursor: "pointer" }}
          >
            ↓
          </span>
        </div>
      </div>

      {/* Quick log form */}
      {quickLog && <QuickLogForm routine={r} onClose={onToggleQuickLog} onSaved={onSaved} />}

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
                      cursor={{ fill: "rgba(255,107,107,0.04)" }}
                    />
                    <Bar dataKey="volume" fill="#FF6B6B" radius={[3, 3, 0, 0]} />
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

// ── Quick log form ────────────────────────────────────────────────────────────

function QuickLogForm({ routine, onClose, onSaved }: {
  routine: any; onClose: () => void; onSaved: () => void;
}) {
  const [entries, setEntries] = useState<any[]>(
    (routine.exercises || []).map((ex: any) => ({
      name: ex.name, sets: 3, reps: 8, weight: ex.currentWeight || 0, unit: "lbs",
    }))
  );
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const update = (i: number, field: string, val: any) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch("/api/log-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ routineName: routine.name, entries }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  if (success) return (
    <div style={{ padding: "24px 28px", borderTop: "1px solid var(--border)" }}>
      <div className="success-banner">✅ {routine.name} guardado!</div>
    </div>
  );

  const todayLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (!entries.length) return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "24px 28px" }}>
      <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "12px" }}>
        Esta rutina no tiene ejercicios registrados. Primero registra un entrenamiento desde el Overview para ver los ejercicios aquí.
      </p>
      <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
    </div>
  );

  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="section-label" style={{ margin: 0 }}>Log rápido — edita los pesos</div>
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>📅 {todayLabel}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 80px 70px", gap: "8px" }}>
          {["Ejercicio","Series","Reps","Peso","Unidad"].map(h => (
            <span key={h} style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase", textAlign: h === "Ejercicio" ? "left" : "center" }}>{h}</span>
          ))}
        </div>
        {entries.map((entry, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 80px 70px", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</span>
            <input type="number" min="1" max="10" value={entry.sets}   onChange={e => update(i, "sets",   parseInt(e.target.value)   || 1)}
              style={{ padding: "6px 8px", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text)", fontSize: "13px", textAlign: "center", width: "100%" }} />
            <input type="number" min="1" max="50" value={entry.reps}   onChange={e => update(i, "reps",   parseInt(e.target.value)   || 1)}
              style={{ padding: "6px 8px", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text)", fontSize: "13px", textAlign: "center", width: "100%" }} />
            <input type="number" min="0" step="2.5" value={entry.weight} onChange={e => update(i, "weight", parseFloat(e.target.value) || 0)}
              style={{ padding: "6px 8px", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text)", fontSize: "13px", textAlign: "center", width: "100%" }} />
            <select value={entry.unit} onChange={e => update(i, "unit", e.target.value)}
              style={{ padding: "6px 4px", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text)", fontSize: "12px", width: "100%" }}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        ))}
      </div>
      {error && <div className="error" style={{ marginTop: "12px" }}>{error}</div>}
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar entrenamiento"}
        </button>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "ready")       return <span className="badge badge-green">● Ready</span>;
  if (status === "progressing") return <span className="badge badge-gray">✓ Progresando</span>;
  return <span className="badge badge-yellow">◐ Almost</span>;
}
