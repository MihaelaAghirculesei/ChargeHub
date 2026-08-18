<script setup lang="ts">
import StationsActiveFilterChips from '~/modules/stations/components/StationsActiveFilterChips.vue'
import StationsFilterBar from '~/modules/stations/components/StationsFilterBar.vue'
import StationsTable from '~/modules/stations/components/StationsTable.vue'

definePageMeta({ title: 'Stationen' })
</script>

<template>
  <v-container class="py-8" fluid>
    <h1 class="text-h5 mb-4">Stationen</h1>
    <StationsFilterBar class="mb-4" />
    <StationsActiveFilterChips />
    <StationsTable />
  </v-container>
</template>
