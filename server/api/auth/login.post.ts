import { z } from 'zod'
import { getAuthSession, MOCK_ACCOUNTS } from '~~/server/utils/auth-session'

const bodySchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  // `xForwardedFor: true`: dietro il proxy Vercel l'IP reale del chiamante
  // arriva in `X-Forwarded-For`, non come indirizzo socket diretto.
  const clientIp = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

  const rateLimitStatus = loginRateLimiter.status(clientIp)
  if (rateLimitStatus.blocked) {
    setResponseHeader(event, 'Retry-After', rateLimitStatus.retryAfterSeconds)
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Versuche. Bitte später erneut versuchen.'
    })
  }

  const parsed = await readValidatedBody(event, (body) => bodySchema.safeParse(body))

  if (!parsed.success) {
    loginRateLimiter.recordFailure(clientIp)
    throw createError({ statusCode: 400, statusMessage: 'Benutzername und Passwort erforderlich.' })
  }

  const account = MOCK_ACCOUNTS[parsed.data.username]
  if (!account || account.password !== parsed.data.password) {
    loginRateLimiter.recordFailure(clientIp)
    throw createError({ statusCode: 401, statusMessage: 'Benutzername oder Passwort falsch.' })
  }

  loginRateLimiter.recordSuccess(clientIp)

  const session = await getAuthSession(event)
  await session.update({ username: parsed.data.username, role: account.role })

  return session.data
})
