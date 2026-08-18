<template>
  <v-app>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <!--
        Skeleton durante la navigazione (Giorno 9): una pagina con un
        `await` a livello di script (es. app/pages/stations/[id].vue) ha un
        setup asincrono, quindi Vue la monta dentro un confine Suspense —
        `<NuxtPage>` non espone un `#fallback` proprio in questa versione,
        va avvolta a mano nel `#default` per intercettarlo. Pagine senza
        `await` a livello di script (es. la lista stazioni, che fa il fetch
        dentro un componente figlio) risolvono subito e non mostrano mai
        questo fallback.
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
