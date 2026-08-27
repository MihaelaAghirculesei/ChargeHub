import { useAuthUser } from '~/modules/auth/composables/useAuthUser'
import { authRepository } from '~/modules/auth/repository'

/**
 * Public entry point for authentication (mock login, day 16). `user` is the
 * shared state of `useAuthUser()` (synced with the server session via the
 * `auth-session.ts` plugin, not re-read here) — `login`/`logout` write it,
 * the rest of the app reads it through `isLoggedIn`/`isOperator`, never
 * calling `authRepository` directly.
 */
export function useAuth() {
  const user = useAuthUser()

  const isLoggedIn = computed(() => user.value !== null)
  const isOperator = computed(() => user.value?.role === 'operator')

  async function login(username: string, password: string): Promise<void> {
    user.value = await authRepository.login(username, password)
  }

  async function logout(): Promise<void> {
    await authRepository.logout()
    user.value = null
  }

  return { user, isLoggedIn, isOperator, login, logout }
}
