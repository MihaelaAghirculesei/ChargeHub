<script setup lang="ts">
import StationDetail from '~/modules/stations/components/StationDetail.vue'
import { useStation } from '~/modules/stations/composables/useStation'

const route = useRoute()
const { t } = useI18n()

const rawId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
const parsedId = Number(rawId)

if (!Number.isInteger(parsedId) || parsedId <= 0) {
  throw createError({ statusCode: 404, statusMessage: t('stations.notFound'), fatal: true })
}

// `await` here (not `lazy`) is what makes the content arrive in the HTML
// of the first response — the day-9 "Done when" — and not only after
// hydration: in SSR and in client navigation alike, the rest of the script
// (including the 404 check below) does not run until the fetch is
// resolved.
const { station, error: fetchError } = await useStation(parsedId)

if (fetchError.value) {
  throw createError({
    statusCode: 502,
    statusMessage: t('stations.fetchError'),
    fatal: true
  })
}
if (!station.value) {
  throw createError({ statusCode: 404, statusMessage: t('stations.notFound'), fatal: true })
}

// From here on `station.value` is verified non-null: pinned in a constant
// so the rest of the script does not have to re-argue it.
const currentStation = station.value

useSeoMeta({
  title: `${currentStation.name} – ChargeHub`,
  description: `Ladestation ${currentStation.name}${currentStation.address.town ? ` in ${currentStation.address.town}` : ''}, Betreiber ${currentStation.operator}.`,
  ogTitle: currentStation.name,
  ogDescription: `Ladestation von ${currentStation.operator} mit ${currentStation.connectors.length} Anschlüssen.`
})

// JSON-LD manuale (nessun modulo schema.org installato): ElectricVehicleChargingStation
// è il tipo schema.org dedicato, non un tipo generico forzato per il caso.
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ElectricVehicleChargingStation',
        name: currentStation.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: currentStation.address.line1 ?? undefined,
          addressLocality: currentStation.address.town ?? undefined,
          postalCode: currentStation.address.postcode ?? undefined,
          addressCountry: currentStation.address.country ?? undefined
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: currentStation.latitude,
          longitude: currentStation.longitude
        }
      })
    }
  ]
})
</script>

<template>
  <v-container class="py-8">
    <StationDetail :station="currentStation" />
  </v-container>
</template>
