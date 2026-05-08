import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find the first { ... } block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

function validateInput(input: string, maxLength = 2000): string {
  if (!input || typeof input !== "string") throw new Error("Input must be a non-empty string");
  const trimmed = input.trim();
  if (trimmed.length === 0) throw new Error("Input is empty");
  if (trimmed.length > maxLength) throw new Error(`Input too long (max ${maxLength} characters)`);
  return trimmed;
}

export async function parseNutrition(input: string) {
  const sanitized = validateInput(input);

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Parse the food input below and calculate macros. Return ONLY valid JSON with no markdown fences or extra text.

INPUT:
${sanitized}

REQUIRED JSON FORMAT:
{
  "foods": [{"food": "name", "quantity": number, "unit": "g|units"}],
  "macros": {"protein_g": number, "carbs_g": number, "fat_g": number, "calories": number},
  "confidence": 0.0,
  "questions": []
}

Rules:
- All number fields must be numbers, never strings or null
- Use 0 for unknown numeric values
- Add clarifications to questions array if confidence < 0.8
- Handle any language, accented characters, abbreviations, and mixed units`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response format");
  try {
    return JSON.parse(extractJSON(content.text));
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${content.text.slice(0, 200)}`);
  }
}

export async function parseWorkout(input: string) {
  const sanitized = validateInput(input);

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Parse the workout input below. Return ONLY valid JSON with no markdown fences or extra text.

INPUT:
${sanitized}

REQUIRED JSON FORMAT:
{
  "exercises": [
    {
      "name": "exercise name in English",
      "sets": [{"reps": number, "weight": number, "unit": "lbs|kg"}]
    }
  ],
  "duration_minutes": number,
  "confidence": 0.0,
  "questions": []
}

Rules:
- All number fields must be numbers, never strings or null
- Use 0 for unknown weight/duration values
- Expand shorthand: "3x10 @ 35lbs" → three set objects each with reps:10, weight:35, unit:"lbs"
- When sets have different reps (e.g. "12, 10 y 10"), create one set object per rep count
- Handle any language, accented characters (á é í ó ú ñ), parentheses, commas, and mixed units
- Translate exercise names to English
- Add clarifications to questions if confidence < 0.8`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response format");
  try {
    return JSON.parse(extractJSON(content.text));
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${content.text.slice(0, 200)}`);
  }
}
