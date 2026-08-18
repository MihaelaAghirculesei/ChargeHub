import type { AuthUser } from '#shared/schemas/auth'
import { useAuthUser } from '~/modules/auth/composables/useAuthUser'

/**
 * Popola lo stato di sessione **prima** che qualunque middleware di rotta
 * giri (i plugin Nuxt vengono eseguiti prima della navigazione iniziale) —
 * è quello che rende possibile un redirect lato server, senza flash di
 * contenuto protetto (criterio "Fatto quando" del Giorno 16).
 *
 * `useRequestFetch()`, non `$fetch` diretto: lato server serve inoltrare
 * l'header Cookie della richiesta originale alla chiamata interna verso
 * `/api/auth/session` (il cookie di sessione è httpOnly, quindi il client
 * non può leggerlo da solo) — `$fetch` puro non lo farebbe.
 */
export default defineNuxtPlugin(async () => {
  const user = useAuthUser()
  const requestFetch = useRequestFetch()

  user.value = await requestFetch<AuthUser | null>('/api/auth/session').catch(() => null)
})
