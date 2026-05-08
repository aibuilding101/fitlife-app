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
  "macros": {"protein_g": number, "carbs_g": number, "fat_g": number, "calories": number},
  "assumptions": ["list every assumption you made about ingredients, portions, preparation"],
  "confidence": 0.0
}

Rules:
- NEVER ask questions. Always make reasonable assumptions and log them.
- If the food is vague (e.g. "pechuga"), assume the most common preparation (e.g. grilled chicken breast, 150g, no skin).
- If portion is missing, assume a standard portion and document it.
- All number fields must be numbers, never strings or null. Use 0 if truly unknown.
- Handle any language, accented characters, abbreviations, and mixed units.
- assumptions array must be non-empty — always document what you assumed.`,
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
  "assumptions": ["list every assumption made: units, equipment, missing data"],
  "confidence": 0.0
}

Rules:
- NEVER ask questions. Always make reasonable assumptions and log them.
- Default weight unit: lbs (unless kg is mentioned).
- Expand shorthand: "3x10 @ 35lbs" → three set objects each with reps:10, weight:35, unit:"lbs".
- When sets have different reps (e.g. "12, 10 y 10"), create one set object per rep count.
- Handle any language, accented characters (á é í ó ú ñ), parentheses, commas, and mixed units.
- Translate exercise names to English.
- Use 0 for unknown weight or duration.
- assumptions array must be non-empty — always document what you assumed.`,
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
