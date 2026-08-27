import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

/**
 * `nitro.compressPublicAssets` (nuxt.config.ts) only compresses the
 * pre-built STATIC assets (JS/CSS/font in .output/public) — the HTML
 * rendered per request goes through a different path (Nitro's render
 * handler, not static files) and stays uncovered (day 25, Lighthouse
 * Performance gate on /de/stations/47109): verified with
 * `curl -H "Accept-Encoding: gzip, br"`, no `Content-Encoding` on the
 * document HTML. With the rest of the page already compressed, the
 * document (~38 kB) became the single heaviest asset — and it weighs
 * double because it is the FIRST byte on the critical path: the browser
 * discovers the other assets only after downloading and parsing it.
 *
 * Nitro's `render:response` hook is the official place to modify the page
 * response before it is sent (see
 * nitropack/dist/runtime/internal/renderer.mjs: headers are applied and
 * the body returned right after this hook, so `content-encoding` /
 * `content-length` end up consistent with the compressed body). It does
 * not cover the API routes (`server/api/**`, a different path, JSON
 * payloads already small — not the problem measured here).
 */
const MIN_COMPRESSIBLE_BYTES = 1024

// Quality 5, not 11 (the max, first attempt): for an HTML of a few tens of
// kB generated ON EVERY request (not a static asset pre-compressed once at
// build time) the CPU cost of quality 11 nearly doubled the server
// response time (measured with Lighthouse: ~40ms -> ~90ms), for a
// difference of a few bytes in the output — a bad trade when the
// compressed response is on the critical path anyway. Quality 5 compresses
// in a fraction of the time with a nearly identical final size for HTML of
// this size.
const BROTLI_QUALITY = 5

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (typeof response.body !== 'string' || response.body.length < MIN_COMPRESSIBLE_BYTES) return

    const acceptEncoding = event.node.req.headers['accept-encoding'] ?? ''
    const headers = { ...response.headers }
    delete headers['content-length']

    if (acceptEncoding.includes('br')) {
      response.body = brotliCompressSync(response.body, {
        params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY }
      })
      headers['content-encoding'] = 'br'
    } else if (acceptEncoding.includes('gzip')) {
      response.body = gzipSync(response.body)
      headers['content-encoding'] = 'gzip'
    } else {
      return
    }

    response.headers = headers
  })
})
