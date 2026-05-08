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

const INNER_TABS = ["Nutrition", "Workout", "Measurements", "Progress", "Recovery"];

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    userName: "User", proteinToday: 0, caloriestoday: 0, carbsToday: 0,
    workoutsThisWeek: 0, bodyFatPercent: null, weightKg: null, targetWeightKg: null,
  });
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("Nutrition");
  const [userId, setUserId]     = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/auth/login"); return; }
        setUserId(session.user.id);

        const { data: profile } = await supabase.from("user_profiles").select("*")
          .eq("user_id", session.user.id).single();
        const userName = profile?.name || session.user.email?.split("@")[0] || "User";

        const today = new Date().toISOString().split("T")[0];
        const { data: nutrition } = await supabase.from("nutrition_logs").select("*")
          .eq("user_id", session.user.id).eq("date", today);

        let proteinToday = 0, caloriestoday = 0, carbsToday = 0;
        if (nutrition?.length) {
          proteinToday  = nutrition.reduce((s, l) => s + (l.protein_g || 0), 0);
          caloriestoday = nutrition.reduce((s, l) => s + (l.calories   || 0), 0);
          carbsToday    = nutrition.reduce((s, l) => s + (l.carbs_g    || 0), 0);
        }

        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: workoutsWeek } = await supabase.from("workout_logs").select("date")
          .eq("user_id", session.user.id).gte("date", weekAgo.toISOString().split("T")[0]);
        const workoutsThisWeek = workoutsWeek?.length || 0;

        const { data: measurements } = await supabase.from("measurements").select("*")
          .eq("user_id", session.user.id).order("date", { ascending: false }).limit(1);

        let bodyFatPercent: number | null = null;
        let weightKg: number | null = null;
        const targetWeightKg: number | null = profile?.target_weight_kg || null;
        if (measurements?.length) {
          const m = measurements[0];
          if (m.body_fat_percent) bodyFatPercent = m.body_fat_percent;
          if (m.weight_kg)        weightKg = m.weight_kg;
        }

        setData({ userName, proteinToday, caloriestoday, carbsToday, workoutsThisWeek,
          bodyFatPercent, weightKg, targetWeightKg });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    loadData();
  }, [router]);

  if (loading) return (
    <div className="loading-center" style={{ minHeight: "60vh" }}>
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
    <>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Overview</p>
          <h1 className="page-title">Hola, {data.userName}</h1>
        </div>
        <span className="page-date">{todayStr}</span>
      </div>

      <div className="stats-grid">
        <StatCard label="Proteína"       value={`${Math.round(data.proteinToday)}`}  unit="g"    meta="de 200g"    pct={proteinPct}  color="var(--accent)" />
        <StatCard label="Calorías"       value={`${Math.round(data.caloriestoday)}`} unit="kcal" meta="de 2300"    pct={calPct}      color="var(--accent)" />
        <StatCard label="Carbohidratos"  value={`${Math.round(data.carbsToday)}`}    unit="g"    meta="de 250g"    pct={carbsPct}    color="var(--amber)"  />
        <StatCard label="Entrenos"        value={`${data.workoutsThisWeek}`}           unit="/5"   meta="esta semana" pct={workoutPct}  color="var(--accent)" />
        <StatCard label="Grasa Corporal"
          value={data.bodyFatPercent ? `${data.bodyFatPercent}` : "--"} unit="%"
          meta="meta: 9%" pct={bodyFatPct} color="var(--coral)" />
        <StatCard label="Peso"
          value={data.weightKg ? `${data.weightKg}` : "--"} unit="kg"
          meta={data.targetWeightKg ? `meta: ${data.targetWeightKg} kg` : "sin meta"}
          pct={weightPct} color="var(--amber)" />
      </div>

      {/* Inner tab bar */}
      <div className="tab-bar">
        {INNER_TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? " active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Nutrition"    && <NutritionTab userId={userId} />}
      {activeTab === "Workout"      && <WorkoutTab userId={userId} />}
      {activeTab === "Measurements" && <MeasurementsTab userId={userId} />}
      {activeTab === "Progress"     && <ProgressTab userId={userId} />}
      {activeTab === "Recovery"     && <RecoveryTab />}
    </>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

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

// ── Nutrition tab ─────────────────────────────────────────────────────────────

function NutritionTab({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) { setError("Ingresa lo que comiste"); return; }
    setLoading(true); setError(""); setSuccess(""); setAssumptions([]); setShowAssumptions(false);
    try {
      const res = await fetch("/api/parse-nutrition", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const { error: dbErr } = await supabase.from("nutrition_logs").insert({
        user_id: session.user.id, date: today, raw_input: input,
        protein_g: result.macros.protein_g, carbs_g: result.macros.carbs_g,
        fat_g: result.macros.fat_g, calories: result.macros.calories,
      });
      if (dbErr) throw dbErr;
      setSuccess(`✅ Guardado! P: ${result.macros.protein_g}g | C: ${result.macros.carbs_g}g | G: ${result.macros.fat_g}g | ${Math.round(result.macros.calories)} kcal`);
      setAssumptions(result.assumptions || []);
      setInput("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="content-card">
      <h3 className="card-title">Registrar Nutrición</h3>
      <div className="form-group">
        <label>¿Qué comiste?</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Describe tu comida..." style={{ minHeight: "96px" }} />
      </div>
      <button onClick={handleParse} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Analizando..." : "Parsear con IA"}
      </button>
      {error && <div className="error">{error}</div>}
      {success && (
        <div className="success-banner">
          {success}
          {assumptions.length > 0 && (
            <>
              {"\n"}
              <button
                onClick={() => setShowAssumptions(p => !p)}
                style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "11px", cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                📝 {showAssumptions ? "Ocultar" : "Ver"} asunciones ({assumptions.length})
              </button>
              {showAssumptions && (
                <div style={{ marginTop: "8px", opacity: 0.8 }}>
                  {assumptions.map((a, i) => <div key={i}>· {a}</div>)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Workout tab ───────────────────────────────────────────────────────────────

function formatExerciseLine(ex: any): string {
  const sets: any[] = ex.sets || [];
  if (!sets.length) return ex.name;
  const unit = sets[0]?.unit || "lbs";
  const weight = sets[0]?.weight > 0 ? ` @ ${sets[0].weight}${unit}` : "";
  const allSameReps = sets.every((s: any) => s.reps === sets[0].reps);
  const repStr = allSameReps ? `${sets.length}×${sets[0].reps}` : sets.map((s: any) => s.reps).join(", ") + " reps";
  return `${ex.name}: ${repStr}${weight}`;
}

function WorkoutTab({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) { setError("Ingresa tu entrenamiento"); return; }
    setLoading(true); setError(""); setSuccess(""); setAssumptions([]); setShowAssumptions(false);
    try {
      const res = await fetch("/api/parse-workout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const { error: dbErr } = await supabase.from("workout_logs").insert({
        user_id: session.user.id, date: today, raw_input: input,
        exercises: result.exercises, duration_minutes: result.duration_minutes,
      });
      if (dbErr) throw dbErr;
      const lines = (result.exercises || []).map((e: any) => `- ${formatExerciseLine(e)}`).join("\n");
      setSuccess(`✅ Entrenamiento guardado!\n${lines}`);
      setAssumptions(result.assumptions || []);
      setInput("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="content-card">
      <h3 className="card-title">Registrar Entrenamiento</h3>
      <div className="form-group">
        <label>¿Qué ejercicios hiciste?</label>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Describe tu entrenamiento..." style={{ minHeight: "96px" }} />
      </div>
      <button onClick={handleParse} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Analizando..." : "Parsear con IA"}
      </button>
      {error && <div className="error">{error}</div>}
      {success && (
        <div className="success-banner">
          {success}
          {assumptions.length > 0 && (
            <>
              {"\n"}
              <button
                onClick={() => setShowAssumptions(p => !p)}
                style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "11px", cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                📝 {showAssumptions ? "Ocultar" : "Ver"} asunciones ({assumptions.length})
              </button>
              {showAssumptions && (
                <div style={{ marginTop: "8px", opacity: 0.8 }}>
                  {assumptions.map((a, i) => <div key={i}>· {a}</div>)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Measurements tab ──────────────────────────────────────────────────────────

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
      setWeight(""); setBodyFat(""); loadRecent();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="content-card">
      <h3 className="card-title">Registrar Medidas</h3>
      <div className="form-grid-2">
        <div className="form-group" style={{ margin: 0 }}>
          <label>Peso (kg)</label>
          <input type="number" step="0.1" min="0" value={weight} onChange={e => setWeight(e.target.value)} placeholder="82.5" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Grasa corporal (%)</label>
          <input type="number" step="0.1" min="0" max="100" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="14.2" />
        </div>
      </div>
      <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ marginTop: "16px", marginBottom: "16px" }}>
        {loading ? "Guardando..." : "Guardar"}
      </button>
      {error   && <div className="error" style={{ marginBottom: "10px" }}>{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      <div className="section-label">Últimas 7 entradas</div>
      {loadingRecent
        ? <div className="loading-center"><div className="loading" /></div>
        : recent.length === 0 ? <p className="empty-state">No hay medidas registradas.</p>
        : (
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Peso (kg)</th><th>Grasa (%)</th></tr></thead>
            <tbody>{recent.map((m, i) => (
              <tr key={i}>
                <td>{m.date}</td><td>{m.weight_kg ?? "--"}</td><td>{m.body_fat_percent ?? "--"}</td>
              </tr>
            ))}</tbody>
          </table>
        )
      }
    </div>
  );
}

// ── Progress tab ──────────────────────────────────────────────────────────────

function ProgressTab({ userId }: { userId: string }) {
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch("/api/get-body", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="content-card"><div className="loading-center"><div className="loading" /></div></div>;

  const measurements: any[] = data?.measurements || [];
  const latest = data?.latest;
  const changes = data?.changes;

  const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <div className="content-card" style={{ marginBottom: "20px" }}>
        <h3 className="card-title">Peso y Grasa Corporal</h3>
        <ProgressChart data={data?.chartData || []} />
        {latest && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginTop: "20px" }}>
            {latest.weight  != null && <MiniStat label="Último peso"  value={`${latest.weight} kg`} />}
            {latest.bodyFat != null && <MiniStat label="Último BF%"   value={`${latest.bodyFat}%`} />}
            {changes?.weightChange != null && <MiniStat label="Δ Peso" value={`${changes.weightChange > 0 ? "+" : ""}${changes.weightChange} kg`} />}
          </div>
        )}
      </div>

      {measurements.length > 0 && (
        <div className="content-card">
          <h3 className="card-title">Todas las medidas</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Peso</th><th>Grasa</th><th>Pecho</th>
                  <th>Cintura</th><th>Brazos</th><th>Muslo</th>
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().map((m: any) => (
                  <tr key={m.id}>
                    <td style={{ color: "var(--text)" }}>{fmtDate(m.date)}</td>
                    <td>{m.weight_kg       ? `${m.weight_kg} kg`  : "--"}</td>
                    <td>{m.body_fat_percent ? `${m.body_fat_percent}%` : "--"}</td>
                    <td>{m.chest_cm        ? `${m.chest_cm}cm`   : "--"}</td>
                    <td>{m.waist_cm        ? `${m.waist_cm}cm`   : "--"}</td>
                    <td>{m.arm_left_cm     ? `${m.arm_left_cm}/${m.arm_right_cm ?? "?"}cm` : "--"}</td>
                    <td>{m.thigh_cm        ? `${m.thigh_cm}cm`   : "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {measurements.length === 0 && (
        <div className="content-card">
          <p className="empty-state">Sin medidas todavía. Ve a <strong>Body</strong> para registrar tus primeras medidas.</p>
        </div>
      )}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--s2)", padding: "16px 18px", borderRadius: "var(--r-lg)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: "28px", fontWeight: 600, letterSpacing: "-1px", color: "var(--text)" }}>{value}</div>
    </div>
  );
}

// ── Recovery tab ──────────────────────────────────────────────────────────────

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
      const parts = [`${hours}h`]; if (quality) parts.push(`Calidad ${quality}/5`);
      setSuccess(parts.join(" · ")); setHours(""); setQuality(""); setNotes(""); loadRecent();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const qlabel = (q: number) => ["","Muy malo","Malo","Regular","Bueno","Excelente"][q] ?? "--";

  return (
    <div className="content-card">
      <h3 className="card-title">Registrar Sueño</h3>
      <div className="form-grid-2">
        <div className="form-group" style={{ margin: 0 }}>
          <label>Horas dormidas</label>
          <input type="number" step="0.5" min="0" max="24" value={hours} onChange={e => setHours(e.target.value)} placeholder="7.5" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Calidad (1–5)</label>
          <select value={quality} onChange={e => setQuality(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} – {qlabel(n)}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group" style={{ marginTop: "16px" }}>
        <label>Notas (opcional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ej. me desperté varias veces..." style={{ minHeight: "70px" }} />
      </div>
      <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Guardando..." : "Guardar"}
      </button>
      {error   && <div className="error" style={{ marginBottom: "10px" }}>{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      <div className="section-label">Últimas 7 entradas</div>
      {loadingRecent ? <div className="loading-center"><div className="loading" /></div>
        : recent.length === 0 ? <p className="empty-state">No hay registros de sueño.</p>
        : (
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Horas</th><th>Calidad</th><th>Notas</th></tr></thead>
            <tbody>{recent.map((s, i) => (
              <tr key={i}>
                <td>{s.date}</td><td>{s.hours_slept ?? "--"}</td>
                <td>{s.quality ? qlabel(s.quality) : "--"}</td>
                <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.notes || ""}</td>
              </tr>
            ))}</tbody>
          </table>
        )
      }
    </div>
  );
}
