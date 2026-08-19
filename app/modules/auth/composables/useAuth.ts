import { useAuthUser } from '~/modules/auth/composables/useAuthUser'
import { authRepository } from '~/modules/auth/repository'

/**
 * Punto di ingresso pubblico per l'autenticazione (login mock, Giorno 16).
 * `user` è lo stato condiviso di `useAuthUser()` (sincronizzato con la
 * sessione server via il plugin `auth-session.ts`, non riletto qui) —
 * `login`/`logout` lo scrivono, il resto dell'app lo legge tramite
 * `isLoggedIn`/`isOperator`, mai chiamando `authRepository` direttamente.
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
