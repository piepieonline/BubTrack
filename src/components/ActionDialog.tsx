import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { formatTime } from '../entries'

const MINUTES_AGO_OPTIONS = [0, 5, 10, 15, 20]
const CUSTOM = 'custom'

type Props = {
  title: string
  canConfirm?: boolean
  busy: boolean
  onConfirm: (at: Date) => void
  onCancel: () => void
  onDelete?: () => void
  children?: ComponentChildren
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000)

// A time later than now is taken to mean yesterday, e.g. entering 23:50 just after midnight.
function mostRecentTimeOfDay(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
  if (at > now) at.setDate(at.getDate() - 1)
  return at
}

export function ActionDialog({ title, canConfirm = true, busy, onConfirm, onCancel, onDelete, children }: Props) {
  const [selection, setSelection] = useState<number | typeof CUSTOM>(0)
  const [customTime, setCustomTime] = useState(() => formatTime(new Date()))

  const isCustom = selection === CUSTOM
  const confirm = () => onConfirm(isCustom ? mostRecentTimeOfDay(customTime) : minutesAgo(selection))

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div class="dialog" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <fieldset>
          <legend>When?</legend>
          <div class="chips">
            {MINUTES_AGO_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                class={minutes === selection ? 'chip selected' : 'chip'}
                onClick={() => setSelection(minutes)}
              >
                {minutes === 0 ? 'Now' : `${minutes}m ago`}
              </button>
            ))}
            <button class={isCustom ? 'chip selected' : 'chip'} onClick={() => setSelection(CUSTOM)}>
              Custom
            </button>
          </div>
          {isCustom && (
            <input
              class="custom-time"
              type="time"
              value={customTime}
              onInput={(e) => setCustomTime(e.currentTarget.value)}
            />
          )}
        </fieldset>
        <div class="dialog-actions">
          <button class="secondary" onClick={onCancel}>Cancel</button>
          <button disabled={!canConfirm || busy || (isCustom && !customTime)} onClick={confirm}>Save</button>
        </div>
        {onDelete && <button class="secondary danger" disabled={busy} onClick={onDelete}>Delete</button>}
      </div>
    </div>
  )
}
