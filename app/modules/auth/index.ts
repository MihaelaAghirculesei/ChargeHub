/**
 * Unico punto di export pubblico del modulo auth. `authRepository` resta
 * volutamente privato, stesso principio degli altri moduli.
 */
export { useAuth } from '~/modules/auth/composables/useAuth'
export { useAuthUser } from '~/modules/auth/composables/useAuthUser'
