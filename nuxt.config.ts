// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['vuetify-nuxt-module', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/i18n', '@nuxt/eslint'],
  runtimeConfig: {
    // Solo server: mai esposta al bundle client.
    ocmApiKey: '',
    public: {
      appName: 'ChargeHub'
    }
  },
  typescript: {
    strict: true,
    typeCheck: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true
      }
    }
  },
  i18n: {
    locales: [
      { code: 'de', language: 'de-DE', name: 'Deutsch' },
      { code: 'en', language: 'en-US', name: 'English' }
    ],
    defaultLocale: 'de',
    strategy: 'prefix_except_default'
  },
  eslint: {
    config: {
      typescript: {
        strict: true
      }
    }
  }
})