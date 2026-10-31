// Cuts the mascot sheet into transparent webp sprites (chroma-key on the magenta backdrop).
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = new URL("./raw/sheet1.png", import.meta.url).pathname;
const OUT = new URL("../app/public/mascots/", import.meta.url).pathname;
const NAMES = [
  ["bull", "chip", "cloud", "orb"],
  ["coin", "rocket", "gorilla", "golem", "flatty"],
];
mkdirSync(OUT, { recursive: true });

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => (y * W + x) * 4;

// backdrop colour = median-ish of the corners
const corners = [px(5, 5), px(W - 6, 5), px(5, H - 6), px(W - 6, H - 6)];
const bg = [0, 1, 2].map((c) => corners.reduce((s, i) => s + data[i + c], 0) / corners.length);

const alpha = new Float32Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = px(x, y);
    const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
    alpha[y * W + x] = Math.min(1, Math.max(0, (d - 40) / 70));
  }

const fg = (x, y) => alpha[y * W + x] > 0.5;
function runs(counts, minGap, minLen) {
  const out = [];
  let start = -1, gap = 0;
  counts.forEach((c, i) => {
    if (c > 0) {
      if (start < 0) start = i;
      gap = 0;
    } else if (start >= 0 && ++gap >= minGap) {
      if (i - gap - start > minLen) out.push([start, i - gap]);
      start = -1;
    }
  });
  if (start >= 0) out.push([start, counts.length - 1]);
  return out;
}

const rowCounts = Array.from({ length: H }, (_, y) => {
  let n = 0;
  for (let x = 0; x < W; x += 2) n += fg(x, y) ? 1 : 0;
  return n > 3 ? n : 0;
});
const bands = runs(rowCounts, 25, 150);
console.log("bands", bands);

for (const [b, [y0, y1]] of bands.entries()) {
  const colCounts = Array.from({ length: W }, (_, x) => {
    let n = 0;
    for (let y = y0; y <= y1; y++) n += fg(x, y) ? 1 : 0;
    return n > 2 ? n : 0;
  });
  const cols = runs(colCounts, 30, 120);
  console.log("band", b, cols.length, cols);
  for (const [k, [x0, x1]] of cols.entries()) {
    const name = NAMES[b]?.[k] ?? `extra-${b}-${k}`;
    // tight vertical trim inside this column
    let top = y1, bot = y0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (fg(x, y)) { top = Math.min(top, y); bot = Math.max(bot, y); }
    const pad = 8;
    const cx0 = Math.max(0, x0 - pad), cx1 = Math.min(W - 1, x1 + pad), cy0 = Math.max(0, top - pad), cy1 = Math.min(H - 1, bot + pad);
    const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1;
    const buf = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const s = px(cx0 + x, cy0 + y), o = (y * cw + x) * 4;
        const a = alpha[(cy0 + y) * W + cx0 + x];
        let [r, g, bl] = [data[s], data[s + 1], data[s + 2]];
        if (a < 1) {
          // despill the magenta fringe on edge pixels only
          const lim = Math.max(g, Math.min(r, bl) * 0.6);
          r = Math.min(r, lim + 30);
          bl = Math.min(bl, lim + 30);
        }
        buf[o] = r; buf[o + 1] = g; buf[o + 2] = bl; buf[o + 3] = Math.round(a * 255);
      }
    await sharp(buf, { raw: { width: cw, height: ch, channels: 4 } })
      .resize({ height: 360, withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 90 })
      .toFile(`${OUT}${name}.webp`);
    console.log(name, cw, ch);
  }
}
