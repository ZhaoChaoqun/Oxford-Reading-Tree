import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const publicDir = resolve(projectRoot, 'public');

const iconTargets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

const transparentPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5P4WQAAAAASUVORK5CYII=';

mkdirSync(publicDir, { recursive: true });

async function generateWithCanvas() {
  const { createCanvas } = await import('canvas');

  for (const { name, size } of iconTargets) {
    const canvas = createCanvas(size, size);
    const context = canvas.getContext('2d');
    const center = size / 2;
    const radius = size * 0.36;

    context.fillStyle = '#FFF7ED';
    context.fillRect(0, 0, size, size);

    context.fillStyle = '#F97316';
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#FFFFFF';
    context.font = `700 ${Math.floor(size * 0.22)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('OT', center, center);

    writeFileSync(resolve(publicDir, name), canvas.toBuffer('image/png'));
  }
}

function generateFallbackPngs() {
  const buffer = Buffer.from(transparentPngBase64, 'base64');

  for (const { name } of iconTargets) {
    writeFileSync(resolve(publicDir, name), buffer);
  }
}

try {
  await generateWithCanvas();
  console.log('Generated placeholder icons with canvas.');
} catch (error) {
  generateFallbackPngs();
  console.log(
    `Canvas unavailable, wrote minimal placeholder PNGs instead: ${error.message}`
  );
}