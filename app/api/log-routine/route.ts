import { supabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { routineName, entries } = await request.json();
    if (!entries?.length) return NextResponse.json({ error: "No exercises provided" }, { status: 400 });

    const exercises = entries.map((e: any) => ({
      name: e.name,
      sets: Array.from({ length: e.sets }, () => ({
        reps: e.reps,
        weight: e.weight,
        unit: e.unit || "lbs",
      })),
    }));

    const today = new Date().toISOString().split("T")[0];
    const { error: dbErr } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      date: today,
      raw_input: `Quick log: ${routineName}`,
      exercises,
      duration_minutes: 0,
    });

    if (dbErr) throw dbErr;
    return NextResponse.json({ ok: true, exerciseCount: exercises.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
