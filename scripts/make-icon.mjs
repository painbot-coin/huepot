#!/usr/bin/env node
/**
 * Writes the Huepot app icons. The house mark is a gold-rimmed seal with the
 * four pot colors — not the Next/Vercel sample triangle.
 *
 * Usage: node scripts/make-icon.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");

const INK = [7, 6, 20];
const WELL = [28, 22, 48];
const GOLD_HI = [243, 212, 138];
const GOLD = [212, 175, 106];
const GOLD_LO = [120, 90, 40];
const CRIMSON = [255, 53, 94];
const AMBER = [255, 176, 32];
const AZURE = [46, 168, 255];
const VIOLET = [139, 92, 255];
const WHITE = [255, 255, 255];

function clamp(n, lo, hi) {
  return n < lo ? lo : n > hi ? hi : n;
}

function mix(a, b, t) {
  const u = clamp(t, 0, 1);
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
  ];
}

function cover(dist) {
  return clamp(0.5 - dist, 0, 1);
}

function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}

function sdRoundBox(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - hw + r;
  const dy = Math.abs(y - cy) - hh + r;
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r;
}

function paint(size, round = false) {
  const rgba = Buffer.alloc(size * size * 4);
  const last = size - 1;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const x = (px + 0.5) / size;
      const y = (py + 0.5) / size;

      const wellT = clamp(1 - Math.hypot(x - 0.5, y - 0.42) / 0.72, 0, 1);
      let col = mix(INK, WELL, wellT * wellT);
      const plate = round
        ? sdCircle(x, y, 0.5, 0.5, 0.5)
        : sdRoundBox(x, y, 0.5, 0.5, 0.5, 0.5, 0.22);
      let alpha = cover(plate * size);

      const rim = (round
        ? Math.abs(sdCircle(x, y, 0.5, 0.5, 0.46))
        : Math.abs(sdRoundBox(x, y, 0.5, 0.5, 0.438, 0.438, 0.18))) * size;
      const goldT = clamp((y - 0.12) / 0.76, 0, 1);
      const gold = mix(GOLD_HI, mix(GOLD, GOLD_LO, goldT), goldT);
      const rimA = cover(rim - 0.9);
      col = mix(col, gold, rimA);
      alpha = Math.max(alpha, rimA);

      const coins = [
        { cx: 0.5, cy: 0.61, r: 0.162, hue: VIOLET },
        { cx: 0.35, cy: 0.505, r: 0.164, hue: CRIMSON },
        { cx: 0.65, cy: 0.508, r: 0.164, hue: AZURE },
        { cx: 0.5, cy: 0.4, r: 0.172, hue: AMBER },
      ];
      for (const coin of coins) {
        const d = sdCircle(x, y, coin.cx, coin.cy, coin.r) * size;
        const fill = cover(d);
        if (fill > 0) {
          const edge = cover(Math.abs(d) - 0.55) * 0.28;
          const lit = mix(coin.hue, WHITE, clamp((coin.cy - y) / (coin.r * 1.6), 0, 0.22));
          col = mix(col, mix(lit, GOLD_LO, edge), fill);
          alpha = Math.max(alpha, fill);
        }
      }

      const shine = cover(
        Math.abs(sdCircle(x, y, 0.5, 0.4, 0.118)) * size - 0.45,
      );
      const shineArc = y < 0.4 && x > 0.36 && x < 0.64 ? shine * 0.32 : 0;
      col = mix(col, WHITE, shineArc);

      const i = (py * size + px) * 4;
      rgba[i] = Math.round(clamp(col[0], 0, 255));
      rgba[i + 1] = Math.round(clamp(col[1], 0, 255));
      rgba[i + 2] = Math.round(clamp(col[2], 0, 255));
      rgba[i + 3] = Math.round(alpha * 255);

      if (!round && (px === 0 || py === 0 || px === last || py === last)) {
        rgba[i + 3] = Math.min(rgba[i + 3], 210);
      }
    }
  }
  return rgba;
}

function downsample(src, srcSize, dstSize) {
  const factor = srcSize / dstSize;
  if (factor === 1) return src;
  const dst = Buffer.alloc(dstSize * dstSize * 4);
  for (let y = 0; y < dstSize; y += 1) {
    for (let x = 0; x < dstSize; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      const x0 = Math.floor(x * factor);
      const y0 = Math.floor(y * factor);
      const x1 = Math.floor((x + 1) * factor);
      const y1 = Math.floor((y + 1) * factor);
      let n = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const i = (sy * srcSize + sx) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          a += src[i + 3];
          n += 1;
        }
      }
      const j = (y * dstSize + x) * 4;
      dst[j] = Math.round(r / n);
      dst[j + 1] = Math.round(g / n);
      dst[j + 2] = Math.round(b / n);
      dst[j + 3] = Math.round(a / n);
    }
  }
  return dst;
}

function render(size) {
  const hi = size <= 64 ? size * 4 : size;
  return downsample(paint(hi), hi, size);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let b = 0; b < 8; b += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  const payloads = [];
  let offset = 6 + 16 * images.length;
  for (const image of images) {
    const png = encodePng(image.size, image.size, image.rgba);
    const entry = Buffer.alloc(16);
    entry[0] = image.size >= 256 ? 0 : image.size;
    entry[1] = image.size >= 256 ? 0 : image.size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    payloads.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...payloads]);
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Huepot">
  <defs>
    <radialGradient id="well" cx="50%" cy="40%" r="68%">
      <stop offset="0%" stop-color="#1c1630"/>
      <stop offset="100%" stop-color="#070614"/>
    </radialGradient>
    <linearGradient id="gold" x1="16" y1="1" x2="16" y2="31" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f3d48a"/>
      <stop offset="55%" stop-color="#d4af6a"/>
      <stop offset="100%" stop-color="#8a6a32"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7.2" fill="url(#well)"/>
  <rect x="1.35" y="1.35" width="29.3" height="29.3" rx="6.1" fill="none" stroke="url(#gold)" stroke-width="1.7"/>
  <circle cx="16" cy="19.5" r="5.15" fill="#8b5cff"/>
  <circle cx="11.2" cy="16.15" r="5.2" fill="#ff355e"/>
  <circle cx="20.8" cy="16.25" r="5.2" fill="#2ea8ff"/>
  <circle cx="16" cy="12.85" r="5.45" fill="#ffb020"/>
  <path d="M12.15 12.15 C13.55 11 14.9 10.55 16 10.55 C17.15 10.55 18.5 11 19.85 12.15" fill="none" stroke="#fff" stroke-opacity="0.38" stroke-width="1.05" stroke-linecap="round"/>
</svg>
`;

const sizes = {
  16: render(16),
  32: render(32),
  48: render(48),
  180: render(180),
  512: render(512),
};

writeFileSync(join(APP, "icon.svg"), svg, "utf8");
writeFileSync(join(APP, "icon.png"), encodePng(512, 512, sizes[512]));
writeFileSync(join(APP, "apple-icon.png"), encodePng(180, 180, sizes[180]));
writeFileSync(
  join(APP, "favicon.ico"),
  encodeIco([
    { size: 16, rgba: sizes[16] },
    { size: 32, rgba: sizes[32] },
    { size: 48, rgba: sizes[48] },
  ]),
);
writeFileSync(
  join(ROOT, "public", "icon-chatzy.png"),
  encodePng(512, 512, paint(512, true)),
);

console.log("Wrote src/app/favicon.ico, icon.svg, icon.png, apple-icon.png, public/icon-chatzy.png");
