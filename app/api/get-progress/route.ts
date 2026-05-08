import { supabaseServer } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = supabaseServer();

    // Get user from token (simplified - in production use proper JWT verification)
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get measurements (weight, body fat) last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const { data: measurements } = await supabase
      .from("measurements")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", thirtyDaysAgoStr)
      .order("date", { ascending: true });

    // Get workouts last 30 days
    const { data: workouts } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", thirtyDaysAgoStr)
      .order("date", { ascending: true });

    // Get goals
    const { data: goals } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id);

    // Format data for charts
    const chartData = (measurements || []).map((m) => ({
      date: m.date,
      weight: m.weight_kg,
      bodyFat: m.body_fat_percent,
    }));

    return NextResponse.json({
      chartData,
      workoutCount: workouts?.length || 0,
      goals: goals || [],
      measurementCount: measurements?.length || 0,
    });
  } catch (error: any) {
    console.error("Get progress error:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching progress" },
      { status: 500 }
    );
  }
}
