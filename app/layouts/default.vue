<script setup lang="ts">
import { useAuth } from '~/modules/auth'

const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const { mobile } = useDisplay()
const { isDark, toggleTheme } = useAppTheme()
const { user, isLoggedIn, logout } = useAuth()

const drawer = ref(!mobile.value)
const rail = ref(true)

async function handleLogout() {
  await logout()
  await navigateTo(localePath('/'))
}

const navItems = computed(() => [
  { title: t('nav.dashboard'), icon: 'mdi-view-dashboard', to: localePath('/'), disabled: false },
  {
    title: t('nav.stations'),
    icon: 'mdi-ev-station',
    to: localePath('/stations'),
    disabled: false
  },
  {
    title: t('nav.sessions'),
    icon: 'mdi-history',
    to: localePath('/sessions'),
    disabled: false
  },
  {
    title: t('nav.analytics'),
    icon: 'mdi-chart-bar',
    to: localePath('/analytics'),
    disabled: false
  },
  { title: t('nav.tariffs'), icon: 'mdi-currency-eur', to: localePath('/tariffs'), disabled: false }
])
</script>

<template>
  <div>
    <v-app-bar :elevation="1" density="comfortable">
      <v-app-bar-nav-icon v-if="mobile" :aria-label="t('nav.openMenu')" @click="drawer = !drawer" />
      <v-app-bar-title>ChargeHub</v-app-bar-title>
      <v-spacer />
      <template v-if="isLoggedIn">
        <v-chip class="mr-2" size="small" variant="tonal" prepend-icon="mdi-account">
          {{ user?.username }} · {{ user?.role }}
        </v-chip>
        <v-btn variant="text" prepend-icon="mdi-logout" @click="handleLogout">
          {{ t('auth.logout') }}
        </v-btn>
      </template>
      <v-btn v-else variant="text" prepend-icon="mdi-login" :to="localePath('/login')">
        {{ t('auth.login') }}
      </v-btn>
      <v-btn
        :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        variant="text"
        :aria-label="isDark ? t('nav.toLightTheme') : t('nav.toDarkTheme')"
        @click="toggleTheme"
      />
      <!--
        Cambio lingua esplicito (piano: routing localizzato, nessun redirect
        automatico da Accept-Language — vedi nuxt.config.ts,
        detectBrowserLanguage: false): senza questo controllo l'inglese
        sarebbe raggiungibile solo digitando /en/... a mano.
      -->
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn variant="text" v-bind="menuProps">{{ locale.toUpperCase() }}</v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            v-for="loc in locales"
            :key="loc.code"
            :to="switchLocalePath(loc.code)"
            :active="loc.code === locale"
          >
            <v-list-item-title>{{ loc.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :rail="!mobile && rail"
      :temporary="mobile"
      :permanent="!mobile"
      @mouseenter="rail = false"
      @mouseleave="rail = true"
    >
      <v-list nav :aria-label="t('nav.mainNav')">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.disabled ? undefined : item.to"
          :disabled="item.disabled"
          :prepend-icon="item.icon"
          :title="item.title"
          :subtitle="item.disabled ? t('nav.comingSoon') : undefined"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <slot />
    </v-main>
  </div>
</template>
