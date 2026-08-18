<script setup lang="ts">
import { useAuth } from '~/modules/auth'

const { mobile } = useDisplay()
const { isDark, toggleTheme } = useAppTheme()
const { user, isLoggedIn, logout } = useAuth()

const drawer = ref(!mobile.value)
const rail = ref(true)

async function handleLogout() {
  await logout()
  await navigateTo('/')
}

const navItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/', disabled: false },
  { title: 'Stationen', icon: 'mdi-ev-station', to: '/stations', disabled: false },
  { title: 'Sitzungen', icon: 'mdi-history', to: '/sessions', disabled: false },
  { title: 'Auswertungen', icon: 'mdi-chart-bar', to: '/analytics', disabled: false },
  { title: 'Tarife', icon: 'mdi-currency-eur', to: '/tariffs', disabled: false }
]
</script>

<template>
  <div>
    <v-app-bar :elevation="1" density="comfortable">
      <v-app-bar-nav-icon v-if="mobile" aria-label="Navigation öffnen" @click="drawer = !drawer" />
      <v-app-bar-title>ChargeHub</v-app-bar-title>
      <v-spacer />
      <template v-if="isLoggedIn">
        <v-chip class="mr-2" size="small" variant="tonal" prepend-icon="mdi-account">
          {{ user?.username }} · {{ user?.role }}
        </v-chip>
        <v-btn variant="text" prepend-icon="mdi-logout" @click="handleLogout">Abmelden</v-btn>
      </template>
      <v-btn v-else variant="text" prepend-icon="mdi-login" to="/login">Anmelden</v-btn>
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
