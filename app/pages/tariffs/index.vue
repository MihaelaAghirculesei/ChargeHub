<script setup lang="ts">
import TariffCalculator from '~/modules/tariffs/components/TariffCalculator.vue'
import TariffFormDialog from '~/modules/tariffs/components/TariffFormDialog.vue'
import TariffsTable from '~/modules/tariffs/components/TariffsTable.vue'
import type { Tariff, TariffInput } from '~/modules/tariffs'
import { useTariffsStore } from '~/modules/tariffs'
import { useAuth } from '~/modules/auth'

/**
 * "operator" può gestire tariffe, "viewer" no (piano, Giorno 16): l'intera
 * rotta richiede solo di essere autenticati (`middleware: 'auth'`), la
 * distinzione tra i due ruoli è nella UI qui sotto (`isOperator`), non nel
 * middleware — un viewer può guardare tariffe e calcolatore, non modificarli.
 */
definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'Tarife – ChargeHub',
  description: 'Tarife verwalten und Kosten einer Ladesitzung vergleichen.'
})

const tariffsStore = useTariffsStore()
const { isOperator } = useAuth()

const dialogOpen = ref(false)
const editingTariff = ref<Tariff | null>(null)

function openCreate() {
  editingTariff.value = null
  dialogOpen.value = true
}

function openEdit(tariff: Tariff) {
  editingTariff.value = tariff
  dialogOpen.value = true
}

function handleSave(input: TariffInput) {
  if (editingTariff.value) {
    tariffsStore.update(editingTariff.value.id, input)
  } else {
    tariffsStore.add(input)
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h1 class="text-h5">Tarife</h1>
      <v-btn
        v-if="isOperator"
        prepend-icon="mdi-plus"
        color="primary"
        variant="flat"
        @click="openCreate"
      >
        Neuer Tarif
      </v-btn>
    </div>

    <v-alert v-if="!isOperator" type="info" variant="tonal" class="mb-4">
      Nur lesend: nur die Rolle "operator" kann Tarife anlegen, bearbeiten oder löschen.
    </v-alert>

    <v-card class="mb-6">
      <v-card-text>
        <TariffsTable
          :tariffs="tariffsStore.tariffs"
          :readonly="!isOperator"
          @edit="openEdit"
          @remove="tariffsStore.remove"
        />
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-item>
        <v-card-title>Kostenrechner</v-card-title>
      </v-card-item>
      <v-card-text>
        <TariffCalculator :tariffs="tariffsStore.tariffs" />
      </v-card-text>
    </v-card>

    <TariffFormDialog v-model="dialogOpen" :tariff="editingTariff" @save="handleSave" />
  </v-container>
</template>
