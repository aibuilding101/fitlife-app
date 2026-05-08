"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ProgressChart } from "@/components/ProgressChart";

interface DashboardData {
  userName: string;
  proteinToday: number;
  caloriestoday: number;
  carbsToday: number;
  workoutsThisWeek: number;
  bodyFatPercent: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
}

const NAV = [
  { id: "dashboard",    label: "Dashboard" },
  { id: "nutrition",    label: "Nutrition" },
  { id: "workout",      label: "Workout" },
  { id: "measurements", label: "Measurements" },
  { id: "progress",     label: "Progress" },
  { id: "recovery",     label: "Recovery" },
];

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    userName: "User",
    proteinToday: 0,
    caloriestoday: 0,
    carbsToday: 0,
    workoutsThisWeek: 0,
    bodyFatPercent: null,
    weightKg: null,
    targetWeightKg: null,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/auth/login"); return; }
        setUserId(session.user.id);

        const { data: profile } = await supabase
          .from("user_profiles").select("*").eq("user_id", session.user.id).single();
        const userName = profile?.name || session.user.email?.split("@")[0] || "User";

        const today = new Date().toISOString().split("T")[0];
        const { data: nutritionToday } = await supabase
          .from("nutrition_logs").select("*").eq("user_id", session.user.id).eq("date", today);

        let proteinToday = 0, caloriestoday = 0, carbsToday = 0;
        if (nutritionToday?.length) {
          proteinToday  = nutritionToday.reduce((s, l) => s + (l.protein_g || 0), 0);
          caloriestoday = nutritionToday.reduce((s, l) => s + (l.calories   || 0), 0);
          carbsToday    = nutritionToday.reduce((s, l) => s + (l.carbs_g    || 0), 0);
        }

        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: workoutsWeek } = await supabase
          .from("workout_logs").select("*").eq("user_id", session.user.id)
          .gte("date", weekAgo.toISOString().split("T")[0]);
        const workoutsThisWeek = workoutsWeek?.length || 0;

        const { data: measurements } = await supabase
          .from("measurements").select("*").eq("user_id", session.user.id)
          .order("date", { ascending: false }).limit(1);

        let bodyFatPercent: number | null = null;
        let weightKg: number | null = null;
        const targetWeightKg: number | null = profile?.target_weight_kg || null;
        if (measurements?.length) {
          const m = measurements[0];
          if (m.body_fat_percent) bodyFatPercent = m.body_fat_percent;
          if (m.weight_kg)        weightKg = m.weight_kg;
        }

        setData({ userName, proteinToday, caloriestoday, carbsToday, workoutsThisWeek, bodyFatPercent, weightKg, targetWeightKg });
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const handleLogOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <div className="loading" />
    </div>
  );

  const pct = (v: number, max: number) => Math.min(100, (v / max) * 100);
  const proteinPct  = pct(data.proteinToday, 200);
  const calPct      = pct(data.caloriestoday, 2300);
  const carbsPct    = pct(data.carbsToday, 250);
  const workoutPct  = pct(data.workoutsThisWeek, 5);
  const bodyFatPct  = data.bodyFatPercent ? pct(data.bodyFatPercent, 30) : 0;
  const weightPct   = data.weightKg && data.targetWeightKg
    ? Math.min(100, (Math.min(data.weightKg, data.targetWeightKg) / Math.max(data.weightKg, data.targetWeightKg)) * 100)
    : 0;

  const todayStr = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">FitLife<span>.</span></div>
        <nav className="sidebar-nav">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              className={`nav-item${activeTab === id ? " active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <span className="nav-dot" />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-secondary btn-full" onClick={handleLogOut}>Log Out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="page-eyebrow">Overview</p>
            <h1 className="page-title">Hola, {data.userName}</h1>
          </div>
          <span className="page-date">{todayStr}</span>
        </div>

        {/* Stat cards */}
        <div className="stats-grid">
          <StatCard label="Proteína"      value={`${Math.round(data.proteinToday)}`}  unit="g"    meta="de 200g"                              pct={proteinPct}  color="var(--accent)" />
          <StatCard label="Calorías"      value={`${Math.round(data.caloriestoday)}`} unit="kcal" meta="de 2300"                              pct={calPct}      color="var(--accent)" />
          <StatCard label="Carbohidratos" value={`${Math.round(data.carbsToday)}`}    unit="g"    meta="de 250g"                              pct={carbsPct}    color="var(--amber)"  />
          <StatCard label="Entrenamientos" value={`${data.workoutsThisWeek}`}          unit="/5"   meta="esta semana"                          pct={workoutPct}  color="var(--accent)" />
          <StatCard label="Grasa Corporal" value={data.bodyFatPercent ? `${data.bodyFatPercent}` : "--"} unit="%" meta="meta: 9%"            pct={bodyFatPct}  color="var(--coral)"  />
          <StatCard label="Peso"           value={data.weightKg ? `${data.weightKg}` : "--"} unit="kg" meta={data.targetWeightKg ? `meta: ${data.targetWeightKg} kg` : "sin meta"} pct={weightPct} color="var(--amber)" />
        </div>

        {/* Tab content */}
        {activeTab === "dashboard"    && <WelcomePanel />}
        {activeTab === "nutrition"    && <NutritionTab userId={userId} />}
        {activeTab === "workout"      && <WorkoutTab userId={userId} />}
        {activeTab === "measurements" && <MeasurementsTab userId={userId} />}
        {activeTab === "progress"     && <ProgressTab userId={userId} />}
        {activeTab === "recovery"     && <RecoveryTab />}
      </main>
    </div>
  );
}

/* ── Stat card ───────────────────────────────── */

function StatCard({ label, value, unit, meta, pct, color }: {
  label: string; value: string; unit: string; meta: string; pct: number; color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-row">
        <span className="stat-value">{value}</span>
        <span className="stat-unit">{unit}</span>
      </div>
      <div className="stat-meta">{meta}</div>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── Welcome panel ───────────────────────────── */

function WelcomePanel() {
  return (
    <div className="content-card">
      <h3 className="card-title">Bienvenido</h3>
      <p style={{ color: "var(--muted)", fontSize: "14px" }}>
        Selecciona una sección en la barra lateral para registrar tu progreso.
      </p>
    </div>
  );
}

/* ── Nutrition tab ───────────────────────────── */

function NutritionTab({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleParse = async () => {
    if (!input.trim()) { setError("Ingresa lo que comiste"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/parse-nutrition", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      if (result.questions?.length) { setError(`Clarifica: ${result.questions.join(", ")}`); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const { error: dbErr } = await supabase.from("nutrition_logs").insert({
        user_id: session.user.id, date: today, raw_input: input,
        protein_g: result.macros.protein_g, carbs_g: result.macros.carbs_g,
        fat_g: result.macros.fat_g, calories: result.macros.calories,
      });
      if (dbErr) throw dbErr;
      setSuccess(`P ${result.macros.protein_g}g · C ${result.macros.carbs_g}g · G ${result.macros.fat_g}g · ${Math.round(result.macros.calories)} kcal`);
      setInput("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="content-card">
      <h3 className="card-title">Registrar Nutrición</h3>
      <div className="form-group">
        <label>¿Qué comiste?</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe tu comida..." style={{ minHeight: "100px" }} />
      </div>
      <button onClick={handleParse} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Analizando..." : "Parsear con IA"}
      </button>
      {error   && <div className="error" style={{ marginTop: "8px" }}>{error}</div>}
      {success && <div className="success-banner">{success}</div>}
    </div>
  );
}

/* ── Workout tab ─────────────────────────────── */

function WorkoutTab({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleParse = async () => {
    if (!input.trim()) { setError("Ingresa tu entrenamiento"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/parse-workout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      if (result.questions?.length) { setError(`Clarifica: ${result.questions.join(", ")}`); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const { error: dbErr } = await supabase.from("workout_logs").insert({
        user_id: session.user.id, date: today, raw_input: input,
        exercises: result.exercises, duration_minutes: result.duration_minutes,
      });
      if (dbErr) throw dbErr;
      setSuccess(result.exercises.map((e: any) => e.name).join(" · "));
      setInput("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="content-card">
      <h3 className="card-title">Registrar Entrenamiento</h3>
      <div className="form-group">
        <label>¿Qué ejercicios hiciste?</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe tu entrenamiento..." style={{ minHeight: "100px" }} />
      </div>
      <button onClick={handleParse} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Analizando..." : "Parsear con IA"}
      </button>
      {error   && <div className="error" style={{ marginTop: "8px" }}>{error}</div>}
      {success && <div className="success-banner">{success}</div>}
    </div>
  );
}

/* ── Measurements tab ────────────────────────── */

function MeasurementsTab({ userId }: { userId: string }) {
  const [weight, setWeight]   = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [recent, setRecent]   = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("measurements").select("*")
        .eq("user_id", session.user.id).order("date", { ascending: false }).limit(7);
      setRecent(data || []);
    } catch (e) { console.error(e); } finally { setLoadingRecent(false); }
  };

  useEffect(() => { loadRecent(); }, []);

  const handleSave = async () => {
    if (!weight && !bodyFat) { setError("Ingresa al menos una medida"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const payload: any = { user_id: session.user.id, date: today };
      if (weight)  payload.weight_kg = parseFloat(weight);
      if (bodyFat) payload.body_fat_percent = parseFloat(bodyFat);
      const { error: dbErr } = await supabase.from("measurements").insert(payload);
      if (dbErr) throw dbErr;
      const parts: string[] = [];
      if (weight)  parts.push(`Peso ${weight} kg`);
      if (bodyFat) parts.push(`Grasa ${bodyFat}%`);
      setSuccess(parts.join(" · "));
      setWeight(""); setBodyFat("");
      loadRecent();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="content-card">
      <h3 className="card-title">Registrar Medidas</h3>
      <div className="form-grid-2">
        <div className="form-group" style={{ margin: 0 }}>
          <label>Peso (kg)</label>
          <input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="82.5" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Grasa corporal (%)</label>
          <input type="number" step="0.1" min="0" max="100" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="14.2" />
        </div>
      </div>
      <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Guardando..." : "Guardar"}
      </button>
      {error   && <div className="error" style={{ marginBottom: "10px" }}>{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="section-label">Últimas 7 entradas</div>
      {loadingRecent
        ? <div className="loading-center"><div className="loading" /></div>
        : recent.length === 0
          ? <p className="empty-state">No hay medidas registradas.</p>
          : (
            <table className="data-table">
              <thead><tr>
                <th>Fecha</th><th>Peso (kg)</th><th>Grasa (%)</th>
              </tr></thead>
              <tbody>{recent.map((m, i) => (
                <tr key={i}>
                  <td>{m.date}</td>
                  <td>{m.weight_kg ?? "--"}</td>
                  <td>{m.body_fat_percent ?? "--"}</td>
                </tr>
              ))}</tbody>
            </table>
          )
      }
    </div>
  );
}

/* ── Progress tab ────────────────────────────── */

function ProgressTab({ userId }: { userId: string }) {
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch("/api/get-progress", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="content-card">
      <div className="loading-center"><div className="loading" /></div>
    </div>
  );

  return (
    <div className="content-card">
      <h3 className="card-title">Tu Progreso</h3>
      <div className="section-label">Peso y Grasa Corporal</div>
      <div style={{ marginBottom: "32px" }}>
        <ProgressChart data={data?.chartData || []} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
        <div style={{ background: "var(--s2)", padding: "18px 20px", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "8px" }}>Entrenamientos</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "32px", fontWeight: 600, letterSpacing: "-1px", color: "var(--text)" }}>{data?.workoutCount || 0}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Recovery tab ────────────────────────────── */

function RecoveryTab() {
  const [hours, setHours]     = useState("");
  const [quality, setQuality] = useState("");
  const [notes, setNotes]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [recent, setRecent]   = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("sleep_logs").select("*")
        .eq("user_id", session.user.id).order("date", { ascending: false }).limit(7);
      setRecent(data || []);
    } catch (e) { console.error(e); } finally { setLoadingRecent(false); }
  };

  useEffect(() => { loadRecent(); }, []);

  const handleSave = async () => {
    if (!hours) { setError("Ingresa las horas dormidas"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const payload: any = { user_id: session.user.id, date: today, hours_slept: parseFloat(hours) };
      if (quality) payload.quality = parseInt(quality);
      if (notes.trim()) payload.notes = notes.trim();
      const { error: dbErr } = await supabase.from("sleep_logs").insert(payload);
      if (dbErr) throw dbErr;
      const parts = [`${hours}h`];
      if (quality) parts.push(`Calidad ${quality}/5`);
      setSuccess(parts.join(" · "));
      setHours(""); setQuality(""); setNotes("");
      loadRecent();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const qlabel = (q: number) => ["","Muy malo","Malo","Regular","Bueno","Excelente"][q] ?? "--";

  return (
    <div className="content-card">
      <h3 className="card-title">Registrar Sueño</h3>
      <div className="form-grid-2">
        <div className="form-group" style={{ margin: 0 }}>
          <label>Horas dormidas</label>
          <input type="number" step="0.5" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="7.5" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Calidad (1–5)</label>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            <option value="">— Seleccionar —</option>
            <option value="1">1 – Muy malo</option>
            <option value="2">2 – Malo</option>
            <option value="3">3 – Regular</option>
            <option value="4">4 – Bueno</option>
            <option value="5">5 – Excelente</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Notas (opcional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ej. me desperté varias veces..." style={{ minHeight: "70px" }} />
      </div>
      <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Guardando..." : "Guardar"}
      </button>
      {error   && <div className="error" style={{ marginBottom: "10px" }}>{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="section-label">Últimas 7 entradas</div>
      {loadingRecent
        ? <div className="loading-center"><div className="loading" /></div>
        : recent.length === 0
          ? <p className="empty-state">No hay registros de sueño.</p>
          : (
            <table className="data-table">
              <thead><tr>
                <th>Fecha</th><th>Horas</th><th>Calidad</th><th>Notas</th>
              </tr></thead>
              <tbody>{recent.map((s, i) => (
                <tr key={i}>
                  <td>{s.date}</td>
                  <td>{s.hours_slept ?? "--"}</td>
                  <td>{s.quality ? qlabel(s.quality) : "--"}</td>
                  <td style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.notes || ""}</td>
                </tr>
              ))}</tbody>
            </table>
          )
      }
    </div>
  );
}
