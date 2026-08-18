<script setup lang="ts">
import type { ChargePointStatus } from '#shared/schemas/telemetry'

/**
 * Riusa gli stessi 4 ruoli semantici Vuetify della palette di dominio
 * (docs/adr/0001-design-system.md) — non a caso: gli stati OCPP simulati
 * (Giorno 10) sono esattamente il caso per cui quella palette era pensata.
 */
const props = defineProps<{ status: ChargePointStatus }>()

const STATUS_META: Record<ChargePointStatus, { color: string; icon: string; label: string }> = {
  Available: { color: 'success', icon: 'mdi-check-circle', label: 'Verfügbar' },
  Charging: { color: 'info', icon: 'mdi-battery-charging-high', label: 'Lädt' },
  Faulted: { color: 'error', icon: 'mdi-alert-circle', label: 'Gestört' },
  Offline: { color: 'surface-variant', icon: 'mdi-power-plug-off', label: 'Offline' }
}

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <v-chip :color="meta.color" :prepend-icon="meta.icon" variant="flat" size="small">
    {{ meta.label }}
  </v-chip>
</template>
