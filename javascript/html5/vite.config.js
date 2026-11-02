import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(import.meta.dirname, 'src'),
  publicDir: false,
  base: './',
  plugins: [offlineWorker()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
});

function offlineWorker() {
  return {
    name: 'dice-cup-five-offline-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      this.emitFile({
        type: 'asset',
        fileName: 'thirdparty/three/LICENSE',
        source: readFileSync(resolve(import.meta.dirname, 'src/thirdparty/three/LICENSE')),
      });
      const manifestFile = Object.keys(bundle).find((file) => file.endsWith('.webmanifest'));
      const iconFile = Object.keys(bundle).find((file) => file.endsWith('/img/dice-icon.svg'));
      if (manifestFile && iconFile) {
        const manifest = JSON.parse(String(bundle[manifestFile].source));
        manifest.icons = manifest.icons.map((icon) => ({
          ...icon,
          src: `./${iconFile.slice(iconFile.lastIndexOf('/') + 1)}`,
        }));
        bundle[manifestFile].source = JSON.stringify(manifest, null, 2);
      }
      const assets = Object.keys(bundle).filter((file) =>
        /\.(html|js|css|svg|webmanifest)$/.test(file),
      );
      const precache = ['./', ...assets.map((file) => `./${file}`)];
      const source = `const CACHE_NAME = 'dice-cup-five-v2';
const PRECACHE_URLS = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key.startsWith('dice-cup-five-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
