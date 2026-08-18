<script setup lang="ts">
import type { TelemetryConnectionStatus } from '~/modules/stations/telemetry/transport'

/**
 * "reconnecting"/"offline" non sono stati del dominio stazioni (niente a che
 * fare con la palette di ADR-0001): è la connessione al polling stesso, quindi
 * `warning`/`error` di Vuetify restano generici apposta.
 */
const props = defineProps<{ status: TelemetryConnectionStatus }>()

const STATUS_META: Record<
  TelemetryConnectionStatus,
  { color: string; icon: string; label: string }
> = {
  live: { color: 'success', icon: 'mdi-circle-medium', label: 'Live' },
  reconnecting: {
    color: 'warning',
    icon: 'mdi-progress-clock',
    label: 'Verbindung wird wiederhergestellt'
  },
  offline: { color: 'error', icon: 'mdi-wifi-off', label: 'Offline' }
}

const meta = computed(() => STATUS_META[props.status])
</script>

<template>
  <v-chip :color="meta.color" :prepend-icon="meta.icon" variant="tonal" size="small">
    {{ meta.label }}
  </v-chip>
</template>
