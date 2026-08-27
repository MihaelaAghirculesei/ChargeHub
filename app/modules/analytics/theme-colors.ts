/**
 * Chart colours read from the active Vuetify theme, never hardcoded
 * (required by the plan) — the same pattern already used for the map
 * markers (`StationsMap.vue`, day 7): `theme.current.value.colors[key]`,
 * reactive to the light/dark switch.
 */
export function useChartThemeColors() {
  const theme = useTheme()

  function colorFor(key: string): string {
    return theme.current.value.colors[key] ?? '#888888'
  }

  return { colorFor }
}
