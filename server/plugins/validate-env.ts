// In dev, Nitro re-runs plugins on every reload (changes to server/,
// nuxt.config.ts, .env, etc.), not just on first start. If we exit with
// process.exit(1) on every run we risk killing the server on a harmless
// reload; so we only exit on the process's first boot.
const globalKey = '__chargehubEnvValidatedOnce'

export default defineNitroPlugin(() => {
  try {
    validateEnv()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    if (!(globalThis as Record<string, unknown>)[globalKey]) {
      // Synchronous exceptions in Nitro plugins do not stop the dev server:
      // exit explicitly for an immediate, readable failure at boot.
      process.exit(1)
    }
    return
  }

  ;(globalThis as Record<string, unknown>)[globalKey] = true
})
