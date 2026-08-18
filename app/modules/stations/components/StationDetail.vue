<script setup lang="ts">
import type { Connector, Station } from '#shared/schemas/station'
import type { ChargePointTelemetry } from '#shared/schemas/telemetry'
import ChargePointStatusChip from '~/modules/stations/components/ChargePointStatusChip.vue'
import StationMiniMap from '~/modules/stations/components/StationMiniMap.vue'
import StationStatusChip from '~/modules/stations/components/StationStatusChip.vue'
import TelemetryConnectionIndicator from '~/modules/stations/components/TelemetryConnectionIndicator.vue'
import { useLiveTelemetry } from '~/modules/stations/composables/useLiveTelemetry'

const props = defineProps<{ station: Station }>()

const { t } = useI18n()
const { formatDate: formatLocaleDate } = useLocaleFormatters()
const { telemetry, status: connectionStatus } = useLiveTelemetry(() => [props.station.id])

const liveByConnectorId = computed(() => {
  const map = new Map<number, ChargePointTelemetry>()
  for (const connectorTelemetry of telemetry.value[0]?.connectors ?? []) {
    map.set(connectorTelemetry.connectorId, connectorTelemetry)
  }
  return map
})

interface ConnectorWithTelemetry {
  connector: Connector
  live: ChargePointTelemetry | undefined
}

const connectorsWithTelemetry = computed<ConnectorWithTelemetry[]>(() =>
  props.station.connectors.map((connector) => ({
    connector,
    live: liveByConnectorId.value.get(connector.id)
  }))
)

function chargingPowerPercent(entry: ConnectorWithTelemetry): number {
  if (!entry.live || entry.live.powerKw === null || !entry.connector.powerKw) return 0
  return Math.min(100, (entry.live.powerKw / entry.connector.powerKw) * 100)
}

function formatPower(powerKw: number | null): string {
  return powerKw === null ? t('common.unknown') : `${powerKw} kW`
}

function formatDate(value: string | null): string {
  if (!value) return t('common.unknown')
  return formatLocaleDate(value, { year: 'numeric', month: 'long', day: 'numeric' })
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
              {{ t('stations.detail.lastVerified', { date: formatDate(station.lastVerified) }) }}
            </span>
          </div>

          <h2 class="text-subtitle-1 font-weight-medium mb-1">
            {{ t('stations.detail.address') }}
          </h2>
          <p class="text-body-2 mb-4">
            <template v-if="station.address.line1">{{ station.address.line1 }}<br /></template>
            <template v-if="station.address.line2">{{ station.address.line2 }}<br /></template>
            {{
              [station.address.postcode, station.address.town].filter(Boolean).join(' ') ||
              t('common.unknown')
            }}<br />
            <template v-if="station.address.country">{{ station.address.country }}</template>
          </p>

          <!--
            Non "Öffnungszeiten": OCM non ha un campo di orari strutturato,
            solo il tipo di accesso (UsageType) e note libere di chi ha
            censito la stazione (AccessComments, spesso — non sempre —
            informazioni sugli orari). Vedi docs/PROGRESS.md, Giorno 9.
          -->
          <h2 class="text-subtitle-1 font-weight-medium mb-1">{{ t('stations.detail.access') }}</h2>
          <p class="text-body-2 mb-0">{{ station.usageType ?? t('common.unknown') }}</p>
          <p v-if="station.address.accessComments" class="text-body-2 text-medium-emphasis">
            {{ station.address.accessComments }}
          </p>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-item>
          <v-card-title class="d-flex align-center justify-space-between">
            <span class="text-subtitle-1">{{ t('stations.detail.connectorsTitle') }}</span>
            <TelemetryConnectionIndicator :status="connectionStatus" />
          </v-card-title>
        </v-card-item>
        <v-list lines="two">
          <v-list-item v-for="entry in connectorsWithTelemetry" :key="entry.connector.id">
            <v-list-item-title class="d-flex align-center flex-wrap ga-2">
              {{ entry.connector.type }}
              <ChargePointStatusChip v-if="entry.live" :status="entry.live.status" />
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ entry.connector.level ?? t('common.unknown') }} &middot;
              {{ formatPower(entry.connector.powerKw) }} &middot; {{ entry.connector.quantity }}x
            </v-list-item-subtitle>
            <template v-if="entry.live?.status === 'Charging'">
              <v-progress-linear
                :model-value="chargingPowerPercent(entry)"
                color="info"
                height="6"
                rounded
                class="mt-2"
              />
              <p class="text-caption text-medium-emphasis mt-1 mb-0">
                {{ entry.live.powerKw }} kW &middot; {{ entry.live.sessionEnergyKwh }} kWh
              </p>
            </template>
          </v-list-item>
          <v-list-item v-if="station.connectors.length === 0">
            <v-list-item-title class="text-medium-emphasis">
              {{ t('stations.detail.noConnectors') }}
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
