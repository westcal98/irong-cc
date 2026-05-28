// Pure Node.js PNG generator — no external deps, uses only built-in zlib
const zlib = require('zlib');
const fs = require('fs');

// CRC32 for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length, 0);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([lb, tb, data, cb]);
}

function generatePNG(width, height, drawFn) {
  const pixels = new Uint8Array(width * height * 4);
  drawFn(pixels, width, height);

  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 4) + 1 + x * 4;
      raw[di] = pixels[si]; raw[di+1] = pixels[si+1];
      raw[di+2] = pixels[si+2]; raw[di+3] = pixels[si+3];
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function drawIcon(pixels, W, H) {
  const BG    = [0x08, 0x08, 0x08]; // #080808
  const COL_I = [0xFF, 0xFF, 0xFF]; // #FFFFFF — white
  const COL_G = [0x5B, 0x9E, 0xC9]; // #5B9EC9 — steel blue

  // Fill background
  for (let i = 0; i < W * H; i++) {
    pixels[i*4] = BG[0]; pixels[i*4+1] = BG[1]; pixels[i*4+2] = BG[2]; pixels[i*4+3] = 255;
  }

  function fillRect(x, y, w, h, color) {
    const x0 = Math.round(x), y0 = Math.round(y);
    const x1 = Math.round(x + w), y1 = Math.round(y + h);
    for (let py = Math.max(0, y0); py < Math.min(H, y1); py++) {
      for (let px = Math.max(0, x0); px < Math.min(W, x1); px++) {
        const idx = (py * W + px) * 4;
        pixels[idx] = color[0]; pixels[idx+1] = color[1];
        pixels[idx+2] = color[2]; pixels[idx+3] = 255;
      }
    }
  }

  // All measurements at 192px base, scaled by s = W/192
  const s = W / 192;

  // Oswald Bold proportions — large letters, no gap, fills the icon
  const letterH = 124;  // tall
  const iW      = 30;   // I: solid vertical bar
  const gW      = 76;   // G: wider for visual balance
  const gap     = 0;    // no gap — different colors create natural separation
  const sw      = 17;   // stroke weight — bold Oswald feel (~22% of gW)

  const totalW = iW + gap + gW;                // 106px
  const startX = (192 - totalW) / 2;           // ~43px margin
  const startY = (192 - letterH) / 2;          // ~34px margin

  const x0  = startX * s;
  const y0  = startY * s;
  const lH  = letterH * s;
  const liW = iW * s;
  const lgW = gW * s;
  const lg  = gap * s;
  const lsw = sw * s;

  // ── "I" ─────────────────────────────────────────────
  // Oswald Bold I = plain vertical rectangle, no serifs
  fillRect(x0, y0, liW, lH, COL_I);

  // ── "G" ─────────────────────────────────────────────
  // C-shape with crossbar at vertical center, right stem lower half only
  const gx   = x0 + liW + lg;
  const gy   = y0;
  const midY = lH * 0.50; // crossbar centered at midpoint

  // Left vertical stem (full height)
  fillRect(gx, gy, lsw, lH, COL_G);
  // Top horizontal bar
  fillRect(gx, gy, lgW, lsw, COL_G);
  // Bottom horizontal bar
  fillRect(gx, gy + lH - lsw, lgW, lsw, COL_G);
  // Crossbar — right half at center height
  fillRect(gx + lgW * 0.48, gy + midY - lsw * 0.5, lgW * 0.52, lsw, COL_G);
  // Right vertical stem — from crossbar bottom down to bottom bar top
  fillRect(gx + lgW - lsw, gy + midY + lsw * 0.5, lsw, lH * 0.5 - lsw * 1.5, COL_G);
}

const out = '/mnt/c/Users/westc/GitProjects/irong-cc/public';

const png192 = generatePNG(192, 192, drawIcon);
fs.writeFileSync(`${out}/icon-192.png`, png192);
console.log('icon-192.png written —', png192.length, 'bytes');

const png512 = generatePNG(512, 512, drawIcon);
fs.writeFileSync(`${out}/icon-512.png`, png512);
console.log('icon-512.png written —', png512.length, 'bytes');
