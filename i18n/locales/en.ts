import { en as vuetifyEn } from 'vuetify/locale'

export default {
  $vuetify: vuetifyEn,

  common: {
    unknown: 'Unknown',
    cancel: 'Cancel',
    save: 'Save',
    retry: 'Retry',
    skipToContent: 'Skip to main content',
    connectionRestored: 'Connection restored',
    connectionLost: 'Connection lost'
  },

  errorPage: {
    seoTitle: 'Error – ChargeHub',
    notFoundTitle: 'Page not found',
    notFoundText: "There's nothing here — the address doesn't exist or has moved.",
    genericTitle: 'Something went wrong',
    genericText: 'An unexpected error occurred. Try again or go back to the dashboard.',
    backHome: 'Back to dashboard'
  },

  nav: {
    dashboard: 'Dashboard',
    stations: 'Stations',
    sessions: 'Sessions',
    analytics: 'Analytics',
    tariffs: 'Tariffs',
    openMenu: 'Open navigation',
    mainNav: 'Main navigation',
    comingSoon: 'Coming soon',
    toLightTheme: 'Switch to light theme',
    toDarkTheme: 'Switch to dark theme'
  },

  auth: {
    seoTitle: 'Log in – ChargeHub',
    login: 'Log in',
    logout: 'Log out',
    loginSubtitle: 'Mock login, see README for the test accounts',
    username: 'Username',
    password: 'Password',
    loginError: 'Wrong username or password.'
  },

  chargePointStatus: {
    Available: 'Available',
    Charging: 'Charging',
    Faulted: 'Faulted',
    Offline: 'Offline'
  },

  telemetryConnection: {
    live: 'Live',
    reconnecting: 'Reconnecting',
    offline: 'Offline'
  },

  dashboard: {
    seoTitle: 'Dashboard – ChargeHub',
    seoDescription: 'Overview of stations, charge points, usage and energy over the last 7 days.',
    title: 'Dashboard',
    loadError: 'KPIs could not be loaded.',
    kpi: {
      stations: 'Stations total',
      available: 'Available points',
      charging: 'Charging',
      faulted: 'Faulted',
      energyToday: 'kWh today',
      utilization: 'Utilization'
    },
    trendUnchanged: 'unchanged (7 days)',
    trendWindow: '{value}% (7 days)'
  },

  stations: {
    title: 'Stations',
    seoTitle: 'Stations – ChargeHub',
    viewMode: { map: 'Map', list: 'List', split: 'Split' },
    filters: {
      search: 'Search (name, operator, city)',
      connectionType: 'Connector type',
      operator: 'Operator',
      status: 'Status',
      minPower: 'Min. power (kW)'
    },
    activeFilters: {
      search: 'Search: {value}',
      minPower: '≥ {value} kW',
      clearAll: 'Clear all'
    },
    table: {
      name: 'Name',
      operator: 'Operator',
      town: 'City',
      connectors: 'Connectors',
      maxPower: 'Max. power',
      status: 'Status'
    },
    loadError: 'Stations could not be loaded.',
    empty: {
      title: 'No stations found',
      text: 'There are no results for the current filters. Try a larger radius or different filters.'
    },
    mapAriaLabel: 'Map view of the stations',
    miniMapAriaLabel: 'Location of the station on the map',
    popupDetails: 'View details',
    notFound: 'Station not found.',
    fetchError: 'The station could not be retrieved from the Open Charge Map registry.',
    detail: {
      lastVerified: 'Last verified: {date}',
      address: 'Address',
      access: 'Access',
      connectorsTitle: 'Connectors',
      noConnectors: 'No connector data available',
      chargingPower: 'Charging power: {percent}% of maximum power',
      showMap: 'Show map'
    }
  },

  sessions: {
    seoTitle: 'Sessions – ChargeHub',
    seoDescription: 'Charging sessions: duration, energy, power and cost per session.',
    title: 'Sessions',
    exportCsv: 'Export CSV',
    loadError: 'Sessions could not be loaded.',
    countSummary: '{shown} of {total} sessions',
    noResults: 'No sessions found for these filters.',
    filters: {
      station: 'Station',
      from: 'From',
      to: 'To',
      reset: 'Reset'
    },
    table: {
      station: 'Station',
      connector: 'Connector',
      start: 'Start',
      duration: 'Duration',
      energy: 'Energy',
      averagePower: 'Avg. power',
      peakPower: 'Peak',
      cost: 'Cost'
    },
    csv: {
      station: 'Station',
      connector: 'Connector',
      start: 'Start',
      end: 'End',
      durationMin: 'Duration (min)',
      energyKwh: 'Energy (kWh)',
      averagePowerKw: 'Avg. power (kW)',
      peakPowerKw: 'Peak power (kW)',
      costEur: 'Cost (€)'
    }
  },

  analytics: {
    seoTitle: 'Analytics – ChargeHub',
    seoDescription: 'Energy per day, status distribution and utilization by hour.',
    title: 'Analytics',
    loadError: 'Analytics could not be loaded.',
    periodDays: '{count} days',
    energyByDayTitle: 'kWh per day',
    statusDistributionTitle: 'Status distribution',
    utilizationByHourTitle: 'Utilization by hour',
    showAsTable: 'Show as table',
    dateColumn: 'Date',
    statusColumn: 'Status',
    countColumn: 'Count',
    hourColumn: 'Hour',
    utilizationColumn: 'Utilization %'
  },

  tariffs: {
    seoTitle: 'Tariffs – ChargeHub',
    seoDescription: 'Manage tariffs and compare the cost of a charging session.',
    title: 'Tariffs',
    newTariff: 'New tariff',
    editTariff: 'Edit tariff',
    readOnlyNotice: 'Read-only: only the "operator" role can create, edit or delete tariffs.',
    calculatorTitle: 'Cost calculator',
    name: 'Name',
    pricePerKwh: 'Price (€/kWh)',
    pricePerKwhShort: '€/kWh',
    blockingFeePerMinute: 'Blocking fee (€/min)',
    blockingFeePerMinuteShort: 'Blocking fee €/min',
    monthlyFeeEur: 'Monthly fee (€/month)',
    monthlyFeeEurShort: 'Monthly fee €/month',
    actions: 'Actions',
    editAction: 'Edit {name}',
    deleteAction: 'Delete {name}',
    empty: 'No tariffs created yet.',
    validation: {
      name: 'Name is required.',
      pricePerKwh: 'Price must not be negative.',
      blockingFeePerMinute: 'Blocking fee must not be negative.',
      monthlyFeeEur: 'Monthly fee must not be negative.'
    },
    selectSession: 'Select session',
    overstayMinutes: 'Dwell time after charging ends (min., optional)',
    needTariff: 'Create at least one tariff first.',
    needSession: 'Select a session to compare tariffs.',
    tariffColumn: 'Tariff',
    costColumn: 'Cost'
  }
}
