<script setup lang="ts">
/**
 * `<html lang>` is not handled on its own: without this, it stays absent
 * from the HTML whatever the active language (verified with a raw `curl`) —
 * a real accessibility problem (screen reader/pronunciation), not just SEO.
 */
const { locale } = useI18n()
useHead({ htmlAttrs: { lang: locale } })
</script>

<template>
  <v-app>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <!--
        Skeleton during navigation (day 9): a page with a script-level
        `await` (e.g. app/pages/stations/[id].vue) has an async setup, so
        Vue mounts it inside a Suspense boundary — `<NuxtPage>` does not
        expose a `#fallback` of its own in this version, it must be wrapped
        by hand in `#default` to intercept it. Pages without a script-level
        `await` (e.g. the station list, which fetches inside a child
        component) resolve immediately and never show this fallback.
      -->
      <NuxtPage>
        <template #default="{ Component, route }">
          <Suspense>
            <component :is="Component" :key="route.path" />
            <template #fallback>
              <v-container class="py-8">
                <v-skeleton-loader type="article" />
              </v-container>
            </template>
          </Suspense>
        </template>
      </NuxtPage>
    </NuxtLayout>
  </v-app>
</template>
