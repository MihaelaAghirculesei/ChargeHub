// In dev, Nitro riesegue i plugin ad ogni reload (modifiche a server/,
// nuxt.config.ts, .env, ecc.), non solo al primo avvio. Se usciamo con
// process.exit(1) ad ogni esecuzione rischiamo di terminare il server
// per un reload innocuo; usciamo quindi solo al primo boot del processo.
const globalKey = '__chargehubEnvValidatedOnce'

export default defineNitroPlugin(() => {
  try {
    validateEnv()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    if (!(globalThis as Record<string, unknown>)[globalKey]) {
      // Le eccezioni sincrone nei plugin Nitro non arrestano il dev server:
      // usciamo esplicitamente per un fallimento immediato e leggibile al boot.
      process.exit(1)
    }
    return
  }

  ;(globalThis as Record<string, unknown>)[globalKey] = true
})
