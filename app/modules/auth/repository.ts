import type { AuthUser } from '#shared/schemas/auth'

/**
 * The only place in the client code that knows login/logout live behind
 * `/api/auth/*` — the same role as `stationRepository`.
 */
export const authRepository = {
  login(username: string, password: string): Promise<AuthUser> {
    return $fetch<AuthUser>('/api/auth/login', { method: 'POST', body: { username, password } })
  },

  async logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
  }
}
