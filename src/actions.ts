import { Column, findOpenFeed, formatTime, nextId, oppositeSide, textCell, toRow, type Entry, type NappyType, type Side } from './entries'
import type { RowStore } from './rowStore'

export const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000)

function requireOpenFeed(fresh: Entry[]): Entry {
  const openFeed = findOpenFeed(fresh, Date.now())
  if (!openFeed) throw new Error('No feed in progress')
  return openFeed
}

// Rows are located by id on the fresh read, so hand edits to the sheet can't misdirect a write.
function requireEntry(fresh: Entry[], id: number): Entry {
  const entry = fresh.find((candidate) => candidate.id === id)
  if (!entry) throw new Error(`Row #${id} no longer exists`)
  return entry
}

const notBefore = (time: Date, earliest: Date) => (time < earliest ? earliest : time)

export async function startFeed(store: RowStore, fresh: Entry[], side: Side, start: Date, notes: string) {
  if (findOpenFeed(fresh, Date.now())) throw new Error('A feed is already in progress')
  await store.append([toRow(nextId(fresh), { kind: 'Feed', start, side, notes })])
}

export async function endFeed(store: RowStore, fresh: Entry[], at: Date) {
  const openFeed = requireOpenFeed(fresh)
  const end = notBefore(at, openFeed.start)
  await store.update([{ rowNumber: openFeed.rowNumber, column: Column.End, value: formatTime(end) }])
  return { openFeed, end }
}

export async function swapSide(store: RowStore, fresh: Entry[], at: Date) {
  const { openFeed, end } = await endFeed(store, fresh, at)
  await store.append([toRow(nextId(fresh), { kind: 'Feed', start: end, side: oppositeSide(openFeed.side ?? 'R') })])
}

export async function addBottle(store: RowStore, fresh: Entry[], start: Date, ebmMl: number, formulaMl: number, notes: string) {
  await store.append([toRow(nextId(fresh), { kind: 'Bottle', start, ebmMl, formulaMl, notes })])
}

export async function addNappy(store: RowStore, fresh: Entry[], start: Date, nappy: NappyType, notes: string) {
  await store.append([toRow(nextId(fresh), { kind: 'Nappy', start, nappy, notes })])
}

export async function saveNotes(store: RowStore, fresh: Entry[], id: number, notes: string) {
  const { rowNumber } = requireEntry(fresh, id)
  await store.update([{ rowNumber, column: Column.Notes, value: textCell(notes) }])
}
