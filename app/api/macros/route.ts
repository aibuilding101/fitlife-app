import { supabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

function calculateMacros(weight_kg: number, height_cm: number, age: number, activity: string, goal: string) {
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  const tdee = bmr * (multipliers[activity] ?? 1.55);
  const calories = goal === "CUT" ? tdee - 500 : goal === "BULK" ? tdee + 300 : tdee;
  const protein_g = Math.round(weight_kg * 2.205 * 1.0);
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);
  return {
    calories: Math.round(calories),
    protein_g,
    carbs_g: Math.max(0, carbs_g),
    fat_g,
    tdee: Math.round(tdee),
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("user_profiles").select("*")
      .eq("user_id", user.id).single();

    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);

    const { data: todayLogs } = await supabase.from("nutrition_logs").select("*")
      .eq("user_id", user.id).eq("date", today);

    const { data: weekLogs } = await supabase.from("nutrition_logs").select("date, calories, protein_g")
      .eq("user_id", user.id).gte("date", weekAgo.toISOString().split("T")[0]);

    const todayTotals = (todayLogs || []).reduce(
      (s: any, l: any) => ({
        calories: s.calories + (l.calories || 0),
        protein_g: s.protein_g + (l.protein_g || 0),
        carbs_g: s.carbs_g + (l.carbs_g || 0),
        fat_g: s.fat_g + (l.fat_g || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    const byDate: Record<string, { calories: number; protein_g: number }> = {};
    for (const l of weekLogs || []) {
      if (!byDate[l.date]) byDate[l.date] = { calories: 0, protein_g: 0 };
      byDate[l.date].calories += l.calories || 0;
      byDate[l.date].protein_g += l.protein_g || 0;
    }

    const targets = profile?.macro_target_calories
      ? {
          calories: profile.macro_target_calories,
          protein_g: profile.macro_target_protein,
          carbs_g: profile.macro_target_carbs,
          fat_g: profile.macro_target_fat,
        }
      : null;

    let daysHit = 0;
    if (targets) {
      for (const day of Object.values(byDate)) {
        if (
          day.calories >= targets.calories * 0.9 && day.calories <= targets.calories * 1.1 &&
          day.protein_g >= targets.protein_g * 0.9
        ) daysHit++;
      }
    }

    return NextResponse.json({
      profile: {
        height_cm: profile?.height_cm,
        age: profile?.age,
        activity_level: profile?.activity_level,
        goal: profile?.goal,
        weight_kg: profile?.weight_kg,
      },
      targets,
      today: todayTotals,
      weeklyAdherence: { daysHit, totalDays: Object.keys(byDate).length },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { height_cm, age, activity_level, goal, weight_kg } = body;

    if (!height_cm || !age || !activity_level || !goal || !weight_kg) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const macros = calculateMacros(
      parseFloat(weight_kg), parseFloat(height_cm),
      parseInt(age), activity_level, goal
    );

    const { error: upsertErr } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      height_cm: parseFloat(height_cm),
      age: parseInt(age),
      activity_level,
      goal,
      weight_kg: parseFloat(weight_kg),
      macro_target_calories: macros.calories,
      macro_target_protein: macros.protein_g,
      macro_target_carbs: macros.carbs_g,
      macro_target_fat: macros.fat_g,
    }, { onConflict: "user_id" });

    if (upsertErr) throw upsertErr;
    return NextResponse.json({ macros });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
