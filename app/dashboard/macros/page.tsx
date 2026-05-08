"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ACTIVITY_OPTIONS = [
  { value: "sedentary",   label: "Sedentario (poco o ningún ejercicio)" },
  { value: "light",       label: "Ligero (1–3 días/semana)" },
  { value: "moderate",    label: "Moderado (3–5 días/semana)" },
  { value: "active",      label: "Activo (6–7 días/semana)" },
  { value: "very_active", label: "Muy activo (2× al día)" },
];

const GOAL_OPTIONS = [
  { value: "CUT",  label: "Definición (CUT) — déficit 500 kcal", color: "var(--coral)" },
  { value: "MAINT",label: "Mantenimiento (MAINT)", color: "var(--amber)" },
  { value: "BULK", label: "Volumen (BULK) — +300 kcal", color: "var(--accent)" },
];

export default function MacrosPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [height, setHeight] = useState("");
  const [age, setAge]       = useState("");
  const [activity, setActivity] = useState("moderate");
  const [goal, setGoal]     = useState("CUT");
  const [weight, setWeight] = useState("");

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }
      const res = await fetch("/api/macros", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (d.profile) {
          if (d.profile.height_cm) setHeight(String(d.profile.height_cm));
          if (d.profile.age) setAge(String(d.profile.age));
          if (d.profile.activity_level) setActivity(d.profile.activity_level);
          if (d.profile.goal) setGoal(d.profile.goal);
          if (d.profile.weight_kg) setWeight(String(d.profile.weight_kg));
        }
        if (!d.targets) setShowSetup(true);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!height || !age || !weight) { setError("Completa altura, edad y peso"); return; }
    setSaving(true); setError(""); setSaveSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch("/api/macros", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ height_cm: height, age, activity_level: activity, goal, weight_kg: weight }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setSaveSuccess(true); setShowSetup(false); await loadData();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="loading-center" style={{ minHeight: "60vh" }}><div className="loading" /></div>
  );

  const { targets, today, weeklyAdherence, profile } = data || {};
  const pct = (v: number, max: number) => max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0;
  const goalInfo = GOAL_OPTIONS.find(g => g.value === (profile?.goal || goal));

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Nutrición</p>
          <h1 className="page-title">Macros</h1>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowSetup(s => !s)}>
          {showSetup ? "Cerrar" : "Editar perfil"}
        </button>
      </div>

      {showSetup && (
        <div className="content-card" style={{ marginBottom: "24px" }}>
          <h3 className="card-title">Configurar perfil</h3>
          <div className="form-grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Altura (cm)</label>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="178" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Edad</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: "16px" }}>
            <label>Peso (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="80" />
          </div>
          <div className="form-group">
            <label>Nivel de actividad</label>
            <select value={activity} onChange={e => setActivity(e.target.value)}>
              {ACTIVITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Objetivo</label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  style={{
                    padding: "10px 20px", borderRadius: "var(--r-md)",
                    border: `1px solid ${goal === g.value ? g.color : "var(--border)"}`,
                    background: goal === g.value ? `${g.color}15` : "none",
                    color: goal === g.value ? g.color : "var(--muted)", cursor: "pointer",
                    fontSize: "13px", fontWeight: goal === g.value ? 600 : 400, transition: "all 0.15s",
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="error" style={{ marginBottom: "12px" }}>{error}</div>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Calculando..." : "Guardar y calcular macros"}
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="success-banner" style={{ marginBottom: "20px" }}>✅ Macros calculados y guardados.</div>
      )}

      {!targets && !showSetup && (
        <div className="content-card" style={{ textAlign: "center", padding: "60px 32px" }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", color: "var(--text)", marginBottom: "10px" }}>
            Configura tu perfil
          </p>
          <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "24px" }}>
            Ingresa tu altura, edad y objetivo para calcular tus macros diarios.
          </p>
          <button className="btn btn-primary" onClick={() => setShowSetup(true)}>Configurar ahora</button>
        </div>
      )}

      {targets && (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px",
            padding: "14px 20px", background: "var(--s2)", borderRadius: "var(--r-lg)",
            border: `1px solid ${goalInfo?.color || "var(--border)"}22`,
          }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Objetivo:</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: goalInfo?.color || "var(--text)" }}>
              {goalInfo?.label}
            </span>
            <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--muted)" }}>
              {targets.calories} kcal/día
            </span>
          </div>

          <div className="stats-grid" style={{ marginBottom: "24px" }}>
            <MacroCard label="Calorías"      current={Math.round(today?.calories  || 0)} target={targets.calories}  unit="kcal" color="var(--accent)" />
            <MacroCard label="Proteína"      current={Math.round(today?.protein_g || 0)} target={targets.protein_g} unit="g"    color="var(--accent)" />
            <MacroCard label="Carbohidratos" current={Math.round(today?.carbs_g   || 0)} target={targets.carbs_g}   unit="g"    color="var(--amber)"  />
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "24px" }}>
            <MacroCard label="Grasas" current={Math.round(today?.fat_g || 0)} target={targets.fat_g} unit="g" color="var(--coral)" />
            <div className="stat-card">
              <div className="stat-label">Adherencia semanal</div>
              <div className="stat-row">
                <span className="stat-value">{weeklyAdherence?.daysHit ?? 0}</span>
                <span className="stat-unit">/{weeklyAdherence?.totalDays ?? 7} días</span>
              </div>
              <div className="stat-meta">con macros en rango</div>
              <div className="stat-track">
                <div className="stat-fill" style={{
                  width: `${pct(weeklyAdherence?.daysHit || 0, weeklyAdherence?.totalDays || 7)}%`,
                  background: "var(--accent)",
                }} />
              </div>
            </div>
          </div>

          <div className="content-card">
            <h3 className="card-title">Targets diarios</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Proteína",        val: targets.protein_g, unit: "g",    color: "var(--accent)", note: "Prioridad #1" },
                { label: "Carbohidratos",   val: targets.carbs_g,   unit: "g",    color: "var(--amber)",  note: "Energía" },
                { label: "Grasas",          val: targets.fat_g,     unit: "g",    color: "var(--coral)",  note: "Hormonas" },
                { label: "Calorías totales",val: targets.calories,  unit: "kcal", color: "var(--muted)",  note: profile?.goal },
              ].map(m => (
                <div key={m.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>{m.label}</span>
                    <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "8px" }}>{m.note}</span>
                  </div>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 600, color: m.color }}>
                    {m.val}<span style={{ fontSize: "13px", fontWeight: 400, color: "var(--muted)", marginLeft: "3px" }}>{m.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MacroCard({ label, current, target, unit, color }: {
  label: string; current: number; target: number; unit: string; color: string;
}) {
  const p = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-row">
        <span className="stat-value">{current}</span>
        <span className="stat-unit">{unit}</span>
      </div>
      <div className="stat-meta">de {target}{unit} ({p}%)</div>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}
