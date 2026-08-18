import type { H3Event } from 'h3'
import type { AuthUser, UserRole } from '#shared/schemas/auth'

const SESSION_COOKIE_NAME = 'chargehub-session'

/**
 * Login mock esplicito — nessun backend reale, vedi README. Due account
 * fissi, uno per ruolo: non è pensato per la produzione, solo a dimostrare
 * guardie di rotta e permessi (Giorno 16).
 */
export const MOCK_ACCOUNTS: Record<string, { password: string; role: UserRole }> = {
  operator: { password: 'operator123', role: 'operator' },
  viewer: { password: 'viewer123', role: 'viewer' }
}

/**
 * Sessione sigillata (firmata + cifrata) interamente nel cookie via
 * `useSession` di h3 — nessuno store server-side per associare un token a
 * un utente: coerente col vincolo serverless già seguito da
 * telemetria/sessioni simulate (ADR-0002/0003), qui applicato
 * all'autenticazione. Il cookie resta httpOnly per default di h3, quindi
 * illeggibile da JS lato client — per questo il client scopre la sessione
 * chiamando `GET /api/auth/session`, non leggendo il cookie lui stesso.
 */
export function getAuthSession(event: H3Event) {
  return useSession<AuthUser>(event, {
    password: useRuntimeConfig().sessionPassword,
    name: SESSION_COOKIE_NAME,
    cookie: { sameSite: 'lax' }
  })
}
