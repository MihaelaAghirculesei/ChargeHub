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
 *
 * `secure: !import.meta.dev`: il default di h3 per `useSession` è
 * `secure: true` sempre — su Vercel (HTTPS) è corretto e va lasciato, ma in
 * sviluppo locale (`pnpm dev`, HTTP semplice) un cookie `Secure` viene
 * scritto ma MAI rimandato indietro da Safari/WebKit (che non riconosce
 * l'eccezione "localhost = contesto sicuro" che Chromium concede) — ogni
 * richiesta successiva sembra quindi senza sessione, redirect continuo al
 * login. Bug reale trovato solo con Playwright su WebKit (Giorno 20): un
 * `curl` non applica mai la semantica del flag `Secure`, non l'avrebbe mai
 * potuto rivelare.
 */
export function getAuthSession(event: H3Event) {
  return useSession<AuthUser>(event, {
    password: useRuntimeConfig().sessionPassword,
    name: SESSION_COOKIE_NAME,
    cookie: { sameSite: 'lax', secure: !import.meta.dev }
  })
}
