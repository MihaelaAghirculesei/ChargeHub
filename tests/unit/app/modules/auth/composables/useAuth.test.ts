import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuth } from '~/modules/auth/composables/useAuth'
import { useAuthUser } from '~/modules/auth/composables/useAuthUser'

afterEach(() => {
  useAuthUser().value = null
})

describe('useAuth', () => {
  it('isLoggedIn/isOperator riflettono lo stato utente corrente', () => {
    const { isLoggedIn, isOperator } = useAuth()

    expect(isLoggedIn.value).toBe(false)
    expect(isOperator.value).toBe(false)

    useAuthUser().value = { username: 'viewer', role: 'viewer' }
    expect(isLoggedIn.value).toBe(true)
    expect(isOperator.value).toBe(false)

    useAuthUser().value = { username: 'operator', role: 'operator' }
    expect(isOperator.value).toBe(true)
  })

  it('login chiama il repository e aggiorna lo stato utente', async () => {
    registerEndpoint('/api/auth/login', {
      method: 'POST',
      handler: () => ({ username: 'operator', role: 'operator' })
    })

    const { login, user } = useAuth()
    await login('operator', 'operator123')

    expect(user.value).toEqual({ username: 'operator', role: 'operator' })
  })

  it('logout chiama il repository e azzera lo stato utente', async () => {
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
