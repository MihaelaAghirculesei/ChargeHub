<script setup lang="ts">
import { useAuth } from '~/modules/auth'

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({ title: t('auth.seoTitle') })

const route = useRoute()
const { isLoggedIn, login } = useAuth()

// Già autenticato (es. link riaperto dopo login): non ha senso mostrare di
// nuovo il form, si va dove si sarebbe andati comunque.
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
        <v-card-title>{{ t('auth.login') }}</v-card-title>
        <v-card-subtitle>{{ t('auth.loginSubtitle') }}</v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <v-alert v-if="error" type="error" class="mb-4" :text="error" />
        <v-form @submit.prevent="submit">
          <v-text-field
            v-model="username"
            :label="t('auth.username')"
            autocomplete="username"
            class="mb-2"
          />
          <v-text-field
            v-model="password"
            type="password"
            :label="t('auth.password')"
            autocomplete="current-password"
            class="mb-4"
          />
          <v-btn type="submit" color="primary" variant="flat" block :loading="loading">
            {{ t('auth.login') }}
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>
