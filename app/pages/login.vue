<script setup lang="ts">
import { useAuth } from '~/modules/auth'

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({ title: t('auth.seoTitle') })

const route = useRoute()
const { isLoggedIn, login } = useAuth()

// Already authenticated (e.g. link reopened after login): no point showing
// the form again, go where you would have gone anyway.
if (isLoggedIn.value) {
  const target =
    typeof route.query.redirectTo === 'string' ? route.query.redirectTo : localePath('/')
  await navigateTo(target)
}

const username = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await login(username.value, password.value)
    const target =
      typeof route.query.redirectTo === 'string' ? route.query.redirectTo : localePath('/')
    await navigateTo(target)
  } catch {
    error.value = t('auth.loginError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="py-8 d-flex justify-center">
    <v-card max-width="400" width="100%">
      <v-card-item>
        <v-card-title>
          <h1 class="text-h5 ma-0">{{ t('auth.login') }}</h1>
        </v-card-title>
        <v-card-subtitle>{{ t('auth.loginSubtitle') }}</v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <v-alert v-if="error" type="error" class="mb-4" :text="error" />
        <!--
          `type="button"` + `@click`/`@keydown.enter`, non `@submit.prevent`
          su `v-form`: internamente Vuetify, dopo la validazione, chiama
          `formRef.value.submit()` — un submit nativo REALE dell'HTML
          `<form>` sottostante, che ignora qualunque `preventDefault()`
          precedente (non è generato da un evento, non c'è nulla da
          prevenire). Risultato reale osservato con un browser vero
          (Playwright): un reload nativo della pagina subito dopo il login,
          prima che `navigateTo` riuscisse a portare l'utente alla pagina di
          destinazione — non un problema visibile con `curl`, solo con
          un'interazione reale.
        -->
        <v-form>
          <v-text-field
            v-model="username"
            :label="t('auth.username')"
            autocomplete="username"
            class="mb-2"
            @keydown.enter="submit"
          />
          <v-text-field
            v-model="password"
            type="password"
            :label="t('auth.password')"
            autocomplete="current-password"
            class="mb-4"
            @keydown.enter="submit"
          />
          <v-btn
            type="button"
            color="primary"
            variant="flat"
            block
            :loading="loading"
            @click="submit"
          >
            {{ t('auth.login') }}
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>
