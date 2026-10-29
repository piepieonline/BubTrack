import { useState } from 'preact/hooks'
import { ActionDialog } from '../components/ActionDialog'
import { formatDate, formatDuration, formatTime } from '../entries'
import type { RowStore } from '../rowStore'
import { addTimer, deleteTimer, updateTimer, type Timer } from '../timers'
import type { Perform } from '../useRows'
import { useNow } from '../useNow'

type Props = {
  store: RowStore
  timers: Timer[]
  busy: boolean
  perform: Perform<Timer>
}

function formatWhen(date: Date, now: number) {
  if (formatDate(date) === formatDate(new Date(now))) return formatTime(date)
  return `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} ${formatTime(date)}`
}

export function TimersPage({ store, timers, busy, perform }: Props) {
  const now = useNow(15_000)
  const [updating, setUpdating] = useState<Timer>()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [everyHours, setEveryHours] = useState('')

  const parsedEveryHours = Number(everyHours)
  const canAdd = !!name.trim() && parsedEveryHours > 0

  function openAdd() {
    setName('')
    setEveryHours('')
    setAdding(true)
  }

  async function confirmUpdate(at: Date) {
    if (await perform((fresh) => updateTimer(store, fresh, updating!.name, at))) setUpdating(undefined)
  }

  async function confirmDelete() {
    if (await perform((fresh) => deleteTimer(store, fresh, updating!.name))) setUpdating(undefined)
  }

  async function confirmAdd(at: Date) {
    if (await perform((fresh) => addTimer(store, fresh, name, parsedEveryHours, at))) setAdding(false)
  }

  return (
    <section class="timers-page">
      {timers.length === 0 && <p class="muted">No timers yet</p>}
      <ul class="timer-list">
        {timers.map((timer) => {
          const msUntilNext = timer.nextAt.getTime() - now
          const due = msUntilNext <= 0
          return (
            <li key={timer.rowNumber} class={due ? 'timer due' : 'timer'}>
              <div class="timer-info">
                <strong>{timer.name}</strong>
                <span class="muted">
                  Last {formatWhen(timer.lastAt, now)} · {formatDuration(now - timer.lastAt.getTime())} ago
                </span>
                <span class="timer-next">
                  {due
                    ? `Due since ${formatWhen(timer.nextAt, now)} · ${formatDuration(-msUntilNext)} ago`
                    : `Next ${formatWhen(timer.nextAt, now)} · in ${formatDuration(msUntilNext)}`}
                </span>
              </div>
              <button disabled={busy} onClick={() => setUpdating(timer)}>Update</button>
            </li>
          )
        })}
      </ul>
      <button class="secondary add-timer" disabled={busy} onClick={openAdd}>Add timer</button>

      {updating && (
        <ActionDialog
          title={`Update ${updating.name}`}
          busy={busy}
          onConfirm={confirmUpdate}
          onCancel={() => setUpdating(undefined)}
          onDelete={confirmDelete}
        />
      )}
      {adding && (
        <ActionDialog title="Add timer" busy={busy} canConfirm={canAdd} onConfirm={confirmAdd} onCancel={() => setAdding(false)}>
          <input placeholder="Name, e.g. Paracetamol" value={name} onInput={(e) => setName(e.currentTarget.value)} />
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            placeholder="Every how many hours?"
            value={everyHours}
            onInput={(e) => setEveryHours(e.currentTarget.value)}
          />
        </ActionDialog>
      )}
    </section>
  )
}
