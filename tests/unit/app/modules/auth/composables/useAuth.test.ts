import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuth } from '~/modules/auth/composables/useAuth'
import { useAuthUser } from '~/modules/auth/composables/useAuthUser'

afterEach(() => {
  useAuthUser().value = null
})

describe('useAuth', () => {
  it('isLoggedIn/isOperator reflect the current user state', () => {
    const { isLoggedIn, isOperator } = useAuth()

    expect(isLoggedIn.value).toBe(false)
    expect(isOperator.value).toBe(false)

    useAuthUser().value = { username: 'viewer', role: 'viewer' }
    expect(isLoggedIn.value).toBe(true)
    expect(isOperator.value).toBe(false)

    useAuthUser().value = { username: 'operator', role: 'operator' }
    expect(isOperator.value).toBe(true)
  })

  it('login calls the repository and updates the user state', async () => {
    registerEndpoint('/api/auth/login', {
      method: 'POST',
      handler: () => ({ username: 'operator', role: 'operator' })
    })

    const { login, user } = useAuth()
    await login('operator', 'operator123')

    expect(user.value).toEqual({ username: 'operator', role: 'operator' })
  })

  it('logout calls the repository and clears the user state', async () => {
    registerEndpoint('/api/auth/logout', {
      method: 'POST',
      handler: () => ({ success: true })
    })
    useAuthUser().value = { username: 'viewer', role: 'viewer' }

    const { logout, user } = useAuth()
    await logout()

    expect(user.value).toBeNull()
  })
})
