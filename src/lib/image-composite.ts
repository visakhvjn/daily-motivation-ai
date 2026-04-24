import sharp from "sharp";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let interLatin600Base64 = "";

function getEmbeddedInterFontFace() {
  if (!interLatin600Base64) {
    const fontPath = require.resolve(
      "@fontsource/inter/files/inter-latin-600-normal.woff",
    );
    interLatin600Base64 = readFileSync(fontPath).toString("base64");
  }

  return `@font-face {
  font-family: "InterEmbedded";
  src: url("data:font/woff;base64,${interLatin600Base64}") format("woff");
  font-weight: 600;
  font-style: normal;
}`;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text: string, maxLen: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxLen) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 6);
}

export async function compositeQuoteOnImage(
  imageBuffer: Buffer,
  quote: string,
): Promise<Buffer> {
  const resized = await sharp(imageBuffer)
    .resize({
      width: 1200,
      withoutEnlargement: true,
    })
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 800;
  const overlayHeight = Math.min(Math.round(height * 0.28), 360);
  const lines = wrapLines(quote, 42);
  const fontSize = lines.length > 4 ? 22 : 28;
  const lineHeight = Math.round(fontSize * 1.35);
  const startY = Math.round(overlayHeight / 2 - ((lines.length - 1) * lineHeight) / 2);

  const textSvg = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${startY + i * lineHeight}" text-anchor="middle" fill="#ffffff" font-size="${fontSize}" font-family="InterEmbedded, sans-serif" font-weight="600">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const svg = `
<svg width="${width}" height="${overlayHeight}" xmlns="http://www.w3.org/2000/svg">
  <style>
    ${getEmbeddedInterFontFace()}
  </style>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(0,0,0,0.05)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0.72)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  ${textSvg}
</svg>`;

  return sharp(resized)
    .composite([
      {
        input: Buffer.from(svg),
        top: height - overlayHeight,
        left: 0,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
