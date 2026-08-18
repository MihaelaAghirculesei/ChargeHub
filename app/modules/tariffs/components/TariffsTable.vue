<script setup lang="ts">
import type { Tariff } from '~/modules/tariffs/domain/tariff'

withDefaults(defineProps<{ tariffs: Tariff[]; readonly?: boolean }>(), { readonly: false })
const emit = defineEmits<{ edit: [tariff: Tariff]; remove: [id: string] }>()

const { t } = useI18n()
const { formatNumber } = useLocaleFormatters()

/** Solo il numero, locale-aware — l'unità (€/kWh, €/Min, €/Monat) è già nell'intestazione di colonna. */
function formatAmount(value: number): string {
  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <v-table density="comfortable">
    <thead>
      <tr>
        <th scope="col">{{ t('tariffs.name') }}</th>
        <th scope="col" class="text-right">{{ t('tariffs.pricePerKwhShort') }}</th>
        <th scope="col" class="text-right">{{ t('tariffs.blockingFeePerMinuteShort') }}</th>
        <th scope="col" class="text-right">{{ t('tariffs.monthlyFeeEurShort') }}</th>
        <th v-if="!readonly" scope="col">
          <span class="visually-hidden">{{ t('tariffs.actions') }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="tariff in tariffs" :key="tariff.id">
        <td>{{ tariff.name }}</td>
        <td class="text-right">{{ formatAmount(tariff.pricePerKwh) }}</td>
        <td class="text-right">{{ formatAmount(tariff.blockingFeePerMinute) }}</td>
        <td class="text-right">{{ formatAmount(tariff.monthlyFeeEur) }}</td>
        <td v-if="!readonly" class="text-right text-no-wrap">
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            :aria-label="t('tariffs.editAction', { name: tariff.name })"
            @click="emit('edit', tariff)"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            :aria-label="t('tariffs.deleteAction', { name: tariff.name })"
            @click="emit('remove', tariff.id)"
          />
        </td>
      </tr>
      <tr v-if="tariffs.length === 0">
        <td :colspan="readonly ? 4 : 5" class="text-medium-emphasis">
          {{ t('tariffs.empty') }}
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
