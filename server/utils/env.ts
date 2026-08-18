import { z } from 'zod'

const envSchema = z.object({
  ocmApiKey: z.string().min(1, 'NUXT_OCM_API_KEY mancante: registrati su https://openchargemap.org/site/develop/api e impostala in .env')
})

export type ValidatedEnv = z.infer<typeof envSchema>

export function validateEnv(): ValidatedEnv {
  const config = useRuntimeConfig()

  const result = envSchema.safeParse({
    ocmApiKey: config.ocmApiKey
  })

  if (!result.success) {
    const details = result.error.issues.map((issue) => `- ${issue.message}`).join('\n')
    throw new Error(`Configurazione ambiente non valida:\n${details}`)
  }

  return result.data
}
