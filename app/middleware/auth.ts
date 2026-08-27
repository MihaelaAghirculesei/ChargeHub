import { useAuthUser } from '~/modules/auth/composables/useAuthUser'

/**
 * A named middleware (not `.global.ts`): protects only the routes that
 * invoke it explicitly via `definePageMeta({ middleware: 'auth' })` — the
 * rest of the app (dashboard, stations, sessions, charts) stays public. It
 * runs in SSR too (Nuxt middleware is not client-only by default), so a
 * protected route without a valid session redirects **before** the HTML of
 * the protected page is generated — no flash of content, the plan's "Done
 * when" criterion.
 */
export default defineNuxtRouteMiddleware((to) => {
  const user = useAuthUser()

  if (!user.value) {
    const localePath = useLocalePath()
    return navigateTo({ path: localePath('/login'), query: { redirectTo: to.fullPath } })
  }
})
