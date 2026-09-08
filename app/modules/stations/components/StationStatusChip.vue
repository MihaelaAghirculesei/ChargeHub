<script setup lang="ts">
/**
 * `isOperational` (OCM boolean) decides colour/icon; `label` is the
 * registry's actual text (e.g. "Operational", "Planned for Future Date") —
 * we do not reinvent it, so there is no need to map every string OCM uses
 * by hand. Colour never alone: icon + text always present (an accessibility
 * requirement, see docs/adr/0001-design-system.md).
 */
const props = defineProps<{
  isOperational: boolean | null
  label: string
}>()

const STATUS_BY_OPERATIONAL: Record<'true' | 'false' | 'null', { color: string; icon: string }> = {
  true: { color: 'success', icon: 'mdi-check-circle' },
  false: { color: 'error', icon: 'mdi-alert-circle' },
  null: { color: 'surface-variant', icon: 'mdi-help-circle' }
}

const status = computed(
  () => STATUS_BY_OPERATIONAL[String(props.isOperational) as 'true' | 'false' | 'null']
)
</script>

<template>
  <!--
    OCM status strings can be long ("Planned For Future Date") and the
    Status column is narrow on a phone. Let the chip wrap onto two lines
    (grow the row) instead of clipping or forcing a horizontal scrollbar.
  -->
  <v-chip
    :color="status.color"
    :prepend-icon="status.icon"
    variant="flat"
    size="small"
    class="status-chip"
  >
    {{ label }}
  </v-chip>
</template>

<style scoped>
.status-chip {
  max-width: 100%;
  height: auto;
  min-height: 24px;
  padding-block: 2px;
}

.status-chip :deep(.v-chip__content) {
  white-space: normal;
  line-height: 1.2;
}
</style>
