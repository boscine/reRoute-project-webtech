import QRCode from '../backend/node_modules/qrcode/lib/index.js';
import fs from 'fs';
import path from 'path';

const locations = [
  { slug: 'nh-gf', name: 'North Hall — Ground Floor' },
  { slug: 'nh-f1', name: 'North Hall — Floor 1' },
  { slug: 'nh-f2', name: 'North Hall — Floor 2' },
  { slug: 'nh-f3', name: 'North Hall — Floor 3' },
  { slug: 'sc-b1', name: 'Science Centre — Basement Lab' },
  { slug: 'sc-f1', name: 'Science Centre — Floor 1' },
  { slug: 'sc-f2', name: 'Science Centre — Floor 2' },
  { slug: 'sh-l1', name: 'Student Hub — Level 1 Dining & Commons' },
  { slug: 'sh-l2', name: 'Student Hub — Level 2 Student Affairs' },
  { slug: 'lib-f1', name: 'Library Building — Floor 1 Circulation' },
  { slug: 'lib-f2', name: 'Library Building — Floor 2 Quiet Study' },
  { slug: 'lib-f3', name: 'Library Building — Floor 3 Archives' },
];

const outDir = path.resolve('qr-codes');
fs.mkdirSync(outDir, { recursive: true });

const baseUrl = 'http://localhost:5173';

(async () => {
  for (const loc of locations) {
    const targetUrl = `${baseUrl}/?loc=${loc.slug}`;
    const png = await QRCode.toFile(path.join(outDir, `reroute-qr-${loc.slug}.png`), targetUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    console.log(`generated qr-codes/reroute-qr-${loc.slug}.png -> ${targetUrl}`);
  }
  console.log(`done: ${locations.length} QR images in ${outDir}`);
})();
