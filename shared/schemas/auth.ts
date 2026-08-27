/**
 * User session (day 16), non-OCM data. Mock login — no real backend, see
 * README — so only two fixed roles, not a generic permissions system.
 */
export type UserRole = 'viewer' | 'operator'

export interface AuthUser {
  username: string
  role: UserRole
}
