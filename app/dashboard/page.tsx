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
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", session.user.id).single();
        const userName = profile?.name || session.user.email?.split("@")[0] || "User";
        const today = new Date().toISOString().split("T")[0];
        const { data: nutritionToday } = await supabase.from("nutrition_logs").select("*").eq("user_id", session.user.id).eq("date", today);
        let proteinToday = 0, caloriestoday = 0, carbsToday = 0;
        if (nutritionToday && nutritionToday.length > 0) {
          proteinToday = nutritionToday.reduce((sum, log) => sum + (log.protein_g || 0), 0);
          caloriestoday = nutritionToday.reduce((sum, log) => sum + (log.calories || 0), 0);
          carbsToday = nutritionToday.reduce((sum, log) => sum + (log.carbs_g || 0), 0);
        }
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: workoutsWeek } = await supabase.from("workout_logs").select("*").eq("user_id", session.user.id).gte("date", weekAgo.toISOString().split("T")[0]);
        const workoutsThisWeek = workoutsWeek?.length || 0;
        const { data: measurements } = await supabase.from("measurements").select("*").eq("user_id", session.user.id).order("date", { ascending: false }).limit(1);
        let bodyFatPercent: number | null = null;
        let weightKg: number | null = null;
        const targetWeightKg: number | null = profile?.target_weight_kg || null;
        if (measurements && measurements.length > 0) {
          const latest = measurements[0];
          if (latest.body_fat_percent) bodyFatPercent = latest.body_fat_percent;
          if (latest.weight_kg) weightKg = latest.weight_kg;
        }
        setData({ userName, proteinToday, caloriestoday, carbsToday, workoutsThisWeek, bodyFatPercent, weightKg, targetWeightKg });
        setLoading(false);
      } catch (error) { console.error("Error loading dashboard:", error); setLoading(false); }
    };
    loadData();
  }, [router]);

  const handleLogOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#0a0a0a" }}>
      <div className="loading" />
    </div>
  );

  const proteinPct  = Math.min(100, (data.proteinToday / 200) * 100);
  const calPct      = Math.min(100, (data.caloriestoday / 2300) * 100);
  const carbsPct    = Math.min(100, (data.carbsToday / 250) * 100);
  const workoutPct  = Math.min(100, (data.workoutsThisWeek / 5) * 100);
  const bodyFatPct  = data.bodyFatPercent ? Math.min(100, (data.bodyFatPercent / 30) * 100) : 0;
  const weightPct   = data.weightKg && data.targetWeightKg
    ? Math.min(100, (Math.min(data.weightKg, data.targetWeightKg) / Math.max(data.weightKg, data.targetWeightKg)) * 100)
    : 0;

  const tabs = ["dashboard", "nutrition", "workout", "measurements", "progress", "recovery"];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <header style={{ borderBottom: "1px solid #141414", padding: "18px 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.3px", color: "#fff" }}>
            FitLife<span style={{ color: "#00ff88" }}>.</span>
          </span>
          <button className="btn btn-secondary" onClick={handleLogOut}>Log Out</button>
        </div>
      </header>

      <div className="container" style={{ paddingTop: "48px", paddingBottom: "60px" }}>
        <div style={{ marginBottom: "40px" }}>
          <p style={{ color: "#333", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "8px" }}>Hoy</p>
          <h2 style={{ color: "#fff", fontSize: "26px", fontWeight: 600, letterSpacing: "-0.5px" }}>Hola, {data.userName}</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "48px" }}>
          <RingCard label="Proteína"  value={`${Math.round(data.proteinToday)}g`}     subtext="/ 200g"    percent={proteinPct} />
          <RingCard label="Calorías"  value={`${Math.round(data.caloriestoday)}`}      subtext="/ 2300"    percent={calPct} />
          <RingCard label="Carbos"    value={`${Math.round(data.carbsToday)}g`}        subtext="/ 250g"    percent={carbsPct} />
          <RingCard label="Entrenos"  value={`${data.workoutsThisWeek}/5`}             subtext="semana"    percent={workoutPct} />
          <RingCard label="Grasa"     value={data.bodyFatPercent ? `${data.bodyFatPercent}%` : "--"} subtext="meta: 9%"  percent={bodyFatPct} />
          <RingCard label="Peso"      value={data.weightKg ? `${data.weightKg}` : "--"} subtext={data.targetWeightKg ? `/ ${data.targetWeightKg} kg` : "kg"} percent={weightPct} />
        </div>

        <div style={{ display: "flex", marginBottom: "32px", borderBottom: "1px solid #141414", overflowX: "auto" }}>
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: "none", border: "none", fontSize: "13px", fontWeight: 500,
              color: activeTab === tab ? "#00ff88" : "#444",
              borderBottom: activeTab === tab ? "2px solid #00ff88" : "2px solid transparent",
              padding: "12px 16px", cursor: "pointer", whiteSpace: "nowrap",
              letterSpacing: "0.02em", transition: "color 0.15s", marginBottom: "-1px",
            }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "dashboard"    && <WelcomePanel />}
        {activeTab === "nutrition"    && <NutritionTab userId={userId} />}
        {activeTab === "workout"      && <WorkoutTab userId={userId} />}
        {activeTab === "measurements" && <MeasurementsTab userId={userId} />}
        {activeTab === "progress"     && <ProgressTab userId={userId} />}
        {activeTab === "recovery"     && <RecoveryTab />}
      </div>
    </div>
  );
}

