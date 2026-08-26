import type { ReferenceData } from '#shared/schemas/station'

/**
 * Sottoinsieme curato di dati di riferimento reali (fetchati da OCM per la
 * Germania il 26/08/2026 — id veri, non inventati). La Germania reale ha 43
 * tipi di connettore e **984 operatori**: usarli tutti qui appesantirebbe
 * l'eval senza aggiungere valore (il grosso sono varianti internazionali
 * dello stesso brand, es. "Shell Recharge (IN)", irrilevanti per una query
 * in tedesco su stazioni tedesche) — 6 connettori e 8 operatori riconoscibili
 * bastano a verificare il grounding sugli id reali. Non è la lista mandata
 * in produzione (quella resta quella intera, vedi ADR-0007), solo un
 * fixture realistico e leggibile per questa suite.
 */
export const evalReferenceData: ReferenceData = {
  connectionTypes: [
    { id: 32, title: 'CCS (Type 1)' },
    { id: 33, title: 'CCS (Type 2)' },
    { id: 2, title: 'CHAdeMO' },
    { id: 25, title: 'Type 2 (Socket Only)' },
    { id: 1, title: 'Type 1 (J1772)' },
    { id: 27, title: 'NACS / Tesla Supercharger' }
  ],
  operators: [
    { id: 103, title: 'Allego BV' },
    { id: 3455, title: 'Aral pulse' },
    { id: 46, title: 'E.ON (DE)' },
    { id: 86, title: 'EnBW (D)' },
    { id: 74, title: 'FastNed' },
    { id: 3299, title: 'Ionity' },
    { id: 156, title: 'Shell Recharge Solutions (DE)' },
    { id: 23, title: 'Tesla (Tesla-only charging)' }
  ],
  statusTypes: [
    { id: 10, title: 'Currently Available (Automated Status)', isOperational: true },
    { id: 20, title: 'Currently In Use (Automated Status)', isOperational: true },
    { id: 30, title: 'Temporarily Unavailable', isOperational: true },
    { id: 50, title: 'Operational', isOperational: true },
    { id: 100, title: 'Not Operational', isOperational: false },
    { id: 150, title: 'Planned For Future Date', isOperational: false },
    { id: 200, title: 'Removed (Decommissioned)', isOperational: false }
  ]
}

/**
 * Caso di regressione (Giorno 26, seconda continuazione): la Germania reale
 * su OCM ha **984 operatori** — con `operatorId` costruito come union di
 * literal (come lo erano tutti e tre i campi id all'inizio), l'API rifiuta
 * la richiesta con 400 "The compiled grammar is too large" prima ancora di
 * arrivare a un `parsed_output`. Trovato con una chiamata reale, non da un
 * test (tutti i test unitari mockano l'SDK). Questo fixture riproduce la
 * scala del problema (500 operatori sintetici, l'id/titolo esatto non
 * conta — conta solo la dimensione dell'union) per assicurarsi che
 * `operatorId` non torni mai a essere costruito come union di literal.
 */
export const evalReferenceDataManyOperators: ReferenceData = {
  ...evalReferenceData,
  operators: Array.from({ length: 500 }, (_, index) => ({
    id: 10_000 + index,
    title: `Synthetic Operator ${index}`
  }))
}
