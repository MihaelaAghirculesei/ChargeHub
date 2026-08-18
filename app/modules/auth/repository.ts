import type { AuthUser } from '#shared/schemas/auth'

/**
 * Unico punto del codice client che sa che login/logout vivono dietro
 * `/api/auth/*` — stesso ruolo di `stationRepository`.
 */
export const authRepository = {
  login(username: string, password: string): Promise<AuthUser> {
    return $fetch<AuthUser>('/api/auth/login', { method: 'POST', body: { username, password } })
  },

  async logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
  }
}
