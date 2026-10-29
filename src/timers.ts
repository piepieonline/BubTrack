import { formatDateTime, parseAmount, parseDateTime, textCell } from './entries'
import type { RowStore, StoredRow } from './rowStore'

export const TIMERS_SHEET = 'Timers'

export const TIMER_COLUMNS = ['Name', 'Every (h)', 'Last at', 'Next at'] as const

const TimerColumn = {
  Name: 0,
  EveryHours: 1,
  LastAt: 2,
  NextAt: 3,
} as const

export type Timer = {
  rowNumber: number
  name: string
  everyHours: number
  lastAt: Date
  nextAt: Date
}

const HOUR_MS = 60 * 60 * 1000

const nextAfter = (lastAt: Date, everyHours: number) => new Date(lastAt.getTime() + everyHours * HOUR_MS)

// A hand-edited Next at in the sheet wins over the interval.
function parseTimer({ rowNumber, cells }: StoredRow): Timer | undefined {
  const name = String(cells[TimerColumn.Name] ?? '').trim()
  const everyHours = parseAmount(cells[TimerColumn.EveryHours])
  const lastAt = parseDateTime(cells[TimerColumn.LastAt])
  if (!name || !everyHours || everyHours <= 0 || !lastAt) return undefined
  const nextAt = parseDateTime(cells[TimerColumn.NextAt]) ?? nextAfter(lastAt, everyHours)
  return { rowNumber, name, everyHours, lastAt, nextAt }
}

export function parseTimers(rows: StoredRow[]): Timer[] {
  return rows
    .map(parseTimer)
    .filter((timer): timer is Timer => !!timer)
    .sort((a, b) => a.nextAt.getTime() - b.nextAt.getTime())
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Timers are located by name on the fresh read, so hand edits to the sheet can't misdirect a write.
function requireTimer(fresh: Timer[], name: string): Timer {
  const timer = fresh.find((candidate) => sameName(candidate.name, name))
  if (!timer) throw new Error(`Timer "${name}" no longer exists`)
  return timer
}

export async function addTimer(store: RowStore, fresh: Timer[], name: string, everyHours: number, lastAt: Date) {
  if (fresh.some((timer) => sameName(timer.name, name))) throw new Error(`A timer named "${name}" already exists`)
  const row: string[] = Array(TIMER_COLUMNS.length).fill('')
  row[TimerColumn.Name] = textCell(name.trim())
  row[TimerColumn.EveryHours] = String(everyHours)
  row[TimerColumn.LastAt] = formatDateTime(lastAt)
  row[TimerColumn.NextAt] = formatDateTime(nextAfter(lastAt, everyHours))
  await store.append([row])
}

export async function updateTimer(store: RowStore, fresh: Timer[], name: string, at: Date) {
  const { rowNumber, everyHours } = requireTimer(fresh, name)
  await store.update([
    { rowNumber, column: TimerColumn.LastAt, value: formatDateTime(at) },
    { rowNumber, column: TimerColumn.NextAt, value: formatDateTime(nextAfter(at, everyHours)) },
  ])
}

export async function deleteTimer(store: RowStore, fresh: Timer[], name: string) {
  await store.delete(requireTimer(fresh, name).rowNumber)
}
