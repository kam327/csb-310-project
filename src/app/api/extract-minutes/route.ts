import { NextRequest, NextResponse } from "next/server";

interface ExtractMinutesRequest {
  rawNotes?: string;
  notes?: string;
  text?: string;
}

interface ExtractedMinutes {
  summary: string;
  decisions: string[];
  actionItems: string[];
  nextSteps: string[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

// Stable Flash on current AI Studio / free tier (see https://ai.google.dev/gemini-api/docs/models/gemini).
// 2.0 Flash is deprecated; 1.5 often 404s for new keys. Optional: set GEMINI_MODEL in .env.local e.g. gemini-2.5-flash-lite or gemini-flash-latest
function geminiModel(): string {
  return process.env["GEMINI_MODEL"]?.trim() || "gemini-2.5-flash";
}

function fallbackGeminiModel(primary: string): string {
  const configured = process.env["GEMINI_FALLBACK_MODEL"]?.trim();
  if (configured) return configured;
  return primary === "gemini-2.5-flash-lite"
    ? "gemini-2.5-flash"
    : "gemini-2.5-flash-lite";
}

function shouldTryFallback(status: number, errorText: string): boolean {
  if (status === 429) return true;
  const text = errorText.toLowerCase();
  return (
    text.includes("resource_exhausted") ||
    text.includes("quota") ||
    text.includes("rate limit")
  );
}

function getInputText(body: ExtractMinutesRequest): string {
  return (body.rawNotes ?? body.notes ?? body.text ?? "").trim();
}

function buildPrompt(rawNotes: string): string {
  return [
    "You extract meeting minutes from messy notes.",
    "Return ONLY valid JSON (no markdown, no code fences, no extra text).",
    'Use this exact shape: {"summary":"string","decisions":["..."],"actionItems":["..."],"nextSteps":["..."]}',
    "Keep summary to 2-4 sentences.",
    "If a section is missing, return an empty array (or empty string for summary).",
    "",
    "Meeting notes:",
    rawNotes,
  ].join("\n");
}

/** Gemini sometimes still wraps JSON in ``` fences despite instructions; strip before parse */
function unwrapFencedJson(raw: string): string {
  let s = raw.trim();
  if (!s.startsWith("```")) return s;
  s = s.replace(/^```(?:json)?\s*/i, "");
  const end = s.lastIndexOf("```");
  if (end !== -1) s = s.slice(0, end);
  return s.trim();
}

export async function POST(req: NextRequest) {
  // Dynamic lookup so Next doesn't inline undefined at compile time when .env.local loads later
  const geminiApiKey = process.env["GEMINI_API_KEY"];
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY" },
      { status: 500 }
    );
  }

  let body: ExtractMinutesRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawNotes = getInputText(body);
  if (!rawNotes) {
    return NextResponse.json(
      { error: "rawNotes (or notes/text) is required" },
      { status: 400 }
    );
  }

  try {
    const prompt = buildPrompt(rawNotes);
    const primaryModel = geminiModel();
    const secondaryModel = fallbackGeminiModel(primaryModel);
    const requestedModels =
      secondaryModel === primaryModel
        ? [primaryModel]
        : [primaryModel, secondaryModel];

    let data: GeminiResponse | null = null;
    let usedModel = primaryModel;
    let lastErrorText = "";

    for (let i = 0; i < requestedModels.length; i += 1) {
      const model = requestedModels[i];
      usedModel = model;
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (geminiRes.ok) {
        data = (await geminiRes.json()) as GeminiResponse;
        break;
      }

      const errorText = await geminiRes.text();
      lastErrorText = errorText;
      const canFallback =
        i < requestedModels.length - 1 &&
        shouldTryFallback(geminiRes.status, errorText);
      if (!canFallback) {
        return NextResponse.json(
          {
            error: "Gemini request failed",
            model,
            details: errorText,
          },
          { status: 502 }
        );
      }
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Gemini request failed",
          model: usedModel,
          details: lastErrorText || "No response from Gemini.",
        },
        { status: 502 }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Gemini returned empty output" },
        { status: 502 }
      );
    }

    const jsonText = unwrapFencedJson(text);
    let extracted: ExtractedMinutes;
    try {
      extracted = JSON.parse(jsonText) as ExtractedMinutes;
    } catch {
      return NextResponse.json(
        { error: "Gemini returned non-JSON output", rawOutput: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ extracted, modelUsed: usedModel });
  } catch (error) {
    console.error("extract-minutes route error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
