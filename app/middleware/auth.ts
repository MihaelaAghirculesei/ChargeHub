import { useAuthUser } from '~/modules/auth/composables/useAuthUser'

/**
 * Middleware con nome (non `.global.ts`): protegge solo le rotte che lo
 * richiamano esplicitamente via `definePageMeta({ middleware: 'auth' })` —
 * il resto dell'app (dashboard, stazioni, sessioni, grafici) resta
 * pubblico. Gira anche in SSR (i middleware di Nuxt non sono client-only di
 * default), quindi una rotta protetta senza sessione valida reindirizza
 * **prima** che l'HTML della pagina protetta venga generato — nessun flash
 * di contenuto, criterio "Fatto quando" del piano.
 */
export default defineNuxtRouteMiddleware((to) => {
  const user = useAuthUser()

  if (!user.value) {
    return navigateTo({ path: '/login', query: { redirectTo: to.fullPath } })
  }
})
