import type { AuthUser } from '#shared/schemas/auth'
import { useAuthUser } from '~/modules/auth/composables/useAuthUser'

/**
 * Populates the session state **before** any route middleware runs (Nuxt
 * plugins run before the initial navigation) — that is what makes a
 * server-side redirect possible, with no flash of protected content (the
 * day-16 "Done when" criterion).
 *
 * `useRequestFetch()`, not `$fetch` directly: server-side we need to
 * forward the original request's Cookie header to the internal call to
 * `/api/auth/session` (the session cookie is httpOnly, so the client cannot
 * read it itself) — plain `$fetch` would not do that.
 */
export default defineNuxtPlugin(async () => {
  const user = useAuthUser()
  const requestFetch = useRequestFetch()

  user.value = await requestFetch<AuthUser | null>('/api/auth/session').catch(() => null)
})
