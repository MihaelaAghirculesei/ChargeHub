import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

/**
 * Stesso problema di `compress-html.ts` ma per le risposte JSON di
 * `server/api/**`, che quel plugin esplicitamente non copre (il suo hook
 * `render:response` scatta solo per il documento HTML renderizzato). Trovato
 * misurando `/de/sessions` con Lighthouse dopo il fix del loop di formatter
 * Intl (`useLocaleFormatters.ts`): il TBT è sceso da ~1000ms a ~300ms ma la
 * LCP è rimasta a ~6s — `GET /api/sessions` trasferisce 605KB di JSON non
 * compresso (`curl -H "Accept-Encoding: gzip, br"` conferma nessun
 * `Content-Encoding` in risposta), di gran lunga la risorsa più pesante
 * della pagina.
 *
 * Aggancio sull'hook `beforeResponse` di h3 (Nitro lo inoltra con lo stesso
 * nome): scatta per ogni richiesta, non solo per il render di pagina, con
 * il valore grezzo restituito dall'handler in `response.body` — non ancora
 * serializzato. Filtrato sui path `/api/`: il documento HTML passa già da
 * `compress-html.ts`, e ririscrivere `response.body` qui per una rotta di
 * pagina (una stringa HTML) rischierebbe una doppia gestione (h3 non
 * espone un modo per sapere da qui se `render:response` è già passato).
 *
 * `val.buffer` (h3, `handleHandlerResponse`) tratta un `Buffer` come
 * risposta già pronta e lo invia direttamente via `send(event, val)` senza
 * type esplicito — per questo il content-type va impostato a mano PRIMA di
 * riassegnare `response.body`, non lasciato al percorso di default (che si
 * aspetterebbe ancora un oggetto/array da serializzare lui stesso).
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
