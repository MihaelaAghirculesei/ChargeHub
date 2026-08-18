/**
 * Sessione utente (Giorno 16), dato non-OCM. Login mock — nessun backend
 * reale, vedi README — quindi solo due ruoli fissi, non un sistema di
 * permessi generico.
 */
export type UserRole = 'viewer' | 'operator'

export interface AuthUser {
  username: string
  role: UserRole
}
