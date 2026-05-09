"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GOAL_OPTIONS = [
  { value: "CUT",    label: "Definición (CUT)",    desc: "Déficit calórico, perder grasa",         color: "var(--coral)"  },
  { value: "RECOMP", label: "Recomposición",        desc: "Perder grasa y ganar músculo a la vez",  color: "#a78bfa"       },
  { value: "MAINT",  label: "Mantenimiento",        desc: "Conservar tu composición actual",        color: "var(--amber)"  },
  { value: "BULK",   label: "Volumen (BULK)",       desc: "+300 kcal, ganar masa muscular",         color: "var(--accent)" },
];

const ACTIVITY_OPTIONS = [
  { value: "sedentary",   label: "Sedentario",   desc: "Oficina, poco movimiento" },
  { value: "light",       label: "Ligero",       desc: "1–3 días de ejercicio/semana" },
  { value: "moderate",    label: "Moderado",     desc: "3–5 días de ejercicio/semana" },
  { value: "active",      label: "Activo",       desc: "6–7 días de ejercicio/semana" },
  { value: "very_active", label: "Muy activo",   desc: "2× al día o trabajo físico" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const [sex, setSex]         = useState<"male"|"female">("male");
  const [age, setAge]         = useState("");
  const [height, setHeight]   = useState("");
  const [weight, setWeight]   = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [goal, setGoal]       = useState("CUT");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/auth/login");
    });
  }, [router]);

  const nextStep = () => {
    setError("");
    if (step === 1) {
      if (!age || !height || !weight) { setError("Completa edad, estatura y peso"); return; }
      if (isNaN(+age) || +age < 10 || +age > 120) { setError("Edad inválida"); return; }
      if (isNaN(+height) || +height < 100 || +height > 250) { setError("Estatura inválida (cm)"); return; }
      if (isNaN(+weight) || +weight < 30 || +weight > 300) { setError("Peso inválido (kg)"); return; }
    }
    setStep(s => s + 1);
  };

  const handleFinish = async () => {
    setSaving(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }
      const res = await fetch("/api/macros", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          height_cm: height, age, activity_level: activity, goal,
          weight_kg: weight, sex,
          ...(bodyFat && { body_fat_percent: bodyFat }),
        }),
      });
      if (!res.ok) { const r = await res.json(); throw new Error(r.error); }
      router.push("/dashboard");
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="auth-page" style={{ alignItems: "flex-start", paddingTop: "60px" }}>
      <div style={{ width: "100%", maxWidth: "460px", margin: "0 auto" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div className="auth-logo">FitLife<span>.</span></div>
          <p className="auth-subtitle">Configura tu perfil en 3 pasos</p>
        </div>

        {/* Progress bar */}
        <div style={{ height: "3px", background: "var(--border)", borderRadius: "2px", marginBottom: "40px" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", borderRadius: "2px", transition: "width 0.4s" }} />
        </div>

        <div className="auth-card" style={{ maxWidth: "100%" }}>

          {/* ── Step 1: Body data ── */}
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 600, marginBottom: "6px" }}>Tu cuerpo</h2>
              <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "28px" }}>Estos datos nos permiten calcular tus macros exactos.</p>

              {/* Sex toggle */}
              <div className="form-group">
                <label>Sexo biológico</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {(["male","female"] as const).map(s => (
                    <button key={s} onClick={() => setSex(s)} style={{
                      flex: 1, padding: "10px", borderRadius: "var(--r-md)",
                      border: `1px solid ${sex === s ? "var(--accent)" : "var(--border)"}`,
                      background: sex === s ? "rgba(255,107,107,0.08)" : "none",
                      color: sex === s ? "var(--accent)" : "var(--muted)",
                      fontSize: "13px", fontWeight: sex === s ? 600 : 400, cursor: "pointer", transition: "all 0.15s",
                    }}>
                      {s === "male" ? "Masculino" : "Femenino"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Edad</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" min="10" max="99" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Estatura (cm)</label>
                  <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="178" min="100" max="250" />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: "16px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Peso (kg)</label>
                  <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="80.0" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>% Grasa corporal <span style={{ fontWeight: 400, letterSpacing: 0 }}>(opcional)</span></label>
                  <input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="15.0" />
                </div>
              </div>

              {error && <div className="error" style={{ marginTop: "12px" }}>{error}</div>}
              <button className="btn btn-primary btn-full" onClick={nextStep} style={{ marginTop: "24px" }}>Siguiente →</button>
            </>
          )}

          {/* ── Step 2: Activity ── */}
          {step === 2 && (
            <>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 600, marginBottom: "6px" }}>Tu actividad</h2>
              <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "28px" }}>¿Cuánto te mueves en una semana típica?</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {ACTIVITY_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setActivity(o.value)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", borderRadius: "var(--r-md)",
                    border: `1px solid ${activity === o.value ? "var(--accent)" : "var(--border)"}`,
                    background: activity === o.value ? "rgba(255,107,107,0.06)" : "none",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: activity === o.value ? "var(--accent)" : "var(--text)" }}>{o.label}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>{o.desc}</div>
                    </div>
                    {activity === o.value && <span style={{ color: "var(--accent)", fontSize: "18px" }}>✓</span>}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>← Atrás</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={nextStep}>Siguiente →</button>
              </div>
            </>
          )}

          {/* ── Step 3: Goal ── */}
          {step === 3 && (
            <>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "22px", fontWeight: 600, marginBottom: "6px" }}>Tu objetivo</h2>
              <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "28px" }}>¿Qué quieres lograr?</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {GOAL_OPTIONS.map(g => (
                  <button key={g.value} onClick={() => setGoal(g.value)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", borderRadius: "var(--r-md)",
                    border: `1px solid ${goal === g.value ? g.color : "var(--border)"}`,
                    background: goal === g.value ? `${g.color}10` : "none",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: goal === g.value ? g.color : "var(--text)" }}>{g.label}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>{g.desc}</div>
                    </div>
                    {goal === g.value && <span style={{ color: g.color, fontSize: "18px" }}>✓</span>}
                  </button>
                ))}
              </div>

              {error && <div className="error" style={{ marginTop: "12px" }}>{error}</div>}

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>← Atrás</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleFinish} disabled={saving}>
                  {saving ? "Calculando..." : "Empezar →"}
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--muted)", marginTop: "20px" }}>
          Paso {step} de {totalSteps}
        </p>
      </div>
    </div>
  );
}
