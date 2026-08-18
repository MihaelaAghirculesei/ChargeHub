<script setup lang="ts">
const { mobile } = useDisplay()
const { isDark, toggleTheme } = useAppTheme()

const drawer = ref(!mobile.value)
const rail = ref(true)

const navItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/', disabled: false },
  { title: 'Stationen', icon: 'mdi-ev-station', to: '/stations', disabled: true },
  { title: 'Sitzungen', icon: 'mdi-history', to: '/sessions', disabled: true },
  { title: 'Auswertungen', icon: 'mdi-chart-bar', to: '/analytics', disabled: true },
  { title: 'Tarife', icon: 'mdi-currency-eur', to: '/tariffs', disabled: true }
]
</script>

<template>
  <div>
    <v-app-bar :elevation="1" density="comfortable">
      <v-app-bar-nav-icon v-if="mobile" aria-label="Navigation öffnen" @click="drawer = !drawer" />
      <v-app-bar-title>ChargeHub</v-app-bar-title>
      <v-spacer />
      <v-btn
        :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        :aria-label="isDark ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'"
        @click="toggleTheme"
      />
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :rail="!mobile && rail"
      :temporary="mobile"
      :permanent="!mobile"
      @mouseenter="rail = false"
      @mouseleave="rail = true"
    >
      <v-list nav aria-label="Hauptnavigation">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.disabled ? undefined : item.to"
          :disabled="item.disabled"
          :prepend-icon="item.icon"
          :title="item.title"
          :subtitle="item.disabled ? 'Bald verfügbar' : undefined"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <slot />
    </v-main>
  </div>
</template>
