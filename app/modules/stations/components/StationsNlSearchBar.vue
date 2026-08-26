<script setup lang="ts">
import { useNlSearch } from '~/modules/stations/composables/useNlSearch'

const { t } = useI18n()
const { search, pending, error } = useNlSearch()

const query = ref('')

const errorText = computed(() => {
  if (!error.value) return null
  return t(`stations.nlSearch.error.${error.value}`)
})

function onSubmit() {
  // `clearable` di Vuetify azzera il v-model a `null`, non a `''` — normalizzato
  // qui così `search()` riceve sempre una stringa.
  search(query.value ?? '')
}
</script>

<template>
  <div class="mb-4">
    <!-- `@submit.prevent` senza handler: previene solo un eventuale reload di
         pagina da submit implicito del form. L'azione parte da UNA sola via
         per input — `@keydown.enter` sul campo, `@click` sul bottone (niente
         `type="submit"`): dentro `#append-inner` il submit nativo del form
         non scatta in modo affidabile — VField intercetta il mousedown — e
         tenere sia il submit del form sia i due handler manderebbe ogni
         ricerca doppia (2 chiamate Claude). `search()` ignora comunque da sé
         una chiamata mentre `pending` è true, come rete di sicurezza. -->
    <v-form @submit.prevent>
      <v-text-field
        v-model="query"
        :label="t('stations.nlSearch.label')"
        :placeholder="t('stations.nlSearch.placeholder')"
        :loading="pending"
        :disabled="pending"
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        density="comfortable"
        @click:clear="error = null"
        @keydown.enter="onSubmit"
      >
        <template #append-inner>
          <v-btn
            :aria-label="t('stations.nlSearch.submit')"
            icon="mdi-arrow-right"
            size="small"
            variant="text"
            :loading="pending"
            :disabled="!query?.trim()"
            @click="onSubmit"
          />
        </template>
      </v-text-field>
    </v-form>
    <v-alert
      v-if="errorText"
      type="error"
      density="compact"
      variant="tonal"
      class="mt-2"
      closable
      @click:close="error = null"
    >
      {{ errorText }}
    </v-alert>
  </div>
</template>
