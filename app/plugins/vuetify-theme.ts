/**
 * Applies to the Vuetify theme the value already in the `chargehub-theme`
 * cookie. Uses the `vuetify:before-create` hook (instead of `useTheme()`,
 * which needs a setup context) so the theme is already correct when Vuetify
 * is created, in SSR and client hydration alike, with no flash on reload
 * (see useAppTheme).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const themeCookie = useThemeCookie()

  nuxtApp.hooks.hook('vuetify:before-create', ({ vuetifyOptions }) => {
    if (!vuetifyOptions.theme) return
    vuetifyOptions.theme.defaultTheme = themeCookie.value
  })
})
