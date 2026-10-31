// Cuts the four 3×3 ticker sheets into one transparent sprite per ticker.
// Keys each grid cell against its own backdrop by chromaticity, so the soft gradients and ground shadows drop out too.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SHEETS = [
  ["t1", ["AAPL", "AMD", "AMZN", "ASML", "BABA", "CLSK", "COIN", "CRCL", "CRWV"]],
  ["t2", ["DELL", "EWY", "GLD", "GME", "GOOGL", "INTC", "IONQ", "META", "MSFT"]],
  ["t3", ["MSTR", "MU", "NBIS", "NVDA", "ORCL", "PLTR", "QQQ", "RGTI", "RKLB"]],
  ["t4", ["SLV", "SNDK", "SPCX", "SPY", "TSLA", "TSM", "USAR", "USO"]],
];
const here = (p) => new URL(p, import.meta.url).pathname;
const WEB = here("../app/public/mascots/t/");
const PNG = here("../server/mascots/t/");
mkdirSync(WEB, { recursive: true });
mkdirSync(PNG, { recursive: true });

const chroma = (r, g, b) => {
  const s = r + g + b || 1;
  return [r / s, g / s, b / s];
};
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

for (const [sheet, names] of SHEETS) {
  const { data, info } = await sharp(here(`raw/${sheet}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const cw = Math.floor(W / 3), ch = Math.floor(H / 3);

  for (const [k, name] of names.entries()) {
    const ox = (k % 3) * cw, oy = Math.floor(k / 3) * ch;
    const at = (x, y) => ((oy + y) * W + ox + x) * 3;

    // backdrop = median of the cell's border ring
    const ring = [];
    for (let i = 0; i < cw; i += 4) for (const y of [3, ch - 4]) ring.push(at(i, y));
    for (let i = 0; i < ch; i += 4) for (const x of [3, cw - 4]) ring.push(at(x, i));
    const med = (c) => ring.map((i) => data[i + c]).sort((a, b) => a - b)[ring.length >> 1];
    const bg = [med(0), med(1), med(2)];
    const bgC = chroma(...bg), bgL = lum(...bg);

    const alpha = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const i = at(x, y);
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const c = chroma(r, g, b);
        const dc = Math.hypot(c[0] - bgC[0], c[1] - bgC[1], c[2] - bgC[2]);
        let a = Math.min(1, Math.max(0, (dc - 0.035) / 0.07));
        const L = lum(r, g, b);
        if (L < bgL * 0.3) a = 1; // near-black parts of a character, not shadow
        if (L > Math.min(250, bgL * 1.6)) a = Math.max(a, Math.min(1, (L - bgL * 1.6) / 30)); // highlights / whites
        alpha[y * cw + x] = a;
      }

    // tight box over solid pixels, ignoring stray specks
    let x0 = cw, x1 = 0, y0 = ch, y1 = 0;
    const solid = (x, y) => alpha[y * cw + x] > 0.6;
    for (let y = 2; y < ch - 2; y++) {
      let n = 0;
      for (let x = 0; x < cw; x++) n += solid(x, y) ? 1 : 0;
      if (n > 4) (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
    }
    for (let x = 2; x < cw - 2; x++) {
      let n = 0;
      for (let y = 0; y < ch; y++) n += solid(x, y) ? 1 : 0;
      if (n > 4) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x));
    }
    const pad = 6;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(cw - 1, x1 + pad); y1 = Math.min(ch - 1, y1 + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;

    // square canvas, feet on the floor, so every sprite lines up the same way in the UI
    const S = Math.max(w, h);
    const out = Buffer.alloc(S * S * 4);
    const dx = Math.floor((S - w) / 2), dy = S - h;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const a = alpha[(y0 + y) * cw + x0 + x];
        if (a <= 0) continue;
        const i = at(x0 + x, y0 + y), o = ((dy + y) * S + dx + x) * 4;
        // unmix the backdrop from soft edges
        for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, a < 1 ? (data[i + c] - (1 - a) * bg[c]) / a : data[i + c]));
        out[o + 3] = Math.round(a * 255);
      }
    const img = sharp(out, { raw: { width: S, height: S, channels: 4 } });
    await img.clone().resize(240, 240).webp({ quality: 86, alphaQuality: 90 }).toFile(`${WEB}${name}.webp`);
    await img.clone().resize(200, 200).png({ compressionLevel: 9 }).toFile(`${PNG}${name}.png`);
  }
  console.log(sheet, "done", names.length);
}
