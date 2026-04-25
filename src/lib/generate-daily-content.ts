import { put } from "@vercel/blob";
import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { compositeQuoteOnImage } from "@/lib/image-composite";
import { downloadImage, searchUnsplashPhoto } from "@/lib/unsplash";

const quotePayloadSchema = z.object({
  quote: z.string().min(8).max(400),
  keywords: z.array(z.string().min(1).max(40)).min(1).max(4),
});

const THEMES = [
  "growth mindset",
  "resilience",
  "consistency",
  "gratitude",
  "self-belief",
  "focus",
  "courage",
  "discipline",
  "new beginnings",
  "calm confidence",
];

const STYLES = [
  "minimal and direct",
  "poetic",
  "bold and energetic",
  "warm and empathetic",
  "reflective",
  "cinematic",
  "conversational",
  "wisdom-like",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function extractTextFromGeminiResponse(data: unknown): string {
  const response = data as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  return response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

function normalizeJsonResponseText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  temperature: number,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: { temperature },
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gemini API failed (${resp.status}): ${body}`);
  }

  return resp.json();
}

export async function generateDailyContentForDateKey(localDateKey: string) {
  const existing = await prisma.dailyContent.findUnique({
    where: { localDateKey },
  });
  if (existing) return existing;

  const geminiApiKey = requireEnv("GEMINI_API_KEY");
  const unsplashKey = requireEnv("UNSPLASH_ACCESS_KEY");
  const blobToken = requireEnv("BLOB_READ_WRITE_TOKEN");

  const selectedTheme = pickRandom(THEMES);
  const selectedStyle = pickRandom(STYLES);

  const quotePrompt = [
    "You write one original motivational quote per day.",
    "Use the requested theme and writing style.",
    'Return strict JSON with keys "quote" (string) and "keywords" (array of 1-3 short English nouns/adjectives for stock photo search, no people names).',
    "Return only JSON. No markdown, no extra text.",
    "",
    `localDateKey: ${localDateKey}`,
    `theme: ${selectedTheme}`,
    `style: ${selectedStyle}`,
  ].join("\n");

  const quoteResponse = await callGemini(
    geminiApiKey,
    "gemini-2.5-flash-lite",
    quotePrompt,
    0.9,
  );

  const rawJson = extractTextFromGeminiResponse(quoteResponse) || "{}";
  const parsed = quotePayloadSchema.parse(
    JSON.parse(normalizeJsonResponseText(rawJson)),
  );

  const unsplashQuery = parsed.keywords.slice(0, 3).join(" ");

  const photo = await searchUnsplashPhoto(unsplashKey, unsplashQuery);
  const imageBuffer = await downloadImage(photo.downloadUrl);
  const composited = await compositeQuoteOnImage(imageBuffer, parsed.quote);

  const blob = await put(
    `daily/${localDateKey}.png`,
    composited,
    {
      access: "public",
      contentType: "image/png",
      token: blobToken,
    },
  );

  const storyPrompt = [
    "Write a short, uplifting fictional story (180-320 words).",
    "It must clearly connect to the given quote, theme, and style.",
    "Use plain paragraphs, no title, no markdown.",
    "",
    `Theme: ${selectedTheme}`,
    `Style: ${selectedStyle}`,
    `Quote: ${parsed.quote}`,
  ].join("\n");
  const storyResponse = await callGemini(
    geminiApiKey,
    "gemini-2.5-flash-lite",
    storyPrompt,
    0.85,
  );

  const story = extractTextFromGeminiResponse(storyResponse);
  if (story.length < 120) {
    throw new Error("Story generation returned too little text");
  }

  try {
    return await prisma.dailyContent.create({
      data: {
        localDateKey,
        quote: parsed.quote,
        story,
        imageSourceUrl: photo.pageUrl,
        imageCompositedUrl: blob.url,
        unsplashAuthorName: photo.authorName,
        unsplashAuthorUrl: photo.authorUrl,
      },
    });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2002") {
      const again = await prisma.dailyContent.findUnique({ where: { localDateKey } });
      if (again) return again;
    }
    throw e;
  }
}
