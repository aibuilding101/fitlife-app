"use client";

import { useEffect, useState } from "react";
import { ProgressChart } from "@/components/ProgressChart";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/auth/login");
          return;
        }

        setUserId(session.user.id);

        // Get user profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        const userName = profile?.name || session.user.email?.split("@")[0] || "User";

        // Get nutrition logs for today
        const today = new Date().toISOString().split("T")[0];
        const { data: nutritionToday } = await supabase
          .from("nutrition_logs")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("date", today);

        let proteinToday = 0;
        let caloriestoday = 0;
        let carbsToday = 0;

        if (nutritionToday && nutritionToday.length > 0) {
          proteinToday = nutritionToday.reduce((sum, log) => sum + (log.protein_g || 0), 0);
          caloriestoday = nutritionToday.reduce((sum, log) => sum + (log.calories || 0), 0);
          carbsToday = nutritionToday.reduce((sum, log) => sum + (log.carbs_g || 0), 0);
        }

        // Get workouts this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split("T")[0];

        const { data: workoutsWeek } = await supabase
          .from("workout_logs")
          .select("*")
          .eq("user_id", session.user.id)
          .gte("date", weekAgoStr);

        const workoutsThisWeek = workoutsWeek?.length || 0;

        // Get latest measurement
        const { data: measurements } = await supabase
          .from("measurements")
          .select("*")
          .eq("user_id", session.user.id)
          .order("date", { ascending: false })
          .limit(1);

        let bodyFat = "--";
        let weightVsMeta = "--";

        if (measurements && measurements.length > 0) {
          const latest = measurements[0];
          if (latest.body_fat_percent) {
            bodyFat = `${latest.body_fat_percent}%`;
          }
          if (latest.weight_kg && profile?.target_weight_kg) {
            weightVsMeta = `${latest.weight_kg} / ${profile.target_weight_kg} kg`;
          }
        }

        setData({
          userName,
          proteinToday,
          caloriestoday,
          carbsToday,
          workoutsThisWeek,
          bodyFat,
          weightVsMeta,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e0e0e0", padding: "20px" }}>
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1>FitLife</h1>
          <button className="btn btn-secondary" onClick={handleLogOut}>
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container" style={{ paddingTop: "40px" }}>
        <h2>Hola {data.userName}, aquí está tu progreso</h2>

        {/* Metrics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginTop: "30px",
            marginBottom: "40px",
          }}
        >
          <MetricCard label="Proteína hoy" value={`${data.proteinToday}g`} subtext="de 200g meta" />
          <MetricCard label="Calorías hoy" value={`${Math.round(data.caloriestoday)}`} subtext="de 2300 kcal" />
          <MetricCard label="Carbos hoy" value={`${data.carbsToday}g`} subtext="de 250g meta" />
          <MetricCard label="Entrenamientos" value={`${data.workoutsThisWeek}/5`} subtext="esta semana" />
          <MetricCard label="Grasa corporal" value={data.bodyFat} subtext="meta: 9%" />
          <MetricCard label="Peso vs Meta" value={data.weightVsMeta} subtext="kg" />
        </div>

        {/* Tabs Navigation */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "30px",
            borderBottom: "1px solid #e0e0e0",
            paddingBottom: "20px",
            overflowX: "auto",
          }}
        >
          {["dashboard", "nutrition", "workout", "progress", "recovery"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                fontSize: "16px",
                fontWeight: activeTab === tab ? "bold" : "normal",
                color: activeTab === tab ? "#0066cc" : "#888",
                borderBottom: activeTab === tab ? "2px solid #0066cc" : "none",
                padding: "0 10px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "dashboard" && (
          <div style={{ background: "white", padding: "40px", borderRadius: "8px" }}>
            <p style={{ color: "#888" }}>Bienvenido a FitLife. Usa los tabs arriba para loguear tu nutrición y entrenamientos.</p>
          </div>
        )}

        {activeTab === "nutrition" && <NutritionTab userId={userId} />}
        
        {activeTab === "workout" && <WorkoutTab userId={userId} />}

        {activeTab === "progress" && <ProgressTab userId={userId} />}

        {activeTab === "recovery" && (
  <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
    <h3>Tu Recovery</h3>
    
    <div style={{ marginBottom: "30px", padding: "20px", background: "#f5f5f5", borderRadius: "8px", borderLeft: "4px solid #0066cc" }}>
      <h4 style={{ marginTop: 0 }}>Whoop Integration</h4>
      <p style={{ color: "#666", marginBottom: "15px" }}>
        Conecta tu Whoop para ver automáticamente tu Recovery Score, Strain y Sleep cada día.
      </p>
      <button className="btn btn-primary" disabled style={{ opacity: 0.6 }}>
        Coming Soon - Conectar Whoop
      </button>
    </div>

    <div style={{ marginBottom: "30px" }}>
      <h4>Tips de Recovery</h4>
      <ul style={{ color: "#666", lineHeight: "1.8" }}>
        <li>Duerme 7-9 horas cada noche</li>
        <li>Mantén una buena nutrición (proteína, carbos, grasas)</li>
        <li>Haz stretching después de entrenar</li>
        <li>Toma agua regularmente durante el día</li>
        <li>Descansa al menos 1 día a la semana</li>
      </ul>
    </div>

    <div style={{ padding: "20px", background: "#e8f4f8", borderRadius: "8px" }}>
      <p style={{ color: "#0066cc", marginTop: 0 }}>
        <strong>Fase 2:</strong> En las próximas semanas, integraremos Whoop para tracking automático de Recovery Score, Strain y Sleep.
      </p>
    </div>
  </div>
)}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ color: "#888", fontSize: "12px", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "32px", fontWeight: "bold" }}>{value}</div>
      <div style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>{subtext}</div>
    </div>
  );
}

