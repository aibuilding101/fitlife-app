import { supabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MUSCLE_MAP: [string, string][] = [
  ["bench",           "Chest"],  ["chest",    "Chest"], ["pec",      "Chest"], ["fly",       "Chest"],
  ["squat",           "Legs"],   ["leg press","Legs"],  ["lunge",    "Legs"],  ["rdl",       "Legs"],
  ["leg curl",        "Legs"],   ["leg extension","Legs"],["hack squat","Legs"],["hip thrust","Legs"],
  ["romanian",        "Legs"],   ["calf",     "Legs"],  ["nordic",   "Legs"],
  ["deadlift",        "Back"],   ["row",      "Back"],  ["pullup",   "Back"],  ["pull-up",   "Back"],
  ["lat pulldown",    "Back"],   ["pull down","Back"],  ["chin",     "Back"],
  ["overhead press",  "Shoulders"],["ohp",    "Shoulders"],["lateral raise","Shoulders"],
  ["shoulder press",  "Shoulders"],["front raise","Shoulders"],["face pull","Shoulders"],
  ["curl",            "Arms"],   ["bicep",    "Arms"],  ["tricep",   "Arms"],  ["skull crusher","Arms"],
  ["dip",             "Arms"],
];

function classifyMuscle(name: string): string {
  const l = name.toLowerCase();
  for (const [kw, group] of MUSCLE_MAP) {
    if (l.includes(kw)) return group;
  }
  return "Other";
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

function computeStreak(logs: { date: string }[]): number {
  if (!logs.length) return 0;
  const dates = new Set(logs.map(l => l.date));
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  const d = new Date();
  if (!dates.has(today)) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().split("T")[0];
    if (dates.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: logs } = await supabase
      .from("workout_logs").select("date, exercises")
      .eq("user_id", user.id).order("date");

    if (!logs?.length) {
      return NextResponse.json({ hasData: false, totalWorkouts: 0, streak: 0,
        weeklyVolume: [], muscleGroups: [], topExercises: [], frequencyDates: [] });
    }

    const weekMap: Record<string, { label: string; volume: number; sessions: number }> = {};
    const exerciseVols: Record<string, number> = {};
    const muscleCounts: Record<string, number> = {};

    for (const log of logs) {
      const exercises = Array.isArray(log.exercises) ? log.exercises : [];
      const wk = weekKey(log.date);
      if (!weekMap[wk]) weekMap[wk] = { label: weekLabel(log.date), volume: 0, sessions: 0 };
      weekMap[wk].sessions++;

      for (const ex of exercises) {
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        const vol  = sets.reduce((s: number, set: any) => s + (set.reps || 0) * (set.weight || 0), 0);
        weekMap[wk].volume += vol;

        const name = (ex.name || "Unknown").trim();
        exerciseVols[name]  = (exerciseVols[name]  || 0) + vol;
        const muscle = classifyMuscle(name);
        muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
      }
    }

    const weeklyVolume = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([, v]) => ({ label: v.label, volume: Math.round(v.volume), sessions: v.sessions }));

    const totalMuscle = Math.max(1, Object.values(muscleCounts).reduce((a, b) => a + b, 0));
    const muscleGroups = Object.entries(muscleCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / totalMuscle) * 100) }));

    const topExercises = Object.entries(exerciseVols)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([name, volume]) => ({ name, volume: Math.round(volume) }));

    const ninetyAgo = new Date(); ninetyAgo.setDate(ninetyAgo.getDate() - 90);
    const frequencyDates = logs
      .filter(l => new Date(l.date + "T12:00:00") >= ninetyAgo)
      .map(l => l.date);

    return NextResponse.json({
      hasData: true,
      totalWorkouts: logs.length,
      streak: computeStreak(logs),
      weeklyVolume,
      muscleGroups,
      topExercises,
      frequencyDates,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
