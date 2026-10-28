import { getAccessToken } from './auth'
import { GOOGLE_API_KEY, GOOGLE_PROJECT_NUMBER } from './config'
import { loadScript } from './loadScript'

declare const gapi: { load(library: string, callback: () => void): void }

const GAPI_SRC = 'https://apis.google.com/js/api.js'
const SHEET_STORAGE_KEY = 'bubtrack.spreadsheet'

export type PickedSheet = { id: string; name: string }

export function loadSavedSheet(): PickedSheet | undefined {
  const raw = localStorage.getItem(SHEET_STORAGE_KEY)
  return raw ? JSON.parse(raw) : undefined
}

export function forgetSavedSheet() {
  localStorage.removeItem(SHEET_STORAGE_KEY)
}

export async function pickSpreadsheet(): Promise<PickedSheet | undefined> {
  const accessToken = getAccessToken()
  await loadScript(GAPI_SRC)
  await new Promise<void>((resolve) => gapi.load('picker', resolve))

  return new Promise((resolve) => {
    const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
      .setMode(google.picker.DocsViewMode.LIST)

    new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setAppId(GOOGLE_PROJECT_NUMBER)
      .setCallback((data: google.picker.ResponseObject) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs![0]
          const sheet = { id: doc.id, name: doc.name ?? 'Untitled' }
          localStorage.setItem(SHEET_STORAGE_KEY, JSON.stringify(sheet))
          resolve(sheet)
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve(undefined)
        }
      })
      .build()
      .setVisible(true)
  })
}
