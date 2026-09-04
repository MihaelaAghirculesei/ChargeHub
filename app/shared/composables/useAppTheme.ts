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
 * Light/dark theme persisted via cookie (read in SSR too), so the first
 * paint already arrives in the correct theme and there is no flash on
 * reload.
 */
export function useAppTheme() {
  const theme = useTheme()
  const themeCookie = useThemeCookie()

  const isDark = computed(() => theme.name.value === 'dark')

  function setTheme(name: AppThemeName) {
    theme.change(name)
    themeCookie.value = name
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { isDark, setTheme, toggleTheme }
}

export { THEME_COOKIE_NAME, useThemeCookie }
