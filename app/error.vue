<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Sostituisce l'intero albero di `app.vue` quando Nuxt intercetta un errore
 * fatale (404 compreso) — non passa da `<NuxtLayout>`, serve il proprio
 * `<v-app>` per il contesto Vuetify, altrimenti i componenti non hanno tema.
 */
const props = defineProps<{ error: NuxtError }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ htmlAttrs: { lang: locale } })
useSeoMeta({ title: t('errorPage.seoTitle') })

const isNotFound = computed(() => props.error.statusCode === 404)

function goHome() {
  clearError({ redirect: localePath('/') })
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" sm="8" md="5" class="text-center">
            <div class="text-h1 font-weight-bold text-primary mb-2">
              {{ error.statusCode }}
            </div>
            <h1 class="text-h5 mb-3">
              {{ isNotFound ? t('errorPage.notFoundTitle') : t('errorPage.genericTitle') }}
            </h1>
            <p class="text-body-1 text-medium-emphasis mb-6">
              {{ isNotFound ? t('errorPage.notFoundText') : t('errorPage.genericText') }}
            </p>
            <v-btn color="primary" variant="flat" prepend-icon="mdi-home" @click="goHome">
              {{ t('errorPage.backHome') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>
