import { useMemo, useState } from 'preact/hooks'
import { saveNotes } from '../actions'
import { NotesEditor } from '../components/NotesEditor'
import { findOpenFeed, findSessionStarts, findSwappedFeeds, formatDate, formatDuration, formatTime, type Entry } from '../entries'
import type { RowStore } from '../rowStore'
import type { Perform } from '../useEntries'
import { useNow } from '../useNow'

type Props = {
  store: RowStore
  entries: Entry[]
  busy: boolean
  perform: Perform
}

const dateLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

function describe(entry: Entry, swapped: boolean, inProgress: boolean): string {
  switch (entry.kind) {
    case 'Feed':
      return entry.end
        ? `Feed ${entry.side ?? ''} → ${swapped ? 'swapped ' : ''}${formatTime(entry.end)} · ${formatDuration(entry.end.getTime() - entry.start.getTime())}`
        : `Feed ${entry.side ?? ''} · ${inProgress ? 'in progress' : 'no end'}`
    case 'Bottle':
      return ['Bottle', entry.ebmMl && `EBM ${entry.ebmMl}ml`, entry.formulaMl && `Formula ${entry.formulaMl}ml`]
        .filter(Boolean)
        .join(' ')
    case 'Nappy':
      return `Nappy ${entry.nappy ?? ''}`
  }
}

function groupByDay(entries: Entry[]) {
  const groups: { day: string; label: string; entries: Entry[] }[] = []
  for (const entry of entries) {
    const day = formatDate(entry.start)
    if (groups.at(-1)?.day !== day) groups.push({ day, label: dateLabel(entry.start), entries: [] })
    groups.at(-1)!.entries.push(entry)
  }
  return groups
}

export function LogPage({ store, entries, busy, perform }: Props) {
  const [editingId, setEditingId] = useState<number>()
  const swappedIds = useMemo(() => findSwappedFeeds(entries), [entries])
  const sessionStartIds = useMemo(() => findSessionStarts(entries), [entries])
  const openFeed = findOpenFeed(entries, useNow(60_000))

  async function save(id: number, notes: string) {
    if (await perform((fresh) => saveNotes(store, fresh, id, notes))) setEditingId(undefined)
  }

  return (
    <section class="log-page">
      <div class="log-toolbar">
        <button class="secondary small" disabled={busy} onClick={() => perform()}>Refresh</button>
      </div>
      {entries.length === 0 && <p class="muted">Nothing logged yet</p>}
      {groupByDay(entries).map((group) => (
        <div key={group.day}>
          <h3 class="log-day">{group.label}</h3>
          <ul class="log-list">
            {group.entries.map((entry) => (
              <li key={entry.id} class={sessionStartIds.has(entry.id) ? 'session-start' : undefined}>
                <button class="log-row" onClick={() => setEditingId(entry.id)}>
                  <span class="log-time">{formatTime(entry.start)}</span>
                  <span>{describe(entry, swappedIds.has(entry.id), entry === openFeed)}</span>
                </button>
                {editingId === entry.id ? (
                  <NotesEditor
                    initial={entry.notes}
                    busy={busy}
                    onSave={(notes) => save(entry.id, notes)}
                    onCancel={() => setEditingId(undefined)}
                  />
                ) : (
                  entry.notes && <p class="log-notes">{entry.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
