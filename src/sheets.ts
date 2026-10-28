import { getAccessToken, invalidateToken } from './auth'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

export type Row = string[]

async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const accessToken = await getAccessToken()
  let response: Response
  try {
    response = await fetch(`${SHEETS_API}/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    })
  } catch {
    throw new Error(navigator.onLine ? 'Network error reaching Google Sheets' : 'You are offline')
  }

  if (response.status === 401 && !isRetry) {
    invalidateToken()
    return request(path, init, true)
  }
  if (!response.ok) {
    throw new Error(`Sheets API ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

export async function readRange(spreadsheetId: string, range: string): Promise<Row[]> {
  const result = await request<{ values?: Row[] }>(
    `${spreadsheetId}/values/${encodeURIComponent(range)}`,
  )
  return result.values ?? []
}

export function appendRows(spreadsheetId: string, range: string, rows: Row[]) {
  return request(
    `${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  )
}

export function updateRange(spreadsheetId: string, range: string, rows: Row[]) {
  return request(
    `${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', body: JSON.stringify({ values: rows }) },
  )
}
