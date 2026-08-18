export default defineNitroPlugin(() => {
  try {
    validateEnv()
  } catch (error) {
    // Le eccezioni sincrone nei plugin Nitro non arrestano il dev server:
    // usciamo esplicitamente per un fallimento immediato e leggibile al boot.
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
})
