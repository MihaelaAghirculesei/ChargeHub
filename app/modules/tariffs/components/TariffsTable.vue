<script setup lang="ts">
import type { Tariff } from '~/modules/tariffs/domain/tariff'

withDefaults(defineProps<{ tariffs: Tariff[]; readonly?: boolean }>(), { readonly: false })
const emit = defineEmits<{ edit: [tariff: Tariff]; remove: [id: string] }>()
</script>

<template>
  <v-table density="comfortable">
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col" class="text-right">€/kWh</th>
        <th scope="col" class="text-right">Blockiergebühr €/Min</th>
        <th scope="col" class="text-right">Grundgebühr €/Monat</th>
        <th v-if="!readonly" scope="col"><span class="visually-hidden">Aktionen</span></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="tariff in tariffs" :key="tariff.id">
        <td>{{ tariff.name }}</td>
        <td class="text-right">{{ tariff.pricePerKwh.toFixed(2) }}</td>
        <td class="text-right">{{ tariff.blockingFeePerMinute.toFixed(2) }}</td>
        <td class="text-right">{{ tariff.monthlyFeeEur.toFixed(2) }}</td>
        <td v-if="!readonly" class="text-right text-no-wrap">
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            :aria-label="`${tariff.name} bearbeiten`"
            @click="emit('edit', tariff)"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            :aria-label="`${tariff.name} löschen`"
            @click="emit('remove', tariff.id)"
          />
        </td>
      </tr>
      <tr v-if="tariffs.length === 0">
        <td :colspan="readonly ? 4 : 5" class="text-medium-emphasis">
          Noch keine Tarife angelegt.
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
