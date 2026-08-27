<script setup lang="ts">
import type { ChargePointStatus } from '#shared/schemas/telemetry'

/**
 * Reuses the same 4 semantic Vuetify roles as the domain palette
 * (docs/adr/0001-design-system.md) — not by chance: the simulated OCPP
 * statuses (day 10) are exactly the case that palette was designed for.
 */
const props = defineProps<{ status: ChargePointStatus }>()

const { t } = useI18n()

const STATUS_META: Record<ChargePointStatus, { color: string; icon: string }> = {
  Available: { color: 'success', icon: 'mdi-check-circle' },
  Charging: { color: 'info', icon: 'mdi-battery-charging-high' },
  Faulted: { color: 'error', icon: 'mdi-alert-circle' },
  Offline: { color: 'surface-variant', icon: 'mdi-power-plug-off' }
}

const meta = computed(() => ({
  ...STATUS_META[props.status],
  label: t(`chargePointStatus.${props.status}`)
}))
</script>

<template>
  <v-chip :color="meta.color" :prepend-icon="meta.icon" variant="flat" size="small">
    {{ meta.label }}
  </v-chip>
</template>
