<script setup lang="ts">
import type { TelemetryConnectionStatus } from '~/modules/stations/telemetry/transport'

/**
 * "reconnecting"/"offline" are not station-domain statuses (nothing to do
 * with the ADR-0001 palette): it is the polling connection itself, so
 * Vuetify's `warning`/`error` stay generic on purpose.
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
