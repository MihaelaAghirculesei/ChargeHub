import type { ReferenceData } from '#shared/schemas/station'

/**
 * A curated subset of real reference data (fetched from OCM for Germany on
 * 2026-08-26 — real ids, not invented). Real Germany has 43 connection types
 * and **984 operators**: using them all here would bloat the eval without
 * adding value (most are international variants of the same brand, e.g.
 * "Shell Recharge (IN)", irrelevant for a German-language query about German
 * stations) — 6 recognisable connectors and 8 operators are enough to check
 * the grounding on real ids. This is not the list sent to production (that
 * stays the whole thing, see ADR-0007), just a realistic and readable
 * fixture for this suite.
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
 * Regression case (day 26, second follow-up): real Germany on OCM has **984
 * operators** — with `operatorId` built as a literal union (as all three id
 * fields were at first), the API rejects the request with 400 "The compiled
 * grammar is too large" before even reaching a `parsed_output`. Found with a
 * real call, not a test (all unit tests mock the SDK). This fixture
 * reproduces the scale of the problem (500 synthetic operators; the exact
 * id/title does not matter — only the size of the union does) to make sure
 * `operatorId` is never built as a literal union again.
 */
export const evalReferenceDataManyOperators: ReferenceData = {
  ...evalReferenceData,
  operators: Array.from({ length: 500 }, (_, index) => ({
    id: 10_000 + index,
    title: `Synthetic Operator ${index}`
  }))
}
