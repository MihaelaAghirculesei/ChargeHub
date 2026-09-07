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
    `title` + the ellipsis rule: OCM status strings can be long ("Planned
    For Future Date"), which overflowed the narrow Status column on a phone.
    The full text stays in the DOM for screen readers and on hover; only
    the visible run is clipped.
  -->
  <v-chip
    :color="status.color"
    :prepend-icon="status.icon"
    variant="flat"
    size="small"
    :title="label"
    class="status-chip"
  >
    {{ label }}
  </v-chip>
</template>

<style scoped>
.status-chip {
  max-width: 100%;
}

.status-chip :deep(.v-chip__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
