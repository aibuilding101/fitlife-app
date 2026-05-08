import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function parseNutrition(input: string) {
  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Parse this food input and calculate macros. Return ONLY valid JSON (no markdown, no extra text):
Input: "${input}"

Return format:
{
  "foods": [{"food": "name", "quantity": number, "unit": "g|units"}],
  "macros": {"protein_g": number, "carbs_g": number, "fat_g": number, "calories": number},
  "confidence": 0.0-1.0,
  "questions": ["list clarifications needed if confidence < 0.8"]
}

If anything is unclear, add to questions array.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") {
    return JSON.parse(content.text);
  }
  throw new Error("Unexpected response format");
}

export async function parseWorkout(input: string) {
  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Parse this workout input. Return ONLY valid JSON (no markdown):
Input: "${input}"

Return format:
{
  "exercises": [{"name": "exercise", "sets": [{"reps": number, "weight": number, "unit": "lbs|kg"}]}],
  "duration_minutes": number,
  "confidence": 0.0-1.0,
  "questions": ["clarifications needed if confidence < 0.8"]
}

If unclear, add to questions.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") {
    return JSON.parse(content.text);
  }
  throw new Error("Unexpected response format");
}
