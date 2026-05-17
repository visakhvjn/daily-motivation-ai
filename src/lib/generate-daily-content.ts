import { put } from "@vercel/blob";
import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
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

type StoryPromptContext = {
  localDateKey: string;
  theme: string;
  style: string;
  quote: string;
};

type StoryPromptType = {
  id: string;
  temperature: number;
  buildPrompt: (ctx: StoryPromptContext) => string;
};

const STORY_PROMPT_TYPES: StoryPromptType[] = [
  {
    id: "fictional",
    temperature: 0.85,
    buildPrompt: () =>
      [
        "Write a short, uplifting fictional story.",
        "Invent relatable characters and a clear arc: struggle, turn, quiet victory.",
        "It must clearly connect to the given quote, theme, and style.",
      ].join("\n"),
  },
  {
    id: "funny",
    temperature: 0.95,
    buildPrompt: () =>
      [
        "Write a short humorous story with gentle wit and a warm, optimistic ending.",
        "Use everyday situations, mild irony, or a surprising twist — never mean-spirited or crude.",
        "Keep it workplace-safe. The motivational message of the quote should land in the final beat.",
      ].join("\n"),
  },
  {
    id: "historical",
    temperature: 0.75,
    buildPrompt: () =>
      [
        "Write a short narrative based on a well-documented true episode from history.",
        "Name the era and key figures. Stick to widely accepted facts; do not invent historical events.",
        "Draw out the human lesson and tie it clearly to the quote, theme, and style.",
      ].join("\n"),
  },
  {
    id: "current-affairs",
    temperature: 0.88,
    buildPrompt: ({ localDateKey }) =>
      [
        "Write a short narrative inspired by real-world currents around the given date.",
        `Anchor your tone to the period of localDateKey (${localDateKey}).`,
        "You may reference broad themes (science, community, climate resilience, creativity, sportsmanship, etc.) without citing specific unverified headlines.",
        "Stay non-partisan, hopeful, and respectful. Connect clearly to the quote, theme, and style.",
      ].join("\n"),
  },
  {
    id: "biographical",
    temperature: 0.8,
    buildPrompt: () =>
      [
        "Write a short narrative about a real person’s documented turning point or quiet act of courage.",
        "Use a figure widely known from biography or public record. Do not fabricate biographical facts.",
        "Focus on one vivid moment and link its lesson to the quote, theme, and style.",
      ].join("\n"),
  },
  {
    id: "parable",
    temperature: 0.9,
    buildPrompt: () =>
      [
        "Write a short allegorical parable with a timeless, lightly mythical setting.",
        "Use simple symbols and a moral that clearly echoes the quote, theme, and style.",
      ].join("\n"),
  },
];

const STORY_PROMPT_FOOTER = [
  "Use plain paragraphs, no title, no markdown.",
  "Target 180-320 words.",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickStoryPromptTypeForDateKey(localDateKey: string): StoryPromptType {
  let hash = 0;
  for (let i = 0; i < localDateKey.length; i++) {
    hash = (hash * 31 + localDateKey.charCodeAt(i)) >>> 0;
  }
  return STORY_PROMPT_TYPES[hash % STORY_PROMPT_TYPES.length];
}

function buildStoryPrompt(
  storyType: StoryPromptType,
  ctx: StoryPromptContext,
): string {
  return [
    storyType.buildPrompt(ctx),
    "",
    ...STORY_PROMPT_FOOTER,
    "",
    `Theme: ${ctx.theme}`,
    `Style: ${ctx.style}`,
    `Quote: ${ctx.quote}`,
    `localDateKey: ${ctx.localDateKey}`,
  ].join("\n");
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

  const blob = await put(
    `daily/${localDateKey}.jpg`,
    imageBuffer,
    {
      access: "public",
      contentType: "image/jpeg",
      token: blobToken,
    },
  );

  const storyContext: StoryPromptContext = {
    localDateKey,
    theme: selectedTheme,
    style: selectedStyle,
    quote: parsed.quote,
  };
  const storyType = pickStoryPromptTypeForDateKey(localDateKey);
  const storyPrompt = buildStoryPrompt(storyType, storyContext);
  const storyResponse = await callGemini(
    geminiApiKey,
    "gemini-2.5-flash-lite",
    storyPrompt,
    storyType.temperature,
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
