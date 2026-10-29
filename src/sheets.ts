import { getAccessToken, invalidateToken } from './auth'
import type { Cell } from './rowStore'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken()
  let response: Response
  try {
    response = await fetch(`${SHEETS_API}/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    })
  } catch {
    throw new Error(navigator.onLine ? 'Network error reaching Google Sheets' : 'You are offline')
  }

  if (response.status === 401) {
    invalidateToken()
    throw new Error('Signed out, please sign in again')
  }
  if (!response.ok) {
    throw new Error(`Sheets API ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

// Raw values (dates/times as serial numbers) so parsing doesn't depend on the sheet's locale.
export async function readRange(spreadsheetId: string, range: string): Promise<Cell[][]> {
  const result = await request<{ values?: Cell[][] }>(
    `${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
  )
  return result.values ?? []
}

export function appendRows(spreadsheetId: string, range: string, rows: string[][]) {
  return request(
    `${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  )
}

export function batchUpdate(spreadsheetId: string, data: { range: string; values: string[][] }[]) {
  return request(`${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
  })
}

type SheetProperties = { sheetId: number; title: string }

function spreadsheetUpdate<T>(spreadsheetId: string, requests: object[]) {
  return request<T>(`${spreadsheetId}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests }) })
}

// Without a title this is the first sheet; a titled sheet is created if missing.
export async function getSheetId(spreadsheetId: string, title?: string): Promise<number> {
  const { sheets } = await request<{ sheets: { properties: SheetProperties }[] }>(
    `${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
  )
  const existing = title === undefined ? sheets[0] : sheets.find((sheet) => sheet.properties.title === title)
  if (existing) return existing.properties.sheetId
  const { replies } = await spreadsheetUpdate<{ replies: { addSheet: { properties: SheetProperties } }[] }>(
    spreadsheetId,
    [{ addSheet: { properties: { title } } }],
  )
  return replies[0].addSheet.properties.sheetId
}

export function deleteRow(spreadsheetId: string, sheetId: number, rowNumber: number) {
  return spreadsheetUpdate(spreadsheetId, [
    { deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } },
  ])
}
