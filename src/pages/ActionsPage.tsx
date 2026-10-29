import { useState } from 'preact/hooks'
import { addBottle, addNappy, endFeed, saveNotes, startFeed, swapSide } from '../actions'
import { ActionDialog } from '../components/ActionDialog'
import { AmountPicker } from '../components/AmountPicker'
import { Choice } from '../components/Choice'
import { NotesEditor } from '../components/NotesEditor'
import { findOpenFeed, formatDuration, formatTime, latestFeed, oppositeSide, type Entry, type NappyType, type Side } from '../entries'
import type { RowStore } from '../rowStore'
import type { Perform } from '../useEntries'
import { useNow } from '../useNow'

const SIDES = ['L', 'R'] as const
const NAPPY_TYPES = ['Wet', 'Dirty', 'Both'] as const

type DialogKind = 'start' | 'end' | 'swap' | 'bottle' | 'nappy'

type Props = {
  store: RowStore
  entries: Entry[]
  busy: boolean
  perform: Perform
}

const pad = (n: number) => String(n).padStart(2, '0')

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor(totalSeconds / 60) % 60
  const seconds = totalSeconds % 60
  return hours ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s` : `${minutes}m ${pad(seconds)}s`
}

export function ActionsPage({ store, entries, busy, perform }: Props) {
  const now = useNow(1000)
  const openFeed = findOpenFeed(entries, now)
  const lastFeed = latestFeed(entries)
  const [dialog, setDialog] = useState<DialogKind>()

  const [side, setSide] = useState<Side>('L')
  const [ebmMl, setEbmMl] = useState(0)
  const [formulaMl, setFormulaMl] = useState(0)
  const [nappy, setNappy] = useState<NappyType>()
  const [notes, setNotes] = useState('')

  function open(kind: DialogKind) {
    const lastSide = latestFeed(entries)?.side
    setSide(lastSide ? oppositeSide(lastSide) : 'L')
    setEbmMl(0)
    setFormulaMl(0)
    setNappy(undefined)
    setNotes('')
    setDialog(kind)
  }

  async function confirm(at: Date) {
    const succeeded = await perform(async (fresh) => {
      switch (dialog) {
        case 'start': return startFeed(store, fresh, side, at, notes)
        case 'end': await endFeed(store, fresh, at); return
        case 'swap': return swapSide(store, fresh, at)
        case 'bottle': return addBottle(store, fresh, at, ebmMl, formulaMl, notes)
        case 'nappy': return addNappy(store, fresh, at, nappy!, notes)
      }
    })
    if (succeeded) setDialog(undefined)
  }

  const notesField = (
    <textarea rows={2} placeholder="Notes (optional)" value={notes} onInput={(e) => setNotes(e.currentTarget.value)} />
  )

  return (
    <section class="actions-page">
      {openFeed ? (
        <div class="open-feed">
          <div class="open-feed-summary">
            <span class="open-feed-side">{openFeed.side}</span>
            <span class="open-feed-timer">{formatElapsed(now - openFeed.start.getTime())}</span>
            <span class="muted">since {formatTime(openFeed.start)}</span>
          </div>
          <NotesEditor
            key={openFeed.id}
            initial={openFeed.notes}
            busy={busy}
            onSave={(text) => perform((fresh) => saveNotes(store, fresh, openFeed.id, text))}
          />
        </div>
      ) : (
        <p class="open-feed muted">
          No feed in progress{lastFeed && ` - ${formatDuration(now - (lastFeed.end ?? lastFeed.start).getTime())} since last feed`}
        </p>
      )}

      <div class="action-grid">
        <button class="action" disabled={busy || !!openFeed} onClick={() => open('start')}>Start feed</button>
        <button class="action" disabled={busy || !openFeed} onClick={() => open('end')}>End feed</button>
        <button class="action" disabled={busy || !openFeed} onClick={() => open('swap')}>
          Swap side{openFeed?.side && ` → ${oppositeSide(openFeed.side)}`}
        </button>
        <button class="action" disabled={busy} onClick={() => open('bottle')}>Bottle</button>
        <button class="action wide" disabled={busy} onClick={() => open('nappy')}>Nappy</button>
      </div>

      {dialog === 'start' && (
        <ActionDialog title="Start feed" busy={busy} onConfirm={confirm} onCancel={() => setDialog(undefined)}>
          <Choice options={SIDES} value={side} onChange={setSide} />
          {notesField}
        </ActionDialog>
      )}
      {dialog === 'end' && (
        <ActionDialog title="End feed" busy={busy} onConfirm={confirm} onCancel={() => setDialog(undefined)} />
      )}
      {dialog === 'swap' && (
        <ActionDialog
          title={`Swap to ${openFeed ? oppositeSide(openFeed.side ?? 'R') : ''}`}
          busy={busy}
          onConfirm={confirm}
          onCancel={() => setDialog(undefined)}
        />
      )}
      {dialog === 'bottle' && (
        <ActionDialog
          title="Bottle"
          busy={busy}
          canConfirm={ebmMl > 0 || formulaMl > 0}
          onConfirm={confirm}
          onCancel={() => setDialog(undefined)}
        >
          <AmountPicker label="EBM" value={ebmMl} recentMl={entries.find((e) => e.ebmMl)?.ebmMl} onChange={setEbmMl} />
          <AmountPicker label="Formula" value={formulaMl} recentMl={entries.find((e) => e.formulaMl)?.formulaMl} onChange={setFormulaMl} />
          {notesField}
        </ActionDialog>
      )}
      {dialog === 'nappy' && (
        <ActionDialog
          title="Nappy"
          busy={busy}
          canConfirm={!!nappy}
          onConfirm={confirm}
          onCancel={() => setDialog(undefined)}
        >
          <Choice options={NAPPY_TYPES} value={nappy} onChange={setNappy} />
          {notesField}
        </ActionDialog>
      )}
    </section>
  )
}
