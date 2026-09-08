import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createMediaMap, localMediaPlugin, LOCAL_MEDIA_BASE } from './scripts/local-media.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Vite plugin: injects a build timestamp into APP_CACHE_VERSION in the output
 * sw.js and sw.normal.js files. This changes the SW file bytes on every build,
 * causing browsers to detect a new SW and install it — eliminating the need to
 * manually clear Safari data after each deploy.
 */
function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    closeBundle() {
      const ts = Date.now();
      const swFiles = [
        resolve(__dirname, 'dist/sw.js'),
        resolve(__dirname, 'dist/sw.normal.js'),
      ];
      for (const swPath of swFiles) {
        if (!fs.existsSync(swPath)) continue;
        let content = fs.readFileSync(swPath, 'utf8');
        const updated = content.replace(
          /APP_CACHE_VERSION\s*=\s*['"][^'"]*['"]/,
          `APP_CACHE_VERSION = 'v${ts}'`
        );
        if (updated === content) {
          console.warn(`[injectSwVersion] Pattern not found in ${swPath}`);
        } else {
          fs.writeFileSync(swPath, updated);
          console.log(`[injectSwVersion] Injected version v${ts} into ${swPath}`);
        }
      }
    },
  };
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, __dirname, 'OXFORD_');
  if (env.OXFORD_SAME_ORIGIN_MEDIA && !['0', '1'].includes(env.OXFORD_SAME_ORIGIN_MEDIA)) {
    throw new Error('OXFORD_SAME_ORIGIN_MEDIA must be 0 or 1.');
  }
  const sameOriginMedia = env.OXFORD_SAME_ORIGIN_MEDIA === '1';
  const mediaDirectory = command === 'serve' && !isPreview ? env.OXFORD_MEDIA_DIR : '';
  const mediaPlugins = mediaDirectory ? [localMediaPlugin(
    resolve(__dirname, mediaDirectory),
    createMediaMap(
      JSON.parse(fs.readFileSync(resolve(__dirname, 'src/data/books.json'), 'utf8')).books,
      JSON.parse(fs.readFileSync(resolve(__dirname, 'src/data/videos.json'), 'utf8')).videos
    )
  )] : [];

  return {
    base: './',
    plugins: [react(), injectSwVersion(), ...mediaPlugins],
    define: {
      'import.meta.env.VITE_LOCAL_MEDIA_BASE_URL': JSON.stringify(mediaDirectory || sameOriginMedia ? LOCAL_MEDIA_BASE : ''),
    },
    resolve: {
      alias: {
        'pdfjs-worker': resolve(
          __dirname,
          'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
        ),
      },
    },
    optimizeDeps: {
      exclude: ['pdfjs-dist'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('pdfjs-dist')) return 'pdfjs';
            if (id.includes('node_modules')) return 'vendor';
          },
        },
      },
    },
  };
});
