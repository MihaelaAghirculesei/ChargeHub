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
  // Vuetify's `clearable` resets the v-model to `null`, not `''` — normalised
  // here so `search()` always receives a string.
  search(query.value ?? '')
}
</script>

<template>
  <div class="mb-4">
    <!-- `@submit.prevent` with no handler: only prevents a possible page
         reload from the form's implicit submit. The action fires from ONE
         path per input — `@keydown.enter` on the field, `@click` on the
         button (no `type="submit"`): inside `#append-inner` the form's
         native submit does not fire reliably — VField intercepts the
         mousedown — and keeping both the form submit and the two handlers
         would send every search twice (2 Claude calls). `search()` also
         ignores a call while `pending` is true, as a safety net. -->
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
