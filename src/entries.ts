import type { Cell, StoredRow } from './rowStore'

export const COLUMNS = ['#', 'Date', 'Time', 'What', 'Side', 'End', 'EBM (ml)', 'Formula (ml)', 'Nappy', 'Notes'] as const

export const Column = {
  Id: 0,
  Date: 1,
  Time: 2,
  What: 3,
  Side: 4,
  End: 5,
  Ebm: 6,
  Formula: 7,
  Nappy: 8,
  Notes: 9,
} as const

export type Kind = 'Feed' | 'Bottle' | 'Nappy'
export type Side = 'L' | 'R'
export type NappyType = 'Wet' | 'Dirty' | 'Both'

export type NewEntry = {
  kind: Kind
  start: Date
  side?: Side
  ebmMl?: number
  formulaMl?: number
  nappy?: NappyType
  notes?: string
}

export type Entry = NewEntry & {
  id: number
  rowNumber: number
  end?: Date
  notes: string
}

const OPEN_FEED_MAX_MS = 2 * 60 * 60 * 1000
const SESSION_GAP_MS = 60 * 60 * 1000
const MINUTES_PER_DAY = 24 * 60
const SHEETS_EPOCH = { year: 1899, month: 11, day: 30 }

const pad = (n: number) => String(n).padStart(2, '0')

export const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const formatTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

export const formatDateTime = (date: Date) => `${formatDate(date)} ${formatTime(date)}`

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000))
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY)
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  if (days) return `${days}d ${hours}h`
  return hours ? `${hours}h ${pad(minutes)}m` : `${minutes}m`
}

// Leading apostrophe forces USER_ENTERED to store the value as plain text.
export const textCell = (text: string) => (text ? `'${text}` : '')

function parseDate(cell: Cell | undefined): Date | undefined {
  if (typeof cell === 'number') {
    return new Date(SHEETS_EPOCH.year, SHEETS_EPOCH.month, SHEETS_EPOCH.day + Math.floor(cell))
  }
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(cell ?? '')
  return match ? new Date(+match[1], +match[2] - 1, +match[3]) : undefined
}

function parseMinutesOfDay(cell: Cell | undefined): number | undefined {
  if (typeof cell === 'number') return Math.round((cell % 1) * MINUTES_PER_DAY) % MINUTES_PER_DAY
  const match = /^(\d{1,2}):(\d{2})/.exec(cell ?? '')
  return match ? +match[1] * 60 + +match[2] : undefined
}

export function parseAmount(cell: Cell | undefined): number | undefined {
  if (cell === undefined || cell === '') return undefined
  const amount = Number(cell)
  return Number.isFinite(amount) ? amount : undefined
}

const atMinutes = (day: Date, minutes: number) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes)

export function parseDateTime(cell: Cell | undefined): Date | undefined {
  if (typeof cell === 'number') return atMinutes(parseDate(cell)!, parseMinutesOfDay(cell)!)
  const match = /^(\d{4}-\d{1,2}-\d{1,2})[ T](\d{1,2}:\d{2})/.exec(cell ?? '')
  return match ? atMinutes(parseDate(match[1])!, parseMinutesOfDay(match[2])!) : undefined
}

function parseRow({ rowNumber, cells }: StoredRow): Entry | undefined {
  const id = parseAmount(cells[Column.Id])
  const day = parseDate(cells[Column.Date])
  const startMinutes = parseMinutesOfDay(cells[Column.Time])
  const kind = String(cells[Column.What] ?? '') as Kind
  if (id === undefined || !day || startMinutes === undefined || !['Feed', 'Bottle', 'Nappy'].includes(kind)) return undefined

  const start = atMinutes(day, startMinutes)
  const endMinutes = parseMinutesOfDay(cells[Column.End])
  const crossesMidnight = endMinutes !== undefined && endMinutes < startMinutes
  const end = endMinutes === undefined
    ? undefined
    : atMinutes(day, endMinutes + (crossesMidnight ? MINUTES_PER_DAY : 0))

  return {
    id,
    rowNumber,
    kind,
    start,
    end,
    side: (cells[Column.Side] || undefined) as Side | undefined,
    ebmMl: parseAmount(cells[Column.Ebm]),
    formulaMl: parseAmount(cells[Column.Formula]),
    nappy: (cells[Column.Nappy] || undefined) as NappyType | undefined,
    notes: String(cells[Column.Notes] ?? ''),
  }
}

export function parseEntries(rows: StoredRow[]): Entry[] {
  return rows
    .map(parseRow)
    .filter((entry): entry is Entry => !!entry)
    .sort((a, b) => b.start.getTime() - a.start.getTime() || b.id - a.id)
}

export const nextId = (entries: Entry[]) => Math.max(0, ...entries.map((entry) => entry.id)) + 1

export function toRow(id: number, entry: NewEntry): string[] {
  const row: string[] = Array(COLUMNS.length).fill('')
  row[Column.Id] = String(id)
  row[Column.Date] = formatDate(entry.start)
  row[Column.Time] = formatTime(entry.start)
  row[Column.What] = entry.kind
  row[Column.Side] = entry.side ?? ''
  row[Column.Ebm] = entry.ebmMl ? String(entry.ebmMl) : ''
  row[Column.Formula] = entry.formulaMl ? String(entry.formulaMl) : ''
  row[Column.Nappy] = entry.nappy ?? ''
  row[Column.Notes] = textCell(entry.notes ?? '')
  return row
}

// Entries are sorted newest first.
export const latestFeed = (entries: Entry[]) => entries.find((entry) => entry.kind === 'Feed')

export function findOpenFeed(entries: Entry[], now: number): Entry | undefined {
  const feed = latestFeed(entries)
  if (feed && !feed.end && now - feed.start.getTime() < OPEN_FEED_MAX_MS) return feed
  return undefined
}

const feedKey = (time: Date, side: Side | undefined) => `${time.getTime()}|${side}`

// A swap is stored as an end time plus a new opposite-side feed starting at that same minute.
export function findSwappedFeeds(entries: Entry[]): Set<number> {
  const feedStarts = new Set(
    entries.filter((entry) => entry.kind === 'Feed').map((entry) => feedKey(entry.start, entry.side)),
  )
  return new Set(
    entries
      .filter((entry) => entry.kind === 'Feed' && entry.end && entry.side
        && feedStarts.has(feedKey(entry.end, oppositeSide(entry.side))))
      .map((entry) => entry.id),
  )
}

// Compares against the latest end so far, as a nappy logged mid-feed ends before the feed does.
export function findSessionStarts(entries: Entry[]): Set<number> {
  const sessionStarts = new Set<number>()
  let latestEnd: number | undefined
  for (const entry of entries.toReversed()) {
    if (latestEnd !== undefined && entry.start.getTime() - latestEnd > SESSION_GAP_MS) sessionStarts.add(entry.id)
    latestEnd = Math.max(latestEnd ?? 0, (entry.end ?? entry.start).getTime())
  }
  return sessionStarts
}

export const oppositeSide =(side: Side): Side => (side === 'L' ? 'R' : 'L')
