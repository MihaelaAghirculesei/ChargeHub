<script setup lang="ts">
import type { Station } from '#shared/schemas/station'
import StationMiniMap from '~/modules/stations/components/StationMiniMap.vue'
import StationStatusChip from '~/modules/stations/components/StationStatusChip.vue'

defineProps<{ station: Station }>()

function formatPower(powerKw: number | null): string {
  return powerKw === null ? 'Unbekannt' : `${powerKw} kW`
}

function formatDate(value: string | null): string {
  if (!value) return 'Unbekannt'
  return new Date(value).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <v-row>
    <v-col cols="12" md="7">
      <v-card class="mb-4">
        <v-card-item>
          <v-card-title class="text-h5">{{ station.name }}</v-card-title>
          <v-card-subtitle>{{ station.operator }}</v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <div class="d-flex flex-wrap align-center ga-2 mb-4">
            <StationStatusChip
              :is-operational="station.isOperational"
              :label="station.operationalStatus"
            />
            <span class="text-caption text-medium-emphasis">
              Zuletzt geprüft: {{ formatDate(station.lastVerified) }}
            </span>
          </div>

          <h2 class="text-subtitle-1 font-weight-medium mb-1">Adresse</h2>
          <p class="text-body-2 mb-4">
            <template v-if="station.address.line1">{{ station.address.line1 }}<br /></template>
            <template v-if="station.address.line2">{{ station.address.line2 }}<br /></template>
            {{
              [station.address.postcode, station.address.town].filter(Boolean).join(' ') ||
              'Unbekannt'
            }}<br />
            <template v-if="station.address.country">{{ station.address.country }}</template>
          </p>

          <!--
            Non "Öffnungszeiten": OCM non ha un campo di orari strutturato,
            solo il tipo di accesso (UsageType) e note libere di chi ha
            censito la stazione (AccessComments, spesso — non sempre —
            informazioni sugli orari). Vedi docs/PROGRESS.md, Giorno 9.
          -->
          <h2 class="text-subtitle-1 font-weight-medium mb-1">Zugang</h2>
          <p class="text-body-2 mb-0">{{ station.usageType ?? 'Unbekannt' }}</p>
          <p v-if="station.address.accessComments" class="text-body-2 text-medium-emphasis">
            {{ station.address.accessComments }}
          </p>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-item>
          <v-card-title class="text-subtitle-1">Anschlüsse</v-card-title>
        </v-card-item>
        <v-list lines="two">
          <v-list-item v-for="connector in station.connectors" :key="connector.id">
            <v-list-item-title>{{ connector.type }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ connector.level ?? 'Unbekannt' }} &middot;
              {{ formatPower(connector.powerKw) }} &middot; {{ connector.quantity }}x
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="station.connectors.length === 0">
            <v-list-item-title class="text-medium-emphasis">
              Keine Anschlussdaten verfügbar
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-col>

    <v-col cols="12" md="5">
      <StationMiniMap :latitude="station.latitude" :longitude="station.longitude" />
    </v-col>
  </v-row>
</template>
