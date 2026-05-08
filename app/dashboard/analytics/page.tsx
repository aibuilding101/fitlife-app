"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/auth/login"); return; }
        const res = await fetch("/api/get-analytics", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          setData(await res.json());
        } else {
          const err = await res.json().catch(() => ({}));
          setApiError(err.error || `Error ${res.status} cargando analytics`);
        }
      } catch (e: any) {
        setApiError(e.message || "Error de red");
        console.error(e);
      } finally { setLoading(false); }
    })();
  }, [router]);

  if (loading) return (
    <div className="loading-center" style={{ minHeight: "60vh" }}><div className="loading" /></div>
  );

  if (apiError || !data?.hasData) return (
    <>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Data</p>
          <h1 className="page-title">Analytics</h1>
        </div>
      </div>
      {apiError ? (
        <div className="error" style={{ marginBottom: "16px" }}>{apiError}</div>
      ) : (
        <div className="content-card" style={{ textAlign: "center", padding: "60px 32px" }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "var(--text)", marginBottom: "10px" }}>
            Sin datos todavía
          </p>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            Registra entrenamientos en el Overview para ver analytics.
          </p>
        </div>
      )}
    </>
  );

  const { weeklyVolume = [], muscleGroups = [], topExercises = [],
          frequencyDates = [], streak = 0, totalWorkouts = 0 } = data;

  const avgVolume = weeklyVolume.length
    ? Math.round(weeklyVolume.reduce((s: number, w: any) => s + w.volume, 0) / weeklyVolume.length)
    : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Data</p>
          <h1 className="page-title">Analytics</h1>
        </div>
      </div>

      {/* ── Top stats ── */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-label">Racha actual</div>
          <div className="stat-row">
            <span className="stat-value">{streak}</span>
            <span className="stat-unit">días</span>
          </div>
          <div className="stat-meta">consecutivos</div>
          <div className="stat-track">
            <div className="stat-fill" style={{ width: `${Math.min(100, streak * 14)}%`, background: "var(--accent)" }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total entrenos</div>
          <div className="stat-row">
            <span className="stat-value">{totalWorkouts}</span>
            <span className="stat-unit">sesiones</span>
          </div>
          <div className="stat-meta">historial completo</div>
          <div className="stat-track">
            <div className="stat-fill" style={{ width: "100%", background: "var(--accent)" }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Volumen promedio</div>
          <div className="stat-row">
            <span className="stat-value">{avgVolume.toLocaleString()}</span>
            <span className="stat-unit">kg·rep/sem</span>
          </div>
          <div className="stat-meta">últimas 12 semanas</div>
          <div className="stat-track">
            <div className="stat-fill" style={{ width: "65%", background: "var(--amber)" }} />
          </div>
        </div>
      </div>

      {/* ── Weekly Volume Bar Chart ── */}
      <div className="content-card" style={{ marginBottom: "20px" }}>
        <h3 className="card-title">Volumen Semanal</h3>
        <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "20px", marginTop: "-16px" }}>
          Total kg × reps por semana — últimas 12 semanas
        </p>
        {weeklyVolume.length > 0 ? (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyVolume} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3530" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#8a9590", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8a9590", fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                <Tooltip
                  contentStyle={{ background: "#1c2521", border: "1px solid #2a3530", borderRadius: "8px", color: "#e8efea", fontSize: "12px" }}
                  cursor={{ fill: "rgba(255,107,107,0.04)" }}
                  formatter={(v: any) => [v.toLocaleString(), "Volumen"]}
                />
                <Bar dataKey="volume" fill="#FF6B6B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty-state">Sin datos suficientes.</p>
        )}
      </div>

      {/* ── Muscle Groups + Top Exercises ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Muscle groups */}
        <div className="content-card">
          <h3 className="card-title">Grupos Musculares</h3>
          {muscleGroups.length === 0 ? <p className="empty-state">Sin datos.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {muscleGroups.map((m: any) => {
                const color = m.name === "Legs" ? "var(--accent)"
                  : m.name === "Back"      ? "var(--amber)"
                  : m.name === "Chest"     ? "var(--coral)"
                  : m.name === "Shoulders" ? "#a78bfa"
                  : m.name === "Arms"      ? "#67e8f9"
                  : "var(--muted)";
                return (
                  <div key={m.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text)" }}>{m.name}</span>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>{m.percent}%</span>
                    </div>
                    <div style={{ height: "5px", background: "var(--border)", borderRadius: "3px" }}>
                      <div style={{ width: `${m.percent}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top exercises */}
        <div className="content-card">
          <h3 className="card-title">Top Ejercicios</h3>
          <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "16px", marginTop: "-16px" }}>por volumen total</p>
          {topExercises.length === 0 ? <p className="empty-state">Sin datos.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {topExercises.map((ex: any, i: number) => (
                <div key={ex.name} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{
                    fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 600,
                    color: i === 0 ? "var(--accent)" : i === 1 ? "var(--amber)" : "var(--muted)",
                    width: "28px", textAlign: "center", lineHeight: 1,
                  }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>{ex.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {ex.volume.toLocaleString()} kg·rep
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Frequency Heatmap ── */}
      <div className="content-card">
        <h3 className="card-title">Frecuencia de Entrenamiento</h3>
        <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "20px", marginTop: "-16px" }}>
          Últimos 90 días
        </p>
        <Heatmap frequencyDates={frequencyDates} />
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Menos</span>
          {[0, 0.3, 0.6, 1].map(op => (
            <div key={op} style={{ width: "11px", height: "11px", borderRadius: "2px",
              background: op === 0 ? "var(--border)" : `rgba(255,107,107,${op})` }} />
          ))}
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Más</span>
        </div>
      </div>

      {/* ── Badges ── */}
      <div className="content-card" style={{ marginTop: "20px" }}>
        <h3 className="card-title">Logros</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          <BadgeCard title="First Step"    desc="Primer entrenamiento registrado"  earned={totalWorkouts >= 1}   icon="🏆" />
          <BadgeCard title="5-Day Streak"  desc="5 días consecutivos"              earned={streak >= 5}          icon="🔥" />
          <BadgeCard title="10-Day Streak" desc="10 días consecutivos"             earned={streak >= 10}         icon="🔥🔥" />
          <BadgeCard title="21-Day Streak" desc="21 días consecutivos"             earned={streak >= 21}         icon="💎" />
          <BadgeCard title="100 Workouts"  desc="100 entrenamientos totales"       earned={totalWorkouts >= 100} icon="💯" />
          <BadgeCard
            title="Iron Warrior"
            desc="500,000 lbs de volumen total"
            earned={weeklyVolume.reduce((s: number, w: any) => s + w.volume, 0) * 12 >= 500000}
            icon="⚔️"
          />
        </div>
      </div>
    </>
  );
}

// ── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({ title, desc, earned, icon }: { title: string; desc: string; earned: boolean; icon: string }) {
  return (
    <div style={{
      padding: "16px", borderRadius: "var(--r-lg)",
      border: `1px solid ${earned ? "rgba(255,107,107,0.3)" : "var(--border)"}`,
      background: earned ? "rgba(255,107,107,0.06)" : "var(--s2)",
      opacity: earned ? 1 : 0.4,
    }}>
      <div style={{ fontSize: "24px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: earned ? "var(--accent)" : "var(--muted)", marginBottom: "4px" }}>{title}</div>
      <div style={{ fontSize: "11px", color: "var(--muted)" }}>{desc}</div>
    </div>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function Heatmap({ frequencyDates }: { frequencyDates: string[] }) {
  const dateSet = new Set(frequencyDates);
  const today   = new Date();

  // Build 13 weeks × 7 days grid (newest week on right)
  const weeks: (Date | null)[][] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 90);
  // Align to Monday
  const startDay = start.getDay();
  start.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1));

  let d = new Date(start);
  while (d <= today) {
    const week: (Date | null)[] = [];
    for (let day = 0; day < 7; day++) {
      week.push(d <= today ? new Date(d) : null);
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
  }

  const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
      {/* Day labels */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", paddingTop: "0" }}>
        {DAY_LABELS.map(l => (
          <div key={l} style={{ width: "12px", height: "11px", fontSize: "9px", color: "#3a4a44",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            {l}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div style={{ display: "flex", gap: "3px", overflowX: "auto" }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {week.map((date, di) => {
              if (!date) return <div key={di} style={{ width: "11px", height: "11px" }} />;
              const ds = date.toISOString().split("T")[0];
              const active = dateSet.has(ds);
              return (
                <div key={di} title={ds} style={{
                  width: "11px", height: "11px", borderRadius: "2px",
                  background: active ? "var(--accent)" : "var(--border)",
                  opacity: active ? 1 : 0.5,
                  transition: "background 0.1s",
                }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
