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
      First keyboard-reachable element (Day 18): invisible until it receives
      focus (see app/assets/css/accessibility.css), skips the nav and goes
      straight to the content — without it, a keyboard user has to traverse
      the whole app bar/drawer on every page change.
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
        Explicit language switch (plan: localized routing, no automatic
        Accept-Language redirect — see nuxt.config.ts,
        detectBrowserLanguage: false): without this control, English would
        only be reachable by typing /en/... by hand.
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
        `role="presentation"`: Vuetify gives `role="list"` to this element
        but `role="link"` (not "listitem") to the `v-list-item`s with `:to`
        — an ARIA-invalid combination (`aria-required-children`, found with
        axe-core, Day 18). No list semantics needed here: it is a group of
        navigation links already inside the drawer's `<nav>` landmark, with
        its own label.
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
