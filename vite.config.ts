import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function corsProxyPlugin() {
  return {
    name: 'iptv-cors-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/proxy', async (req: any, res: any) => {
        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.statusCode = 204;
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url, 'http://localhost');
        const targetUrl = parsedUrl.searchParams.get('url');
        if (!targetUrl) {
          res.statusCode = 400;
          res.end('Missing url param');
          return;
        }

        try {
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (SmartHub; SMART-TV; U; Linux/Tizen 6.0; SmartTV) AppleWebKit/537.36'
            }
          });

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.statusCode = response.status;
          const contentType = response.headers.get('content-type') || '';
          if (contentType) res.setHeader('Content-Type', contentType);

          // If it's an HLS m3u8 playlist, rewrite relative chunk URLs to go through the proxy!
          if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL')) {
            const text = await response.text();
            const effectiveUrl = response.url || targetUrl;
            const effectiveObj = new URL(effectiveUrl);
            const targetBase = effectiveUrl.substring(0, effectiveUrl.lastIndexOf('/') + 1);
            
            // Rewrite lines that are relative or absolute URLs to point to /api/proxy?url=
            const rewritten = text.split('\n').map((line: string) => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) return line;
              
              let fullChunkUrl = trimmed;
              if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                fullChunkUrl = trimmed;
              } else if (trimmed.startsWith('/')) {
                fullChunkUrl = `${effectiveObj.origin}${trimmed}`;
              } else {
                fullChunkUrl = `${targetBase}${trimmed}`;
              }
              return `/api/proxy?url=${encodeURIComponent(fullChunkUrl)}`;
            }).join('\n');

            res.end(rewritten);
            return;
          }

          if (response.body) {
            const { Readable } = await import('node:stream');
            Readable.fromWeb(response.body as any).pipe(res);
          } else {
            const arrayBuffer = await response.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          }
        } catch (err: any) {
          res.statusCode = 502;
          res.end('Proxy error: ' + err?.message);
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), corsProxyPlugin()],
  base: './',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true
  }
});
