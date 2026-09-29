import os from 'node:os';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Prefer home-LAN IPv4 so phones don't get stuck on HMR to 0.0.0.0 / VPN adapters. */
function preferLanHost(): string {
  const candidates: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      const family = String(net.family);
      if (family !== 'IPv4' && family !== '4') continue;
      if (net.internal) continue;
      candidates.push(net.address);
    }
  }
  return (
    candidates.find((ip) => ip.startsWith('192.168.')) ??
    candidates.find((ip) => ip.startsWith('10.')) ??
    candidates.find((ip) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) ??
    candidates[0] ??
    'localhost'
  );
}

const lanHost = preferLanHost();
const port = 5173;

export default defineConfig({
  base: './',
  server: {
    // Accept connections from phone / other devices
    host: '0.0.0.0',
    port,
    strictPort: true,
    // Critical for iOS Safari over LAN: do NOT point HMR at 0.0.0.0
    // (Safari can sit forever on the blue loading bar while the WS fails).
    hmr: {
      host: lanHost,
      port,
      clientPort: port,
      protocol: 'ws',
    },
    // Avoid occasional stalled module graphs on mobile networks
    warmup: {
      clientFiles: ['./src/main.ts', './src/styles/main.css'],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    sourcemap: false,
    minify: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/apple-touch-icon.png',
        'icons/maskable-512.png',
      ],
      manifest: {
        name: 'MatrixNotes',
        short_name: 'MatrixNotes',
        description: 'Fast offline workout logger',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        lang: 'en',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              expiration: { maxEntries: 10 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
