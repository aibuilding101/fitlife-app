import { supabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = supabaseServer();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: measurements } = await supabase
      .from("measurements").select("*")
      .eq("user_id", user.id).order("date", { ascending: true });

    if (!measurements?.length) {
      return NextResponse.json({ hasData: false, measurements: [], chartData: [] });
    }

    const chartData = measurements.map(m => ({
      date:    m.date,
      weight:  m.weight_kg   ?? null,
      bodyFat: m.body_fat_percent ?? null,
    }));

    const first = measurements[0];
    const last  = measurements[measurements.length - 1];

    const weightChange = (last.weight_kg  ?? 0) - (first.weight_kg  ?? 0);
    const fatChange    = (last.body_fat_percent ?? 0) - (first.body_fat_percent ?? 0);

    // Rough lean mass estimate:
    // Δlean = Δweight - Δfat_mass  |  fat_mass = weight * bodyFat/100
    let muscleDelta: number | null = null;
    if (last.weight_kg && last.body_fat_percent && first.weight_kg && first.body_fat_percent) {
      const fatMassLast  = last.weight_kg  * (last.body_fat_percent  / 100);
      const fatMassFirst = first.weight_kg * (first.body_fat_percent / 100);
      muscleDelta = weightChange - (fatMassLast - fatMassFirst);
    }

    const daysDiff = Math.max(1,
      Math.floor((new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000));

    return NextResponse.json({
      hasData: true,
      measurements,
      chartData,
      latest: {
        weight:  last.weight_kg,
        bodyFat: last.body_fat_percent,
        date:    last.date,
      },
      changes: {
        weightChange:   Math.round(weightChange * 10) / 10,
        fatChange:      Math.round(fatChange    * 10) / 10,
        muscleDelta:    muscleDelta !== null ? Math.round(muscleDelta * 10) / 10 : null,
        daySpan:        daysDiff,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
