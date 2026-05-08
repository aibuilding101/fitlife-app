"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ProgressChart } from "@/components/ProgressChart";

interface DashboardData {
  userName: string;
  proteinToday: number;
  caloriestoday: number;
  carbsToday: number;
  workoutsThisWeek: number;
  bodyFat: string;
  weightVsMeta: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    userName: "User",
    proteinToday: 0,
    caloriestoday: 0,
    carbsToday: 0,
    workoutsThisWeek: 0,
    bodyFat: "--",
    weightVsMeta: "--",
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
        const weekAgoStr = weekAgo.toISOString().split("T")[0];
        const { data: workoutsWeek } = await supabase.from("workout_logs").select("*").eq("user_id", session.user.id).gte("date", weekAgoStr);
        const workoutsThisWeek = workoutsWeek?.length || 0;
        const { data: measurements } = await supabase.from("measurements").select("*").eq("user_id", session.user.id).order("date", { ascending: false }).limit(1);
        let bodyFat = "--", weightVsMeta = "--";
        if (measurements && measurements.length > 0) {
          const latest = measurements[0];
          if (latest.body_fat_percent) bodyFat = `${latest.body_fat_percent}%`;
          if (latest.weight_kg && profile?.target_weight_kg) weightVsMeta = `${latest.weight_kg} / ${profile.target_weight_kg} kg`;
        }
        setData({ userName, proteinToday, caloriestoday, carbsToday, workoutsThisWeek, bodyFat, weightVsMeta });
        setLoading(false);
      } catch (error) { console.error("Error loading dashboard:", error); setLoading(false); }
    };
    loadData();
  }, [router]);

  const handleLogOut = async () => { await supabase.auth.signOut(); router.push("/"); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><div className="loading"></div></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <div style={{ background: "white", borderBottom: "1px solid #e0e0e0", padding: "20px" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>FitLife</h1>
          <button className="btn btn-secondary" onClick={handleLogOut}>Log Out</button>
        </div>
      </div>
      <div className="container" style={{ paddingTop: "40px" }}>
        <h2>Hola {data.userName}, aquí está tu progreso</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginTop: "30px", marginBottom: "40px" }}>
          <MetricCard label="Proteína hoy" value={`${data.proteinToday}g`} subtext="de 200g meta" />
          <MetricCard label="Calorías hoy" value={`${Math.round(data.caloriestoday)}`} subtext="de 2300 kcal" />
          <MetricCard label="Carbos hoy" value={`${data.carbsToday}g`} subtext="de 250g meta" />
          <MetricCard label="Entrenamientos" value={`${data.workoutsThisWeek}/5`} subtext="esta semana" />
          <MetricCard label="Grasa corporal" value={data.bodyFat} subtext="meta: 9%" />
          <MetricCard label="Peso vs Meta" value={data.weightVsMeta} subtext="kg" />
        </div>
        <div style={{ display: "flex", gap: "20px", marginBottom: "30px", borderBottom: "1px solid #e0e0e0", paddingBottom: "20px", overflowX: "auto" }}>
          {["dashboard", "nutrition", "workout", "measurements", "progress", "recovery"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", fontSize: "16px", fontWeight: activeTab === tab ? "bold" : "normal", color: activeTab === tab ? "#0066cc" : "#888", borderBottom: activeTab === tab ? "2px solid #0066cc" : "none", padding: "0 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {activeTab === "dashboard" && <div style={{ background: "white", padding: "40px", borderRadius: "8px" }}><p style={{ color: "#888" }}>Bienvenido a FitLife.</p></div>}
        {activeTab === "nutrition" && <NutritionTab userId={userId} />}
        {activeTab === "workout" && <WorkoutTab userId={userId} />}
        {activeTab === "measurements" && <MeasurementsTab userId={userId} />}
        {activeTab === "progress" && <ProgressTab userId={userId} />}
        {activeTab === "recovery" && <RecoveryTab />}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
    <div style={{ color: "#888", fontSize: "12px", marginBottom: "8px" }}>{label}</div>
    <div style={{ fontSize: "32px", fontWeight: "bold" }}>{value}</div>
    <div style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>{subtext}</div>
  </div>;
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
      setSuccess(`✅ Guardado! P: ${result.macros.protein_g}g | C: ${result.macros.carbs_g}g | G: ${result.macros.fat_g}g | ${Math.round(result.macros.calories)} kcal`);
      setInput("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
    <div className="form-group"><label>¿Qué comiste?</label><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe tu comida..." style={{ minHeight: "100px" }} /></div>
    <button onClick={handleParse} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>{loading ? "Analizando..." : "Parsear con IA"}</button>
    {error && <div className="error" style={{ marginBottom: "16px" }}>{error}</div>}
    {success && <div style={{ color: "#22863a", background: "#f6ffed", padding: "12px", borderRadius: "4px", marginBottom: "16px" }}>{success}</div>}
  </div>;
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
      const exerciseList = result.exercises.map((e: any) => `${e.name}`).join(" | ");
      setSuccess(`✅ Guardado! ${exerciseList}`);
      setInput("");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
    <div className="form-group"><label>¿Qué ejercicios hiciste?</label><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Describe tu entrenamiento..." style={{ minHeight: "100px" }} /></div>
    <button onClick={handleParse} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>{loading ? "Analizando..." : "Parsear con IA"}</button>
    {error && <div className="error" style={{ marginBottom: "16px" }}>{error}</div>}
    {success && <div style={{ color: "#22863a", background: "#f6ffed", padding: "12px", borderRadius: "4px" }}>{success}</div>}
  </div>;
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
  if (loading) return <div style={{ background: "white", padding: "40px", borderRadius: "8px", textAlign: "center" }}><div className="loading"></div></div>;
  return <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
    <h3>Tu Progreso</h3>
    <div style={{ marginBottom: "30px" }}><h4>Peso y Grasa Corporal</h4><ProgressChart data={data?.chartData || []} /></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" }}>
      <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "6px" }}><div style={{ color: "#888", fontSize: "12px" }}>Entrenamientos</div><div style={{ fontSize: "24px", fontWeight: "bold" }}>{data?.workoutCount || 0}</div></div>
    </div>
  </div>;
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
      setSuccess(`✅ Guardado! ${parts.join(" | ")}`);
      setWeight(""); setBodyFat("");
      loadRecent();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
    <h3 style={{ marginTop: 0, marginBottom: "24px" }}>Registrar Medidas</h3>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Peso (kg)</label>
        <input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ej. 82.5" />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label>Grasa corporal (%)</label>
        <input type="number" step="0.1" min="0" max="100" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="ej. 14.2" />
      </div>
    </div>
    <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ marginBottom: "16px" }}>{loading ? "Guardando..." : "Guardar"}</button>
    {error && <div className="error" style={{ marginBottom: "16px" }}>{error}</div>}
    {success && <div style={{ color: "#22863a", background: "#f6ffed", padding: "12px", borderRadius: "4px", marginBottom: "24px" }}>{success}</div>}
    <h4 style={{ marginBottom: "12px" }}>Últimas 7 entradas</h4>
    {loadingRecent ? <div className="loading"></div> : recent.length === 0 ? <p style={{ color: "#888" }}>No hay medidas registradas.</p> : (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead><tr style={{ borderBottom: "1px solid #e0e0e0" }}>
          <th style={{ textAlign: "left", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Fecha</th>
          <th style={{ textAlign: "right", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Peso (kg)</th>
          <th style={{ textAlign: "right", padding: "8px 0", color: "#888", fontWeight: "normal" }}>Grasa (%)</th>
        </tr></thead>
        <tbody>{recent.map((m, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
            <td style={{ padding: "10px 0" }}>{m.date}</td>
            <td style={{ textAlign: "right", padding: "10px 0" }}>{m.weight_kg ?? "--"}</td>
            <td style={{ textAlign: "right", padding: "10px 0" }}>{m.body_fat_percent ?? "--"}</td>
          </tr>
        ))}</tbody>
      </table>
    )}
  </div>;
}

function RecoveryTab() {
  return <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
    <h3>Recovery</h3>
    <p>Whoop integration coming soon...</p>
  </div>;
}
