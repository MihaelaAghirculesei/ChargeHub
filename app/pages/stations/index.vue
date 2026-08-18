<script setup lang="ts">
import StationsTable from '~/modules/stations/components/StationsTable.vue'

definePageMeta({ title: 'Stationen' })
</script>

<template>
  <v-container class="py-8" fluid>
    <h1 class="text-h5 mb-4">Stationen</h1>
    <StationsTable />
  </v-container>
</template>
