import type { AuthUser } from '#shared/schemas/auth'

/**
 * Stato di sessione condiviso client/server: popolato una volta sola dal
 * plugin (`app/plugins/auth-session.ts`), letto da `useAuth()` e dal
 * middleware `auth` — mai un secondo fetch per accedervi.
 */
export function useAuthUser() {
  return useState<AuthUser | null>('auth-user', () => null)
}
