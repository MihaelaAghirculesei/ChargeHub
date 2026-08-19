<script setup lang="ts">
import { tariffInputSchema, type Tariff, type TariffInput } from '~/modules/tariffs/domain/tariff'

const props = defineProps<{ modelValue: boolean; tariff?: Tariff | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [input: TariffInput]
}>()

const { t } = useI18n()

function defaultForm(): TariffInput {
  return { name: '', pricePerKwh: 0, blockingFeePerMinute: 0, monthlyFeeEur: 0 }
}

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const form = ref<TariffInput>(defaultForm())

watch(
  () => props.tariff,
  (tariff) => {
    form.value = tariff
      ? {
          name: tariff.name,
          pricePerKwh: tariff.pricePerKwh,
          blockingFeePerMinute: tariff.blockingFeePerMinute,
          monthlyFeeEur: tariff.monthlyFeeEur
        }
      : defaultForm()
  },
  { immediate: true }
)

const validation = computed(() => tariffInputSchema.safeParse(form.value))
const isValid = computed(() => validation.value.success)

/**
 * Traduce in base al campo, non al testo del messaggio Zod: lo schema di
 * dominio (`tariff.ts`) resta la sola fonte di verità sulla condizione di
 * validità, ma il suo messaggio è interno/difensivo (il form valida già
 * prima di poter salvare) — qui serve solo sapere "questo campo ha un
 * problema", non ripetere il messaggio Zod parola per parola.
 */
function errorsFor(field: keyof TariffInput): string[] {
  if (validation.value.success) return []
  const hasIssue = validation.value.error.issues.some((issue) => issue.path[0] === field)
  return hasIssue ? [t(`tariffs.validation.${field}`)] : []
}

function submit() {
  if (!validation.value.success) return
  emit('save', validation.value.data)
  isOpen.value = false
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="480">
    <v-card>
      <v-card-title>{{ tariff ? t('tariffs.editTariff') : t('tariffs.newTariff') }}</v-card-title>
      <v-card-text>
        <!--
          Niente `@submit.prevent` su `v-form`: internamente Vuetify chiama
          comunque un submit nativo dopo la validazione (vedi login.vue),
          e Invio in un campo qui dentro genererebbe comunque un evento
          `submit` nativo del form sottostante. `@keydown.enter` sui campi
          evita del tutto quel percorso.
        -->
        <v-form>
          <v-text-field
            v-model="form.name"
            :label="t('tariffs.name')"
            :error-messages="errorsFor('name')"
            class="mb-2"
            @keydown.enter="submit"
          />
          <v-text-field
            v-model.number="form.pricePerKwh"
            type="number"
            step="0.01"
            min="0"
            :label="t('tariffs.pricePerKwh')"
            :error-messages="errorsFor('pricePerKwh')"
            class="mb-2"
            @keydown.enter="submit"
          />
          <v-text-field
            v-model.number="form.blockingFeePerMinute"
            type="number"
            step="0.01"
            min="0"
            :label="t('tariffs.blockingFeePerMinute')"
            :error-messages="errorsFor('blockingFeePerMinute')"
            class="mb-2"
            @keydown.enter="submit"
          />
          <v-text-field
            v-model.number="form.monthlyFeeEur"
            type="number"
            step="0.01"
            min="0"
            :label="t('tariffs.monthlyFeeEur')"
            :error-messages="errorsFor('monthlyFeeEur')"
            @keydown.enter="submit"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="isOpen = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!isValid" @click="submit">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
