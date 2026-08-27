import type { H3Event } from 'h3'
import type { AuthUser, UserRole } from '#shared/schemas/auth'

const SESSION_COOKIE_NAME = 'chargehub-session'

/**
 * Explicit mock login — no real backend, see README. Two fixed accounts, one
 * per role: not meant for production, only to demonstrate route guards and
 * permissions (day 16).
 */
export const MOCK_ACCOUNTS: Record<string, { password: string; role: UserRole }> = {
  operator: { password: 'operator123', role: 'operator' },
  viewer: { password: 'viewer123', role: 'viewer' }
}

/**
 * Session sealed (signed + encrypted) entirely in the cookie via h3's
 * `useSession` — no server-side store mapping a token to a user: consistent
 * with the serverless constraint already followed by simulated
 * telemetry/sessions (ADR-0002/0003), applied here to authentication. The
 * cookie stays httpOnly by h3 default, so unreadable from client-side JS —
 * which is why the client discovers the session by calling
 * `GET /api/auth/session`, not by reading the cookie itself.
 *
 * `secure: !import.meta.dev`: h3's `useSession` default is `secure: true`
 * always — on Vercel (HTTPS) that is correct and should stay, but in local
 * development (`pnpm dev`, plain HTTP) a `Secure` cookie is written but NEVER
 * sent back by Safari/WebKit (which does not honour the "localhost = secure
 * context" exception Chromium grants) — every subsequent request then looks
 * session-less, an endless redirect to login. A real bug found only with
 * Playwright on WebKit (day 20): a `curl` never applies the semantics of the
 * `Secure` flag, so it could never have revealed it.
 */
export function getAuthSession(event: H3Event) {
  return useSession<AuthUser>(event, {
    password: useRuntimeConfig().sessionPassword,
    name: SESSION_COOKIE_NAME,
    cookie: { sameSite: 'lax', secure: !import.meta.dev }
  })
}
