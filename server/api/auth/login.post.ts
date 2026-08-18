import { z } from 'zod'
import { getAuthSession, MOCK_ACCOUNTS } from '~~/server/utils/auth-session'

const bodySchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const parsed = await readValidatedBody(event, (body) => bodySchema.safeParse(body))

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Benutzername und Passwort erforderlich.' })
  }

  const account = MOCK_ACCOUNTS[parsed.data.username]
  if (!account || account.password !== parsed.data.password) {
    throw createError({ statusCode: 401, statusMessage: 'Benutzername oder Passwort falsch.' })
  }

  const session = await getAuthSession(event)
  await session.update({ username: parsed.data.username, role: account.role })

  return session.data
})
