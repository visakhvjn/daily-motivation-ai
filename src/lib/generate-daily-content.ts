import { put } from "@vercel/blob";
import OpenAI from "openai";
import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { compositeQuoteOnImage } from "@/lib/image-composite";
import { downloadImage, searchUnsplashPhoto } from "@/lib/unsplash";

const quotePayloadSchema = z.object({
  quote: z.string().min(8).max(400),
  keywords: z.array(z.string().min(1).max(40)).min(1).max(4),
});

export async function generateDailyContentForDateKey(localDateKey: string) {
  const existing = await prisma.dailyContent.findUnique({
    where: { localDateKey },
  });
  if (existing) return existing;

  const openaiKey = requireEnv("OPENAI_API_KEY");
  const unsplashKey = requireEnv("UNSPLASH_ACCESS_KEY");
  const blobToken = requireEnv("BLOB_READ_WRITE_TOKEN");

  const openai = new OpenAI({ apiKey: openaiKey });

  const recent = await prisma.dailyContent.findMany({
    orderBy: { createdAt: "desc" },
    take: 14,
    select: { quote: true, localDateKey: true },
  });

  const quoteCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You write one original motivational quote per day. Avoid clichés repeated from the provided list. Return strict JSON with keys quote (string) and keywords (array of 1-3 short English nouns/adjectives for stock photo search, no people names).",
      },
      {
        role: "user",
        content: JSON.stringify({
          localDateKey,
          avoidQuotes: recent.map((r) => r.quote),
        }),
      },
    ],
    temperature: 0.9,
  });

  const rawJson = quoteCompletion.choices[0]?.message?.content ?? "{}";
  const parsed = quotePayloadSchema.parse(JSON.parse(rawJson));
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

  const storyCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Write a short, uplifting fictional story (180-320 words) that clearly connects to the given quote. Use plain paragraphs, no title, no markdown.",
      },
      {
        role: "user",
        content: `Quote:\n${parsed.quote}`,
      },
    ],
    temperature: 0.85,
  });

  const story = (storyCompletion.choices[0]?.message?.content ?? "").trim();
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
