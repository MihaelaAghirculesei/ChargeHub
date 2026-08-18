import { getAuthSession } from '~~/server/utils/auth-session'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  await session.clear()
  return { success: true }
})