function NutritionTab({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleParse = async () => {
    if (!input.trim()) {
      setError("Please enter food information");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/parse-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error parsing nutrition");
      }

      if (result.questions && result.questions.length > 0) {
        setError(`Por favor clarifica: ${result.questions.join(", ")}`);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const today = new Date().toISOString().split("T")[0];

      const { error: dbError } = await supabase
        .from("nutrition_logs")
        .insert({
          user_id: session.user.id,
          date: today,
          raw_input: input,
          protein_g: result.macros.protein_g,
          carbs_g: result.macros.carbs_g,
          fat_g: result.macros.fat_g,
          calories: result.macros.calories,
        });

      if (dbError) throw dbError;

      setSuccess(
        `✅ Guardado! P: ${result.macros.protein_g}g | C: ${result.macros.carbs_g}g | G: ${result.macros.fat_g}g | ${Math.round(result.macros.calories)} kcal`
      );
      setInput("");
    } catch (err: any) {
      setError(err.message || "Error processing nutrition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
      <div className="form-group">
        <label>¿Qué comiste? (ej: 3 huevos, 150g claras, 2 tortillas)</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe tu comida en lenguaje natural..."
          style={{ minHeight: "100px" }}
        />
      </div>

      <button
        onClick={handleParse}
        className="btn btn-primary"
        disabled={loading}
        style={{ marginBottom: "16px" }}
      >
        {loading ? "Analizando..." : "Parsear con IA"}
      </button>

      {error && <div className="error" style={{ marginBottom: "16px" }}>{error}</div>}
      {success && (
        <div
          style={{
            color: "#22863a",
            background: "#f6ffed",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "16px",
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
}

function WorkoutTab({ userId }: { userId: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleParse = async () => {
    if (!input.trim()) {
      setError("Please enter workout information");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/parse-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error parsing workout");
      }

      if (result.questions && result.questions.length > 0) {
        setError(`Por favor clarifica: ${result.questions.join(", ")}`);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const today = new Date().toISOString().split("T")[0];

      const { error: dbError } = await supabase
        .from("workout_logs")
        .insert({
          user_id: session.user.id,
          date: today,
          raw_input: input,
          exercises: result.exercises,
          duration_minutes: result.duration_minutes,
        });

      if (dbError) throw dbError;

      const exerciseList = result.exercises
        .map((e: any) => `${e.name} (${e.sets.length} sets)`)
        .join(" | ");

      setSuccess(`✅ Entrenamiento guardado! ${exerciseList}`);
      setInput("");
    } catch (err: any) {
      setError(err.message || "Error processing workout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
      <div className="form-group">
        <label>¿Qué ejercicios hiciste? (ej: 3x5 squat 270lbs, 3x8 bench 185lbs)</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe tu entrenamiento en lenguaje natural..."
          style={{ minHeight: "100px" }}
        />
      </div>

      <button
        onClick={handleParse}
        className="btn btn-primary"
        disabled={loading}
        style={{ marginBottom: "16px" }}
      >
        {loading ? "Analizando..." : "Parsear con IA"}
      </button>

      {error && <div className="error" style={{ marginBottom: "16px" }}>{error}</div>}
      {success && (
        <div
          style={{
            color: "#22863a",
            background: "#f6ffed",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "16px",
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
function ProgressTab({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const response = await fetch("/api/get-progress", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error loading progress:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, []);

  if (loading) {
    return (
      <div style={{ background: "white", padding: "40px", borderRadius: "8px", textAlign: "center" }}>
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <div style={{ background: "white", padding: "30px", borderRadius: "8px" }}>
      <h3>Tu Progreso</h3>
      
      <div style={{ marginBottom: "30px" }}>
        <h4>Peso y Grasa Corporal (últimos 30 días)</h4>
        <ProgressChart data={data?.chartData || []} />
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h4>Estadísticas</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" }}>
          <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "6px" }}>
            <div style={{ color: "#888", fontSize: "12px" }}>Entrenamientos (30 días)</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{data?.workoutCount || 0}</div>
          </div>
          <div style={{ background: "#f5f5f5", padding: "15px", borderRadius: "6px" }}>
            <div style={{ color: "#888", fontSize: "12px" }}>Mediciones registradas</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{data?.measurementCount || 0}</div>
          </div>
        </div>
      </div>

      {data?.goals && data.goals.length > 0 && (
        <div>
          <h4>Tus Metas 2026</h4>
          {data.goals.map((goal: any) => (
            <div key={goal.id} style={{ padding: "10px 0", borderBottom: "1px solid #e0e0e0" }}>
              <div style={{ fontWeight: "500" }}>
                {goal.goal_type.charAt(0).toUpperCase() + goal.goal_type.slice(1)}: {goal.target_value} {goal.target_unit}
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>Meta: {goal.deadline}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
}
