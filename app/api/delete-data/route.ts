import { supabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const uid = user.id;

    await Promise.all([
      supabase.from("nutrition_logs").delete().eq("user_id", uid),
      supabase.from("workout_logs").delete().eq("user_id", uid),
      supabase.from("measurements").delete().eq("user_id", uid),
      supabase.from("sleep_logs").delete().eq("user_id", uid),
      supabase.from("activity_log").delete().eq("user_id", uid),
    ]);

    // Reset profile targets but keep name/email
    await supabase.from("user_profiles").update({
      weight_kg: null,
      body_fat_percent: null,
      height_cm: null,
      age: null,
      activity_level: null,
      goal: null,
      macro_target_calories: null,
      macro_target_protein: null,
      macro_target_carbs: null,
      macro_target_fat: null,
    }).eq("user_id", uid);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
