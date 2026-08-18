/**
 * Applica al tema Vuetify il valore già presente nel cookie `chargehub-theme`.
 * Usa l'hook `vuetify:before-create` (anziché `useTheme()`, che richiede un
 * contesto di setup) così il tema è già corretto quando Vuetify viene creato,
 * sia in SSR che in hydration client, senza flash al reload (vedi useAppTheme).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const themeCookie = useThemeCookie()

  nuxtApp.hooks.hook('vuetify:before-create', ({ vuetifyOptions }) => {
    if (!vuetifyOptions.theme) return
    vuetifyOptions.theme.defaultTheme = themeCookie.value
  })
})
