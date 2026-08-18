<script setup lang="ts">
import { tariffInputSchema, type Tariff, type TariffInput } from '~/modules/tariffs/domain/tariff'

const props = defineProps<{ modelValue: boolean; tariff?: Tariff | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [input: TariffInput]
}>()

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

function errorsFor(field: keyof TariffInput): string[] {
  if (validation.value.success) return []
  return validation.value.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message)
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
      <v-card-title>{{ tariff ? 'Tarif bearbeiten' : 'Neuer Tarif' }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="submit">
          <v-text-field
            v-model="form.name"
            label="Name"
            :error-messages="errorsFor('name')"
            class="mb-2"
          />
          <v-text-field
            v-model.number="form.pricePerKwh"
            type="number"
            step="0.01"
            min="0"
            label="Preis (€/kWh)"
            :error-messages="errorsFor('pricePerKwh')"
            class="mb-2"
          />
          <v-text-field
            v-model.number="form.blockingFeePerMinute"
            type="number"
            step="0.01"
            min="0"
            label="Blockiergebühr (€/Min)"
            :error-messages="errorsFor('blockingFeePerMinute')"
            class="mb-2"
          />
          <v-text-field
            v-model.number="form.monthlyFeeEur"
            type="number"
            step="0.01"
            min="0"
            label="Grundgebühr (€/Monat)"
            :error-messages="errorsFor('monthlyFeeEur')"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="isOpen = false">Abbrechen</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!isValid" @click="submit">
          Speichern
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