function RingCard({ label, value, subtext, percent }: { label: string; value: string; subtext: string; percent: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#111", padding: "20px 8px 16px", borderRadius: "16px", border: "1px solid #1a1a1a" }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ marginBottom: "10px" }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1a1a1a" strokeWidth="4" />
        <circle cx="44" cy="44" r={r} fill="none" stroke="#00ff88" strokeWidth="4"
          strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
          strokeLinecap="round" transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="44" y="41" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif">{value}</text>
        <text x="44" y="55" textAnchor="middle" fill="#444"    fontSize="8"  fontFamily="Inter, sans-serif">{subtext}</text>
      </svg>
      <div style={{ color: "#555", fontSize: "10px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function WelcomePanel() {
  return (
    <div style={{ background: "#111", padding: "40px", borderRadius: "16px", border: "1px solid #1a1a1a" }}>
      <p style={{ color: "#333", fontSize: "14px" }}>Selecciona una pestaña para registrar tu progreso.</p>
    </div>
  );
}

function NutritionTab({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleParse = async () => {
    if (!input.trim()) { setError("Enter food info"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/parse-nutrition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.questions?.length) { setError(`Clarifica: ${result.questions.join(", ")}`); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const { error: dbError } = await supabase.from("nutrition_logs").insert({ user_id: session.user.id, date: today, raw_input: input, protein_g: result.macros.protein_g, carbs_g: result.macros.carbs_g, fat_g: result.macros.fat_g, calories: result.macros.calories });
      if (dbError) throw dbError;
      setSuccess(`Guardado — P: ${result.macros.protein_g}g · C: ${result.macros.carbs_g}g · G: ${result.macros.fat_g}g · ${Math.round(result.macros.calories)} kcal`);
      setInput("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ background: "#111", padding: "30px", borderRadius: "16px", border: "1px solid #1a1a1a" }}>
      <h3 style={{ color: "#fff", marginBottom: "24px", fontWeight: 600, fontSize: "17px" }}>Registrar Nutrición</h3>
      <div className="form-group">
        <label>¿Qué comiste?</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe tu comida..." style={{ minHeight: "100px" }} />
      </div>
      <button onClick={handleParse} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Analizando..." : "Parsear con IA"}
      </button>
      {error   && <div className="error" style={{ marginBottom: "12px" }}>{error}</div>}
      {success && <SuccessBanner msg={success} />}
    </div>
  );
}

function WorkoutTab({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleParse = async () => {
    if (!input.trim()) { setError("Enter workout info"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/parse-workout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.questions?.length) { setError(`Clarifica: ${result.questions.join(", ")}`); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const { error: dbError } = await supabase.from("workout_logs").insert({ user_id: session.user.id, date: today, raw_input: input, exercises: result.exercises, duration_minutes: result.duration_minutes });
      if (dbError) throw dbError;
      setSuccess(`Guardado — ${result.exercises.map((e: any) => e.name).join(" · ")}`);
      setInput("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ background: "#111", padding: "30px", borderRadius: "16px", border: "1px solid #1a1a1a" }}>
      <h3 style={{ color: "#fff", marginBottom: "24px", fontWeight: 600, fontSize: "17px" }}>Registrar Entrenamiento</h3>
      <div className="form-group">
        <label>¿Qué ejercicios hiciste?</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe tu entrenamiento..." style={{ minHeight: "100px" }} />
      </div>
      <button onClick={handleParse} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>
        {loading ? "Analizando..." : "Parsear con IA"}
      </button>
      {error   && <div className="error" style={{ marginBottom: "12px" }}>{error}</div>}
      {success && <SuccessBanner msg={success} />}
    </div>
  );
}

function MeasurementsTab({ userId }: { userId: string }) {
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recent, setRecent] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("measurements").select("*").eq("user_id", session.user.id).order("date", { ascending: false }).limit(7);
      setRecent(data || []);
    } catch (e) { console.error(e); } finally { setLoadingRecent(false); }
  };

  useEffect(() => { loadRecent(); }, []);

  const handleSave = async () => {
    if (!weight && !bodyFat) { setError("Enter at least one measurement"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const payload: any = { user_id: session.user.id, date: today };
      if (weight) payload.weight_kg = parseFloat(weight);
      if (bodyFat) payload.body_fat_percent = parseFloat(bodyFat);
      const { error: dbError } = await supabase.from("measurements").insert(payload);
      if (dbError) throw dbError;
      const parts = [];
      if (weight) parts.push(`Peso: ${weight} kg`);
      if (bodyFat) parts.push(`Grasa: ${bodyFat}%`);
      setSuccess(`Guardado — ${parts.join(" · ")}`);
      setWeight(""); setBodyFat("");
      loadRecent();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ background: "#111", padding: "30px", borderRadius: "16px", border: "1px solid #1a1a1a" }}>
      <h3 style={{ color: "#fff", marginBottom: "24px", fontWeight: 600, fontSize: "17px" }}>Registrar Medidas</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Peso (kg)</label>
          <input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="82.5" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Grasa corporal (%)</label>
          <input type="number" step="0.1" min="0" max="100" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="14.2" />
        </div>
      </div>
      <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ marginTop: "16px", marginBottom: "16px" }}>
        {loading ? "Guardando..." : "Guardar"}
      </button>
      {error   && <div className="error" style={{ marginBottom: "12px" }}>{error}</div>}
      {success && <SuccessBanner msg={success} />}
      <SectionLabel>Últimas 7 entradas</SectionLabel>
      {loadingRecent ? <div className="loading" /> : recent.length === 0
        ? <Empty msg="No hay medidas registradas." />
        : (
          <DarkTable headers={["Fecha", "Peso (kg)", "Grasa (%)"]}>
            {recent.map((m, i) => (
              <tr key={i}>
                <td style={tdStyle}>{m.date}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{m.weight_kg ?? "--"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{m.body_fat_percent ?? "--"}</td>
              </tr>
            ))}
          </DarkTable>
        )
      }
    </div>
  );
}

function ProgressTab({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const response = await fetch("/api/get-progress", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (response.ok) setData(await response.json());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div style={{ background: "#111", padding: "40px", borderRadius: "16px", border: "1px solid #1a1a1a", textAlign: "center" }}>
      <div className="loading" />
    </div>
  );

  return (
    <div style={{ background: "#111", padding: "30px", borderRadius: "16px", border: "1px solid #1a1a1a" }}>
      <h3 style={{ color: "#fff", marginBottom: "24px", fontWeight: 600, fontSize: "17px" }}>Tu Progreso</h3>
      <SectionLabel>Peso y Grasa Corporal</SectionLabel>
      <div style={{ marginBottom: "30px" }}>
        <ProgressChart data={data?.chartData || []} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
        <div style={{ background: "#0d0d0d", padding: "16px 20px", borderRadius: "12px", border: "1px solid #1a1a1a" }}>
          <div style={{ color: "#444", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Entrenamientos</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#fff" }}>{data?.workoutCount || 0}</div>
        </div>
      </div>
    </div>
  );
}

function RecoveryTab() {
  const [hours, setHours] = useState("");
  const [quality, setQuality] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recent, setRecent] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const loadRecent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("sleep_logs").select("*").eq("user_id", session.user.id).order("date", { ascending: false }).limit(7);
      setRecent(data || []);
    } catch (e) { console.error(e); } finally { setLoadingRecent(false); }
  };

  useEffect(() => { loadRecent(); }, []);

  const handleSave = async () => {
    if (!hours) { setError("Enter hours slept"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const payload: any = { user_id: session.user.id, date: today, hours_slept: parseFloat(hours) };
      if (quality) payload.quality = parseInt(quality);
      if (notes.trim()) payload.notes = notes.trim();
      const { error: dbError } = await supabase.from("sleep_logs").insert(payload);
      if (dbError) throw dbError;
      const parts = [`${hours}h`];
      if (quality) parts.push(`Calidad: ${quality}/5`);
      setSuccess(`Guardado — ${parts.join(" · ")}`);
      setHours(""); setQuality(""); setNotes("");
      loadRecent();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const qualityLabel = (q: number) => ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][q] ?? "--";

  return (
    <div style={{ background: "#111", padding: "30px", borderRadius: "16px", border: "1px solid #1a1a1a" }}>
      <h3 style={{ color: "#fff", marginBottom: "24px", fontWeight: 600, fontSize: "17px" }}>Registrar Sueño</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
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
      {error   && <div className="error" style={{ marginBottom: "12px" }}>{error}</div>}
      {success && <SuccessBanner msg={success} />}
      <SectionLabel>Últimas 7 entradas</SectionLabel>
      {loadingRecent ? <div className="loading" /> : recent.length === 0
        ? <Empty msg="No hay registros de sueño." />
        : (
          <DarkTable headers={["Fecha", "Horas", "Calidad", "Notas"]}>
            {recent.map((s, i) => (
              <tr key={i}>
                <td style={tdStyle}>{s.date}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{s.hours_slept ?? "--"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{s.quality ? qualityLabel(s.quality) : "--"}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: "#444", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.notes || ""}</td>
              </tr>
            ))}
          </DarkTable>
        )
      }
    </div>
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

const tdStyle: React.CSSProperties = { padding: "11px 0", fontSize: "13px", color: "#bbb", borderBottom: "1px solid #1a1a1a" };

function SuccessBanner({ msg }: { msg: string }) {
  return <div style={{ color: "#00ff88", background: "#071a0f", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>{msg}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#444", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: "24px 0 12px" }}>{children}</div>;
}

function Empty({ msg }: { msg: string }) {
  return <p style={{ color: "#333", fontSize: "14px" }}>{msg}</p>;
}

function DarkTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "8px 0", color: "#333", fontWeight: 500, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #1a1a1a" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
