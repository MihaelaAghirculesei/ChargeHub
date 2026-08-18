<script setup lang="ts">
interface StatusSample {
  label: string
  color: 'success' | 'info' | 'error' | 'surface-variant'
  icon: string
}

// Colore semantico legato al dominio, non ai nomi Vuetify di default:
// success = disponibile, info = in ricarica, error = guasto,
// surface-variant = offline. Icona + testo sempre presenti: lo stato non è
// mai comunicato dal solo colore.
const statusSamples: StatusSample[] = [
  { label: 'Verfügbar', color: 'success', icon: 'mdi-check-circle' },
  { label: 'Lädt', color: 'info', icon: 'mdi-lightning-bolt' },
  { label: 'Störung', color: 'error', icon: 'mdi-alert-circle' },
  { label: 'Offline', color: 'surface-variant', icon: 'mdi-power-plug-off' }
]
</script>

<template>
  <v-container class="py-8">
    <v-row>
      <v-col cols="12" md="8" lg="6">
        <h1 class="text-h5 mb-1">Design-System-Vorschau</h1>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Semantische Statusfarben, Layout und Dark Mode aus Tag 2. Die eigentliche Stationsliste
          folgt in einem späteren Schritt.
        </p>

        <v-card class="mb-6">
          <v-card-item>
            <v-card-title>Ladepunkt-Status</v-card-title>
          </v-card-item>
          <v-card-text class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="status in statusSamples"
              :key="status.label"
              :color="status.color"
              :prepend-icon="status.icon"
              variant="flat"
            >
              {{ status.label }}
            </v-chip>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-item>
            <v-card-title>Typografie</v-card-title>
          </v-card-item>
          <v-card-text>
            <p class="text-h6 mb-1">Überschrift (h6)</p>
            <p class="text-body-1 mb-1">
              Fließtext (body-1) mit dem System-Font-Stack aus
              <code>_variables.scss</code>.
            </p>
            <p class="text-caption text-medium-emphasis mb-0">
              Caption-Text für sekundäre Informationen.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
