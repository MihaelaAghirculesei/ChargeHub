import type { AuthUser } from '#shared/schemas/auth'
import { getAuthSession } from '~~/server/utils/auth-session'

/**
 * The client discovers the session state from here, not by reading the
 * cookie itself — it is httpOnly by design (see auth-session.ts).
 */
export default defineEventHandler(async (event): Promise<AuthUser | null> => {
  const session = await getAuthSession(event)
  if (!session.data.username || !session.data.role) return null
  return { username: session.data.username, role: session.data.role }
})
