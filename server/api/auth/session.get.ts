import type { AuthUser } from '#shared/schemas/auth'
import { getAuthSession } from '~~/server/utils/auth-session'

/**
 * Il client scopre lo stato della sessione da qui, non leggendo il cookie
 * lui stesso — è httpOnly per design (vedi auth-session.ts).
 */
export default defineEventHandler(async (event): Promise<AuthUser | null> => {
  const session = await getAuthSession(event)
  if (!session.data.username || !session.data.role) return null
  return { username: session.data.username, role: session.data.role }
})
