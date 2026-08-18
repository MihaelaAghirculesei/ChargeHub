<script setup lang="ts">
/**
 * `isOperational` (booleano OCM) decide colore/icona; `label` è il testo
 * effettivo del registro (es. "Operational", "Planned for Future Date") — non
 * lo reinventiamo, così non serve mappare a mano ogni stringa che OCM usa.
 * Colore mai da solo: icona + testo sempre presenti (requisito di
 * accessibilità, vedi docs/adr/0001-design-system.md).
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
  <v-chip :color="status.color" :prepend-icon="status.icon" variant="flat" size="small">
    {{ label }}
  </v-chip>
</template>
