export type AppThemeName = 'light' | 'dark'

const THEME_COOKIE_NAME = 'chargehub-theme'

function useThemeCookie() {
  return useCookie<AppThemeName>(THEME_COOKIE_NAME, {
    default: () => 'light',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
}

/**
 * Tema chiaro/scuro persistito via cookie (letto anche in SSR), così il primo
 * paint arriva già nel tema corretto e non c'è flash al reload.
 */
export function useAppTheme() {
  const theme = useTheme()
  const themeCookie = useThemeCookie()

  const isDark = computed(() => theme.global.name.value === 'dark')

  function setTheme(name: AppThemeName) {
    theme.global.name.value = name
    themeCookie.value = name
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { isDark, setTheme, toggleTheme }
}

export { THEME_COOKIE_NAME, useThemeCookie }
