"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ProgressChart } from "@/components/ProgressChart";

export default function BodyPage() {
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [weight, setWeight]   = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [chest, setChest]     = useState("");
  const [armL, setArmL]       = useState("");
  const [armR, setArmR]       = useState("");
  const [waist, setWaist]     = useState("");
  const [thigh, setThigh]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const [editId, setEditId]     = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [apiError, setApiError] = useState("");

  const loadData = async () => {
    setApiError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }
      const res = await fetch("/api/get-body", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) {
        setData(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setApiError(err.error || `Error ${res.status} cargando datos`);
      }
    } catch (e: any) {
      setApiError(e.message || "Error de red");
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [router]);

  const clearForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setWeight(""); setBodyFat(""); setChest(""); setArmL(""); setArmR("");
    setWaist(""); setThigh(""); setError(""); setEditId(null);
  };

  const handleSave = async () => {
    if (!weight && !bodyFat && !chest && !armL && !armR && !waist && !thigh) {
      setError("Ingresa al menos una medida"); return;
    }
    setSaving(true); setError(""); setSuccess("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const payload: any = {
        user_id: session.user.id, date,
        ...(weight  && { weight_kg: parseFloat(weight) }),
        ...(bodyFat && { body_fat_percent: parseFloat(bodyFat) }),
        ...(chest   && { chest_cm: parseFloat(chest) }),
        ...(armL    && { arm_left_cm: parseFloat(armL) }),
        ...(armR    && { arm_right_cm: parseFloat(armR) }),
        ...(waist   && { waist_cm: parseFloat(waist) }),
        ...(thigh   && { thigh_cm: parseFloat(thigh) }),
      };

      if (editId) {
        const { error: dbErr } = await supabase.from("measurements").update(payload).eq("id", editId);
        if (dbErr) throw dbErr;
        setSuccess("Medida actualizada.");
      } else {
        const { error: dbErr } = await supabase.from("measurements").insert(payload);
        if (dbErr) {
          if (dbErr.code === "23505") throw new Error("Tu base de datos tiene un índice único por fecha. Ejecuta este SQL en Supabase: ALTER TABLE measurements DROP CONSTRAINT IF EXISTS measurements_user_date_unique;");
          throw dbErr;
        }
        setSuccess("Medida guardada.");
      }
      clearForm(); await loadData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const startEdit = (m: any) => {
    setEditId(m.id);
    setDate(m.date);
    setWeight(m.weight_kg ?? "");
    setBodyFat(m.body_fat_percent ?? "");
    setChest(m.chest_cm ?? "");
    setArmL(m.arm_left_cm ?? "");
    setArmR(m.arm_right_cm ?? "");
    setWaist(m.waist_cm ?? "");
    setThigh(m.thigh_cm ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: dbErr } = await supabase.from("measurements").delete().eq("id", id);
      if (dbErr) throw dbErr;
      setDeleteId(null); await loadData();
    } catch (err: any) { setError(err.message); }
  };

  if (loading) return (
    <div className="loading-center" style={{ minHeight: "60vh" }}><div className="loading" /></div>
  );

  const d = data || {};
  const { latest, changes, chartData, measurements } = d;

  const changeColor = (v: number) => v < 0 ? "var(--coral)" : v > 0 ? "var(--accent)" : "var(--muted)";
  const fmt = (v: number) => (v > 0 ? "+" : "") + v;

  return (
    <>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Composición</p>
          <h1 className="page-title">Body</h1>
        </div>
        {measurements?.length > 0 && <span className="page-date">{measurements.length} mediciones</span>}
      </div>

      {apiError && <div className="error" style={{ marginBottom: "16px" }}>{apiError}</div>}

      {/* Log form */}
      <div className="content-card" style={{ marginBottom: "20px" }}>
        <h3 className="card-title">{editId ? "Editar medida" : "Registrar medida"}</h3>
        <div className="form-group">
          <label>Fecha</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split("T")[0]} />
        </div>
        <div className="form-grid-2">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Peso (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="82.5" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Grasa corporal (%)</label>
            <input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="14.2" />
          </div>
        </div>
        <div className="section-label" style={{ margin: "16px 0 12px" }}>Medidas corporales (cm) — opcional</div>
        <div className="form-grid-2">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Pecho</label>
            <input type="number" step="0.1" value={chest} onChange={e => setChest(e.target.value)} placeholder="102" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Cintura</label>
            <input type="number" step="0.1" value={waist} onChange={e => setWaist(e.target.value)} placeholder="82" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Brazo izq. (cm)</label>
            <input type="number" step="0.1" value={armL} onChange={e => setArmL(e.target.value)} placeholder="37" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Brazo der. (cm)</label>
            <input type="number" step="0.1" value={armR} onChange={e => setArmR(e.target.value)} placeholder="37" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Muslo (cm)</label>
            <input type="number" step="0.1" value={thigh} onChange={e => setThigh(e.target.value)} placeholder="55" />
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
          </button>
          {editId && <button className="btn btn-secondary" onClick={clearForm}>Cancelar</button>}
        </div>
        {error   && <div className="error" style={{ marginTop: "10px" }}>{error}</div>}
        {success && <div className="success-banner" style={{ marginTop: "10px" }}>{success}</div>}
      </div>

      {d.hasData && (
        <>
          <div className="stats-grid" style={{ marginBottom: "20px" }}>
            <div className="stat-card">
              <div className="stat-label">Peso actual</div>
              <div className="stat-row">
                <span className="stat-value">{latest?.weight ?? "--"}</span>
                <span className="stat-unit">kg</span>
              </div>
              <div className="stat-meta" style={{ color: changes?.weightChange != null ? changeColor(changes.weightChange) : "var(--muted)" }}>
                {changes?.weightChange != null ? `${fmt(changes.weightChange)} kg` : "—"}
              </div>
              <div className="stat-track"><div className="stat-fill" style={{ width: "100%", background: "var(--border)" }} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Grasa corporal</div>
              <div className="stat-row">
                <span className="stat-value">{latest?.bodyFat ?? "--"}</span>
                <span className="stat-unit">%</span>
              </div>
              <div className="stat-meta" style={{ color: changes?.fatChange != null ? changeColor(-changes.fatChange) : "var(--muted)" }}>
                {changes?.fatChange != null ? `${fmt(changes.fatChange)}%` : "—"}
              </div>
              <div className="stat-track">
                <div className="stat-fill" style={{ width: latest?.bodyFat ? `${Math.min(100,(latest.bodyFat/30)*100)}%` : "0%", background: "var(--coral)" }} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Masa magra est.</div>
              <div className="stat-row">
                <span className="stat-value">{changes?.muscleDelta != null ? fmt(changes.muscleDelta) : "--"}</span>
                <span className="stat-unit">kg</span>
              </div>
              <div className="stat-meta">en {changes?.daySpan ?? "—"} días</div>
              <div className="stat-track">
                <div className="stat-fill" style={{ width: changes?.muscleDelta != null && changes.muscleDelta > 0 ? "80%" : "0%", background: "var(--accent)" }} />
              </div>
            </div>
          </div>

          <div className="content-card" style={{ marginBottom: "20px" }}>
            <h3 className="card-title">Peso y Grasa Corporal</h3>
            <ProgressChart data={chartData || []} />
          </div>
        </>
      )}

      <div className="content-card">
        <h3 className="card-title">Historial</h3>
        {!measurements?.length ? (
          <p className="empty-state">Sin medidas todavía.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Peso</th>
                  <th>Grasa</th>
                  <th>Pecho</th>
                  <th>Cintura</th>
                  <th>Brazos</th>
                  <th>Muslo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...(measurements || [])].reverse().map((m: any) => (
                  <tr key={m.id}>
                    <td style={{ color: "var(--text)" }}>{new Date(m.date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>{m.weight_kg ? `${m.weight_kg} kg` : "--"}</td>
                    <td>{m.body_fat_percent ? `${m.body_fat_percent}%` : "--"}</td>
                    <td>{m.chest_cm ? `${m.chest_cm}cm` : "--"}</td>
                    <td>{m.waist_cm ? `${m.waist_cm}cm` : "--"}</td>
                    <td>{m.arm_left_cm ? `${m.arm_left_cm}/${m.arm_right_cm ?? "?"}cm` : "--"}</td>
                    <td>{m.thigh_cm ? `${m.thigh_cm}cm` : "--"}</td>
                    <td style={{ textAlign: "right" }}>
                      {deleteId === m.id ? (
                        <span style={{ fontSize: "12px" }}>
                          <button onClick={() => handleDelete(m.id)} style={{ color: "var(--coral)", background: "none", border: "none", cursor: "pointer", marginRight: "8px", fontSize: "12px" }}>Confirmar</button>
                          <button onClick={() => setDeleteId(null)} style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>Cancelar</button>
                        </span>
                      ) : (
                        <span>
                          <button onClick={() => startEdit(m)} style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontSize: "12px", marginRight: "8px" }}>Editar</button>
                          <button onClick={() => setDeleteId(m.id)} style={{ color: "var(--coral)", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>×</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
