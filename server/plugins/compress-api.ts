import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

/**
 * Same problem as `compress-html.ts` but for the JSON responses of
 * `server/api/**`, which that plugin explicitly does not cover (its
 * `render:response` hook only fires for the rendered HTML document). Found
 * measuring `/de/sessions` with Lighthouse after fixing the Intl formatter
 * loop (`useLocaleFormatters.ts`): TBT dropped from ~1000ms to ~300ms but
 * LCP stayed at ~6s — `GET /api/sessions` transfers 605KB of uncompressed
 * JSON (`curl -H "Accept-Encoding: gzip, br"` confirms no `Content-Encoding`
 * in the response), by far the heaviest resource on the page.
 *
 * Hooks onto h3's `beforeResponse` hook (Nitro forwards it under the same
 * name): fires for every request, not just page render, with the raw value
 * returned by the handler in `response.body` — not yet serialised. Filtered
 * on `/api/` paths: the HTML document already goes through
 * `compress-html.ts`, and rewriting `response.body` here for a page route
 * (an HTML string) would risk double handling (h3 exposes no way to know
 * from here whether `render:response` has already run).
 *
 * `val.buffer` (h3, `handleHandlerResponse`) treats a `Buffer` as a
 * ready-made response and sends it straight via `send(event, val)` with no
 * explicit type — which is why the content-type must be set by hand BEFORE
 * reassigning `response.body`, not left to the default path (which would
 * still expect an object/array for it to serialise itself).
 */
const MIN_COMPRESSIBLE_BYTES = 1024
const BROTLI_QUALITY = 5

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    if (!event.path.startsWith('/api/')) return
    if (response.body === null || response.body === undefined) return
    if (Buffer.isBuffer(response.body) || isStream(response.body)) return

    const json = typeof response.body === 'string' ? response.body : JSON.stringify(response.body)
    if (json.length < MIN_COMPRESSIBLE_BYTES) return

    const acceptEncoding = getRequestHeader(event, 'accept-encoding') ?? ''

    let compressed: Buffer
    if (acceptEncoding.includes('br')) {
      compressed = brotliCompressSync(json, {
        params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY }
      })
      setResponseHeader(event, 'content-encoding', 'br')
    } else if (acceptEncoding.includes('gzip')) {
      compressed = gzipSync(json)
      setResponseHeader(event, 'content-encoding', 'gzip')
    } else {
      return
    }

    setResponseHeader(event, 'content-type', 'application/json')
    removeResponseHeader(event, 'content-length')
    response.body = compressed
  })
})
