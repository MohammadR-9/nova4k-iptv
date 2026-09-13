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

        const abortController = new AbortController();
        res.on('close', () => {
          try { abortController.abort(); } catch {}
        });

        try {
          const forwardHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (SmartHub; SMART-TV; U; Linux/Tizen 6.0; SmartTV) AppleWebKit/537.36'
          };
          if (req.headers.range) {
            forwardHeaders['Range'] = req.headers.range;
          }

          const response = await fetch(targetUrl, {
            headers: forwardHeaders,
            signal: abortController.signal
          });

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
          res.statusCode = response.status;
          const contentType = response.headers.get('content-type') || '';
          if (contentType) res.setHeader('Content-Type', contentType);
          const isM3u8 = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL');
          const isMediaStream = targetUrl.includes('.ts') || targetUrl.includes('.mp4') || targetUrl.includes('.mkv') || contentType.includes('video/') || contentType.includes('audio/');

          // If it's an HLS m3u8 playlist, rewrite relative chunk URLs to go through the proxy!
          if (isM3u8) {
            const text = await response.text();
            const effectiveUrl = response.url || targetUrl;
            const effectiveObj = new URL(effectiveUrl);
            const targetBase = effectiveUrl.substring(0, effectiveUrl.lastIndexOf('/') + 1);
            
            // Rewrite lines that are relative or absolute URLs to point to /api/proxy?url=
            const rewritten = text.split('\n').map((line: string) => {
              const trimmed = line.trim();
              if (!trimmed) return line;

              // Handle AES-128 encryption keys
              if (trimmed.startsWith('#EXT-X-KEY:')) {
                return trimmed.replace(/URI="([^"]+)"/, (_match, uri) => {
                  let fullKeyUrl = uri;
                  if (uri.startsWith('http://') || uri.startsWith('https://')) {
                    fullKeyUrl = uri;
                  } else if (uri.startsWith('/')) {
                    fullKeyUrl = `${effectiveObj.origin}${uri}`;
                  } else {
                    fullKeyUrl = `${targetBase}${uri}`;
                  }
                  return `URI="/api/proxy?url=${encodeURIComponent(fullKeyUrl)}"`;
                });
              }

              if (trimmed.startsWith('#')) return line;
              
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

            res.setHeader('Content-Length', Buffer.byteLength(rewritten));
            res.end(rewritten);
            return;
          }

          // For video/audio media chunks (e.g. .ts, .mp4), stream directly and forward content-length & range
          if (isMediaStream) {
            const contentLength = response.headers.get('content-length');
            if (contentLength) res.setHeader('Content-Length', contentLength);
            const contentRange = response.headers.get('content-range');
            if (contentRange) res.setHeader('Content-Range', contentRange);
            const acceptRanges = response.headers.get('accept-ranges');
            res.setHeader('Accept-Ranges', acceptRanges || 'bytes');

            if (response.body) {
              const { Readable } = await import('node:stream');
              const stream = Readable.fromWeb(response.body as any);
              stream.on('error', () => {});
              res.on('close', () => {
                try { stream.destroy(); } catch {}
              });
              stream.pipe(res);
              return;
            }
          }

          // For all JSON, API, and text data: fetch() already decompressed it (gzip), so calculate actual Buffer length!
          const arrayBuffer = await response.arrayBuffer();
          const buf = Buffer.from(arrayBuffer);
          res.setHeader('Content-Length', buf.byteLength);
          res.end(buf);
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
