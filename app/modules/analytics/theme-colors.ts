/**
 * Colori dei grafici letti dal tema Vuetify attivo, mai hardcoded (richiesto
 * dal piano) — stesso pattern già usato per i marker della mappa
 * (`StationsMap.vue`, Giorno 7): `theme.current.value.colors[chiave]`,
 * reattivo al cambio light/dark.
 */
export function useChartThemeColors() {
  const theme = useTheme()

  function colorFor(key: string): string {
    return theme.current.value.colors[key] ?? '#888888'
  }

  return { colorFor }
}
