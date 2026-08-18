<script setup lang="ts">
import type { TelemetryConnectionStatus } from '~/modules/stations/telemetry/transport'

/**
 * "reconnecting"/"offline" non sono stati del dominio stazioni (niente a che
 * fare con la palette di ADR-0001): è la connessione al polling stesso, quindi
 * `warning`/`error` di Vuetify restano generici apposta.
 */
const props = defineProps<{ status: TelemetryConnectionStatus }>()

const { t } = useI18n()

const STATUS_META: Record<TelemetryConnectionStatus, { color: string; icon: string }> = {
  live: { color: 'success', icon: 'mdi-circle-medium' },
  reconnecting: { color: 'warning', icon: 'mdi-progress-clock' },
  offline: { color: 'error', icon: 'mdi-wifi-off' }
}

const meta = computed(() => ({
  ...STATUS_META[props.status],
  label: t(`telemetryConnection.${props.status}`)
}))
</script>

<template>
  <v-chip :color="meta.color" :prepend-icon="meta.icon" variant="tonal" size="small">
    {{ meta.label }}
  </v-chip>
</template>
