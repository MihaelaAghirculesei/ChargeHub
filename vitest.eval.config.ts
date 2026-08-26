import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Config separata da vitest.config.ts apposta: quella esclude tests/eval
 * (chiama davvero l'API Claude, costo reale e non deterministico — non va
 * eseguita nella suite normale né nel gate CI). Questa la include e basta.
 *
 * `environment: 'node'`, non "nuxt" come il resto del progetto: il codice
 * sotto test qui è concettualmente server-side puro (nessun componente,
 * nessuna DOM), e l'ambiente "nuxt" porta con sé i globali di un browser
 * simulato (jsdom) — l'SDK Anthropic li rileva e rifiuta di costruire un
 * client con una chiave reale per sicurezza ("It looks like you're running
 * in a browser-like environment"), correttamente: quel controllo esiste per
 * evitare di esporre una chiave vera nel bundle di un'app client-side, non
 * per bloccare uno script locale. Alias risolti a mano perché l'ambiente
 * "nuxt" li darebbe gratis, "node" no.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/eval/**/*.eval.ts'],
    // Chiamate reali all'API, non batch di unit test: un timeout generoso
    // per caso evita falsi negativi da latenza di rete normale.
    testTimeout: 30_000
  },
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '~~': fileURLToPath(new URL('.', import.meta.url))
    }
  }
})
