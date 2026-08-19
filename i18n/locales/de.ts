import { de as vuetifyDe } from 'vuetify/locale'

/**
 * `$vuetify` porta le traduzioni ufficiali dei componenti Vuetify (paginazione,
 * data-table, date-picker, ecc.) — vuetify-nuxt-module le legge da qui una
 * volta che rileva @nuxtjs/i18n (vedi vuetify-nuxt-module/dist/runtime/plugins/i18n.js:
 * usa `i18n.t()`/`i18n.n()` sugli stessi messaggi dell'app, non un set separato).
 * Senza questa chiave, Vuetify emette `[intlify] Not found '$vuetify....'`.
 */
export default {
  $vuetify: vuetifyDe,

  common: {
    unknown: 'Unbekannt',
    cancel: 'Abbrechen',
    save: 'Speichern',
    retry: 'Erneut versuchen',
    skipToContent: 'Zum Hauptinhalt springen',
    connectionRestored: 'Verbindung wiederhergestellt',
    connectionLost: 'Verbindung unterbrochen'
  },

  errorPage: {
    seoTitle: 'Fehler – ChargeHub',
    notFoundTitle: 'Seite nicht gefunden',
    notFoundText:
      'Es gibt hier nichts zu sehen — die Adresse existiert nicht oder wurde verschoben.',
    genericTitle: 'Etwas ist schiefgelaufen',
    genericText:
      'Ein unerwarteter Fehler ist aufgetreten. Versuche es erneut oder gehe zurück zum Dashboard.',
    backHome: 'Zurück zum Dashboard'
  },

  nav: {
    dashboard: 'Dashboard',
    stations: 'Stationen',
    sessions: 'Sitzungen',
    analytics: 'Auswertungen',
    tariffs: 'Tarife',
    openMenu: 'Navigation öffnen',
    mainNav: 'Hauptnavigation',
    comingSoon: 'Bald verfügbar',
    toLightTheme: 'Zum hellen Design wechseln',
    toDarkTheme: 'Zum dunklen Design wechseln'
  },

  auth: {
    seoTitle: 'Anmelden – ChargeHub',
    login: 'Anmelden',
    logout: 'Abmelden',
    loginSubtitle: 'Mock-Login, siehe README für die Testkonten',
    username: 'Benutzername',
    password: 'Passwort',
    loginError: 'Benutzername oder Passwort falsch.'
  },

  /** Stati OCPP simulati (telemetria, Giorno 10) — riusati da più componenti. */
  chargePointStatus: {
    Available: 'Verfügbar',
    Charging: 'Lädt',
    Faulted: 'Gestört',
    Offline: 'Offline'
  },

  /** Stato del trasporto (polling, Giorno 11) — concetto distinto dagli stati sopra. */
  telemetryConnection: {
    live: 'Live',
    reconnecting: 'Verbindung wird wiederhergestellt',
    offline: 'Offline'
  },

  dashboard: {
    seoTitle: 'Dashboard – ChargeHub',
    seoDescription: 'Überblick über Stationen, Ladepunkte, Nutzung und Energie der letzten 7 Tage.',
    title: 'Dashboard',
    loadError: 'KPIs konnten nicht geladen werden.',
    kpi: {
      stations: 'Stationen gesamt',
      available: 'Verfügbare Punkte',
      charging: 'In Ladung',
      faulted: 'Gestört',
      energyToday: 'kWh heute',
      utilization: 'Auslastung'
    },
    trendUnchanged: 'unverändert (7 Tage)',
    trendWindow: '{value}% (7 Tage)'
  },

  stations: {
    title: 'Stationen',
    seoTitle: 'Stationen – ChargeHub',
    viewMode: { map: 'Karte', list: 'Liste', split: 'Geteilt' },
    filters: {
      search: 'Suche (Name, Betreiber, Stadt)',
      connectionType: 'Anschlusstyp',
      operator: 'Betreiber',
      status: 'Status',
      minPower: 'Min. Leistung (kW)'
    },
    activeFilters: {
      search: 'Suche: {value}',
      minPower: '≥ {value} kW',
      clearAll: 'Alle löschen'
    },
    table: {
      name: 'Name',
      operator: 'Betreiber',
      town: 'Stadt',
      connectors: 'Anschlüsse',
      maxPower: 'Max. Leistung',
      status: 'Status'
    },
    loadError: 'Die Stationen konnten nicht geladen werden.',
    empty: {
      title: 'Keine Stationen gefunden',
      text: 'Für die aktuellen Filter gibt es keine Ergebnisse. Versuche es mit einem größeren Radius oder anderen Filtern.'
    },
    mapAriaLabel: 'Kartenansicht der Stationen',
    miniMapAriaLabel: 'Standort der Station auf der Karte',
    popupDetails: 'Details ansehen',
    notFound: 'Station nicht gefunden.',
    fetchError: 'Die Station konnte nicht vom Open-Charge-Map-Register abgerufen werden.',
    detail: {
      lastVerified: 'Zuletzt geprüft: {date}',
      address: 'Adresse',
      access: 'Zugang',
      connectorsTitle: 'Anschlüsse',
      noConnectors: 'Keine Anschlussdaten verfügbar',
      chargingPower: 'Ladeleistung: {percent}% der maximalen Leistung'
    }
  },

  sessions: {
    seoTitle: 'Sitzungen – ChargeHub',
    seoDescription: 'Ladesitzungen: Dauer, Energie, Leistung und Kosten pro Sitzung.',
    title: 'Sitzungen',
    exportCsv: 'CSV exportieren',
    loadError: 'Sitzungen konnten nicht geladen werden.',
    countSummary: '{shown} von {total} Sitzungen',
    noResults: 'Keine Sitzungen für diese Filter gefunden.',
    filters: {
      station: 'Station',
      from: 'Von',
      to: 'Bis',
      reset: 'Zurücksetzen'
    },
    table: {
      station: 'Station',
      connector: 'Anschluss',
      start: 'Start',
      duration: 'Dauer',
      energy: 'Energie',
      averagePower: 'Ø Leistung',
      peakPower: 'Spitze',
      cost: 'Kosten'
    },
    csv: {
      station: 'Station',
      connector: 'Anschluss',
      start: 'Start',
      end: 'Ende',
      durationMin: 'Dauer (min)',
      energyKwh: 'Energie (kWh)',
      averagePowerKw: 'Ø Leistung (kW)',
      peakPowerKw: 'Spitzenleistung (kW)',
      costEur: 'Kosten (€)'
    }
  },

  analytics: {
    seoTitle: 'Auswertungen – ChargeHub',
    seoDescription: 'Energie pro Tag, Statusverteilung und Auslastung nach Stunde.',
    title: 'Auswertungen',
    loadError: 'Auswertungen konnten nicht geladen werden.',
    periodDays: '{count} Tage',
    energyByDayTitle: 'kWh pro Tag',
    statusDistributionTitle: 'Statusverteilung',
    utilizationByHourTitle: 'Auslastung nach Stunde',
    showAsTable: 'Als Tabelle anzeigen',
    dateColumn: 'Datum',
    statusColumn: 'Status',
    countColumn: 'Anzahl',
    hourColumn: 'Stunde',
    utilizationColumn: 'Auslastung %'
  },

  tariffs: {
    seoTitle: 'Tarife – ChargeHub',
    seoDescription: 'Tarife verwalten und Kosten einer Ladesitzung vergleichen.',
    title: 'Tarife',
    newTariff: 'Neuer Tarif',
    editTariff: 'Tarif bearbeiten',
    readOnlyNotice:
      'Nur lesend: nur die Rolle "operator" kann Tarife anlegen, bearbeiten oder löschen.',
    calculatorTitle: 'Kostenrechner',
    name: 'Name',
    pricePerKwh: 'Preis (€/kWh)',
    pricePerKwhShort: '€/kWh',
    blockingFeePerMinute: 'Blockiergebühr (€/Min)',
    blockingFeePerMinuteShort: 'Blockiergebühr €/Min',
    monthlyFeeEur: 'Grundgebühr (€/Monat)',
    monthlyFeeEurShort: 'Grundgebühr €/Monat',
    actions: 'Aktionen',
    editAction: '{name} bearbeiten',
    deleteAction: '{name} löschen',
    empty: 'Noch keine Tarife angelegt.',
    validation: {
      name: 'Name ist erforderlich.',
      pricePerKwh: 'Preis darf nicht negativ sein.',
      blockingFeePerMinute: 'Blockiergebühr darf nicht negativ sein.',
      monthlyFeeEur: 'Grundgebühr darf nicht negativ sein.'
    },
    selectSession: 'Sitzung auswählen',
    overstayMinutes: 'Standzeit nach Ladeende (Min., optional)',
    needTariff: 'Lege zuerst mindestens einen Tarif an.',
    needSession: 'Wähle eine Sitzung, um die Tarife zu vergleichen.',
    tariffColumn: 'Tarif',
    costColumn: 'Kosten'
  }
}
