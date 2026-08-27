import { z } from 'zod'

const envSchema = z.object({
  ocmApiKey: z
    .string()
    .min(
      1,
      'NUXT_OCM_API_KEY missing: register at https://openchargemap.org/site/develop/api and set it in .env'
    ),
  sessionPassword: z
    .string()
    .min(
      32,
      'NUXT_SESSION_PASSWORD missing or too short (minimum 32 characters): set it in .env — used to seal the session cookie (h3 useSession)'
    )
})

export type ValidatedEnv = z.infer<typeof envSchema>

export function validateEnv(): ValidatedEnv {
  const config = useRuntimeConfig()

  const result = envSchema.safeParse({
    ocmApiKey: config.ocmApiKey,
    sessionPassword: config.sessionPassword
  })

  if (!result.success) {
    const details = result.error.issues.map((issue) => `- ${issue.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${details}`)
  }

  return result.data
}
