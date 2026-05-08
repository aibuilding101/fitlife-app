import { parseWorkout } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || !input.trim()) {
      return NextResponse.json(
        { error: "Input is required" },
        { status: 400 }
      );
    }

    const result = await parseWorkout(input);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Parse workout error:", error);
    return NextResponse.json(
      { error: error.message || "Error parsing workout" },
      { status: 500 }
    );
  }
}
