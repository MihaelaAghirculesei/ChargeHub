import type { AuthUser } from '#shared/schemas/auth'

/**
 * Shared client/server session state: populated once by the plugin
 * (`app/plugins/auth-session.ts`), read by `useAuth()` and the `auth`
 * middleware — never a second fetch to access it.
 */
export function useAuthUser() {
  return useState<AuthUser | null>('auth-user', () => null)
}
