import { GOOGLE_CLIENT_ID } from './config'
import { loadScript } from './loadScript'

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const TOKEN_STORAGE_KEY = 'bubtrack.token'
const EXPIRY_MARGIN_MS = 60_000

type StoredToken = { accessToken: string; expiresAt: number }

let token: StoredToken | undefined = readStoredToken()

function readStoredToken(): StoredToken | undefined {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
  return raw ? JSON.parse(raw) : undefined
}

function isTokenValid(candidate: StoredToken | undefined): candidate is StoredToken {
  return !!candidate && Date.now() < candidate.expiresAt - EXPIRY_MARGIN_MS
}

export function hasValidToken(): boolean {
  return isTokenValid(token)
}

export function invalidateToken() {
  token = undefined
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

// Call from a user gesture when possible; GIS may need to open a popup.
export async function getAccessToken(): Promise<string> {
  if (isTokenValid(token)) return token.accessToken

  await loadScript(GIS_SRC)
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error))
          return
        }
        token = {
          accessToken: response.access_token,
          expiresAt: Date.now() + Number(response.expires_in) * 1000,
        }
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
        resolve(token.accessToken)
      },
      error_callback: (error) => reject(new Error(error.message ?? error.type)),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

export async function signOut() {
  if (token) {
    await loadScript(GIS_SRC)
    google.accounts.oauth2.revoke(token.accessToken, () => {})
  }
  invalidateToken()
}
