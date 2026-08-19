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
    <!--
      Primo elemento raggiungibile da tastiera (Giorno 18): invisibile finché
      non riceve focus (vedi app/assets/css/accessibility.css), salta la nav
      e va dritto al contenuto — senza, un utente da tastiera deve attraversare
      tutta la app bar/drawer ad ogni cambio pagina.
    -->
    <a class="skip-link" href="#main-content">{{ t('common.skipToContent') }}</a>

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
        <v-list density="compact" role="presentation">
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
      <!--
        `role="presentation"`: Vuetify dà `role="list"` a questo elemento ma
        `role="link"` (non "listitem") ai `v-list-item` con `:to` — una
        combinazione non valida per ARIA (`aria-required-children`, trovato
        con axe-core, Giorno 18). Qui non serve semantica di lista: è un
        gruppo di link di navigazione già dentro il landmark `<nav>` del
        drawer, con la propria etichetta.
      -->
      <v-list nav role="presentation" :aria-label="t('nav.mainNav')">
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

    <v-main id="main-content" tabindex="-1">
      <slot />
    </v-main>
  </div>
</template>
