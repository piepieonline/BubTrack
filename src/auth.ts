import { GOOGLE_CLIENT_ID } from './config'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const TOKEN_STORAGE_KEY = 'bubtrack.token'
const PENDING_SIGN_IN_KEY = 'bubtrack.pendingSignIn'
const EXPIRY_MARGIN_MS = 60_000

type StoredToken = { accessToken: string; expiresAt: number }
type PendingSignIn = { state: string; returnHash: string }

const signedOutListeners = new Set<() => void>()
let signInError: string | undefined
let token: StoredToken | undefined = takeRedirectToken() ?? readJson<StoredToken>(TOKEN_STORAGE_KEY)

function readJson<T>(key: string): T | undefined {
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : undefined
}

// Google's redirect puts the token in the URL fragment, which would otherwise be read as a route.
function takeRedirectToken(): StoredToken | undefined {
  const params = new URLSearchParams(location.hash.slice(1))
  if (!params.has('access_token') && !params.has('error')) return undefined

  const pending = readJson<PendingSignIn>(PENDING_SIGN_IN_KEY)
  localStorage.removeItem(PENDING_SIGN_IN_KEY)
  history.replaceState(null, '', location.pathname + location.search + (pending?.returnHash ?? ''))

  if (!pending || params.get('state') !== pending.state) {
    signInError = 'Sign-in response did not match the request, please try again'
    return undefined
  }
  const error = params.get('error')
  if (error) {
    signInError = `Google sign-in failed: ${error}`
    return undefined
  }

  const received = {
    accessToken: params.get('access_token')!,
    expiresAt: Date.now() + Number(params.get('expires_in')) * 1000,
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(received))
  return received
}

function isTokenValid(candidate: StoredToken | undefined): candidate is StoredToken {
  return !!candidate && Date.now() < candidate.expiresAt - EXPIRY_MARGIN_MS
}

export function hasValidToken(): boolean {
  return isTokenValid(token)
}

export function takeSignInError(): string | undefined {
  const error = signInError
  signInError = undefined
  return error
}

export function onSignedOut(listener: () => void): () => void {
  signedOutListeners.add(listener)
  return () => signedOutListeners.delete(listener)
}

export function invalidateToken() {
  const hadToken = token !== undefined
  token = undefined
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  if (hadToken) signedOutListeners.forEach((listener) => listener())
}

// Popups load blank in installed PWAs, so sign-in navigates the whole page instead.
export function startSignIn() {
  const pending: PendingSignIn = { state: crypto.randomUUID(), returnHash: location.hash }
  localStorage.setItem(PENDING_SIGN_IN_KEY, JSON.stringify(pending))
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: location.origin + import.meta.env.BASE_URL,
    response_type: 'token',
    scope: SCOPE,
    state: pending.state,
  })
  location.assign(`${AUTH_ENDPOINT}?${params}`)
}

export function getAccessToken(): string {
  if (isTokenValid(token)) return token.accessToken
  invalidateToken()
  throw new Error('Signed out, please sign in again')
}

export async function signOut() {
  if (token) {
    await fetch(`${REVOKE_ENDPOINT}?token=${token.accessToken}`, { method: 'POST', mode: 'no-cors' })
      .catch(() => {})
  }
  invalidateToken()
}
