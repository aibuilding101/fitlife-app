import { supabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── Routine definitions ───────────────────────────────────────────────────────

const ROUTINE_DEFS = [
  { name: "Legs A",    keys: ["squat", "leg press", "rdl", "romanian", "leg curl", "leg extension"] },
  { name: "Push",      keys: ["bench", "overhead press", "ohp", "incline", "tricep", "chest press", "dip"] },
  { name: "Pull",      keys: ["deadlift", "row", "pullup", "pull-up", "lat pulldown", "chin", "pull-down"] },
  { name: "Legs B",    keys: ["hack squat", "hip thrust", "lunge", "calf", "bulgarian", "stiff leg", "sumo"] },
  { name: "Bi+Tri+Sh", keys: ["bicep", "curl", "tricep", "lateral raise", "shoulder press", "face pull", "rear delt"] },
];

function detectRoutine(exercises: any[]): string {
  if (!exercises.length) return "Other";
  const str = exercises.map(e => (e.name || "").toLowerCase()).join(" ");
  let best = { name: "Other", score: 0 };
  for (const r of ROUTINE_DEFS) {
    const score = r.keys.filter(k => str.includes(k)).length;
    if (score > best.score) best = { name: r.name, score };
  }
  return best.name;
}

function maxWeight(ex: any): number {
  const sets = Array.isArray(ex.sets) ? ex.sets : [];
  return sets.length ? Math.max(...sets.map((s: any) => s.weight || 0)) : 0;
}

function maxReps(ex: any): number {
  const sets = Array.isArray(ex.sets) ? ex.sets : [];
  return sets.length ? Math.max(...sets.map((s: any) => s.reps || 0)) : 0;
}

function exVolume(ex: any): number {
  const sets = Array.isArray(ex.sets) ? ex.sets : [];
  return sets.reduce((sum: number, s: any) => sum + (s.reps || 0) * (s.weight || 0), 0);
}

function weekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d); mon.setDate(diff);
  return mon.toISOString().split("T")[0];
}

function weekLabel(dateStr: string): string {
  const d = new Date(weekKey(dateStr) + "T12:00:00");
  return d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 86_400_000);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: logs } = await supabase
      .from("workout_logs").select("date, exercises")
      .eq("user_id", user.id).order("date", { ascending: true });

    if (!logs?.length) return NextResponse.json({ routines: [], suggestions: [] });

    // Group logs by routine
    const routineMap: Record<string, { date: string; exercises: any[] }[]> = {};
    for (const log of logs) {
      const exercises = Array.isArray(log.exercises) ? log.exercises : [];
      const name = detectRoutine(exercises);
      if (!routineMap[name]) routineMap[name] = [];
      routineMap[name].push({ date: log.date, exercises });
    }

    const fourWeeksAgo = new Date(); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    // Build routine summaries
    const routines = ROUTINE_DEFS.map(def => {
      const sessions = routineMap[def.name] || [];

      // Weekly volume (last 8 weeks)
      const wkVol: Record<string, number> = {};
      for (const s of sessions) {
        const wk = weekKey(s.date);
        wkVol[wk] = (wkVol[wk] || 0) + s.exercises.reduce((sum: number, ex: any) => sum + exVolume(ex), 0);
      }
      const weeklyVolume = Object.entries(wkVol)
        .sort(([a], [b]) => a.localeCompare(b)).slice(-8)
        .map(([key, vol]) => ({ label: weekLabel(key + "T12:00:00".slice(0)), volume: Math.round(vol) }));

      // Per-exercise tracking
      const exHistory: Record<string, { date: string; maxWeight: number; maxReps: number }[]> = {};
      for (const s of sessions) {
        for (const ex of s.exercises) {
          const name = (ex.name || "Unknown").trim();
          if (!exHistory[name]) exHistory[name] = [];
          exHistory[name].push({ date: s.date, maxWeight: maxWeight(ex), maxReps: maxReps(ex) });
        }
      }

      const exercises = Object.entries(exHistory).map(([name, history]) => {
        const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
        const latest = sorted[sorted.length - 1];
        const prev   = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

        // 4-week comparison
        const fourWk = sorted.filter(h => new Date(h.date + "T12:00:00") <= fourWeeksAgo);
        const then   = fourWk.length ? fourWk[fourWk.length - 1].maxWeight : null;
        const change4w = then !== null ? latest.maxWeight - then : null;

        // Plateau: same max weight for last 2+ sessions
        const isPlateaued = prev !== null && prev.maxWeight === latest.maxWeight && latest.maxWeight > 0;

        return {
          name,
          currentWeight: latest.maxWeight,
          currentReps:   latest.maxReps,
          change4w,
          isPlateaued,
          sessionCount: sorted.length,
          history: sorted.slice(-6).map(h => ({ date: h.date, weight: h.maxWeight })),
        };
      }).sort((a, b) => b.sessionCount - a.sessionCount);

      return {
        name: def.name,
        sessionCount: sessions.length,
        lastTrained: sessions.length ? sessions[sessions.length - 1].date : null,
        lastTrainedDaysAgo: sessions.length ? daysAgo(sessions[sessions.length - 1].date) : null,
        weeklyVolume,
        exercises,
      };
    });

    // Progressive overload suggestions
    const suggestions: any[] = [];
    for (const routine of routines) {
      for (const ex of routine.exercises) {
        if (ex.sessionCount < 2 || ex.currentWeight === 0) continue;

        let status: string;
        let suggestion: string;
        let reason: string;

        if (ex.isPlateaued) {
          status = "ready";
          suggestion = `+2.5kg → ${ex.currentWeight + 2.5}kg`;
          reason = "Mismo peso 2+ sesiones";
        } else if (ex.change4w !== null && ex.change4w > 0) {
          status = "progressing";
          suggestion = "Sigue así";
          reason = `+${ex.change4w}kg en 4 semanas`;
        } else {
          status = "almost";
          suggestion = "+1 rep por serie";
          reason = "Consolida antes de subir peso";
        }

        suggestions.push({
          exercise: ex.name,
          routine:  routine.name,
          currentWeight: ex.currentWeight,
          status,
          suggestion,
          reason,
        });
      }
    }

    return NextResponse.json({ routines, suggestions: suggestions.slice(0, 12) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
