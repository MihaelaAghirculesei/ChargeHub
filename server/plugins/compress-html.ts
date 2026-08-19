import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

/**
 * `nitro.compressPublicAssets` (nuxt.config.ts) comprime solo gli asset
 * STATICI pre-costruiti (JS/CSS/font in .output/public) — l'HTML
 * renderizzato per ogni richiesta passa da un percorso diverso (l'handler
 * di render di Nitro, non file statici) e resta scoperto (Giorno 25, gate
 * Lighthouse Performance su /de/stations/47109): verificato con
 * `curl -H "Accept-Encoding: gzip, br"`, nessun `Content-Encoding`
 * sull'HTML del documento. Con il resto della pagina già compresso, il
 * documento (~38 kB) è diventato l'asset singolo più pesante — e pesa il
 * doppio perché è il PRIMO byte del percorso critico: il browser scopre
 * gli altri asset solo dopo averlo scaricato e fatto il parsing.
 *
 * L'hook `render:response` di Nitro è il punto ufficiale per modificare
 * la risposta della pagina prima che venga inviata (vedi
 * nitropack/dist/runtime/internal/renderer.mjs: gli header vengono
 * applicati e il body restituito subito dopo questo hook, quindi
 * `content-encoding`/`content-length` finiscono coerenti col body
 * compresso). Non copre le route API (`server/api/**`, altro percorso,
 * payload JSON già piccoli — non il problema misurato qui).
 */
const MIN_COMPRESSIBLE_BYTES = 1024

// Qualità 5, non 11 (il massimo, primo tentativo): per un HTML di poche
// decine di kB generato AD OGNI richiesta (non un asset statico
// pre-compresso una volta in build) il costo CPU di qualità 11 quasi
// raddoppiava il tempo di risposta del server (misurato con Lighthouse:
// ~40ms -> ~90ms), a fronte di una differenza di pochi byte nell'output
// — un pessimo scambio quando la risposta compressa entra comunque nel
// percorso critico. Qualità 5 comprime in una frazione del tempo con una
// dimensione finale quasi identica per un HTML di queste dimensioni.
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
