import { useAuthUser } from '~/modules/auth/composables/useAuthUser'
import { authRepository } from '~/modules/auth/repository'

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
