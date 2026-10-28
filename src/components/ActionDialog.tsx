import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'

const MINUTES_AGO_OPTIONS = [0, 5, 10, 15, 20, 30]

type Props = {
  title: string
  canConfirm?: boolean
  busy: boolean
  onConfirm: (minutesAgo: number) => void
  onCancel: () => void
  children?: ComponentChildren
}

export function ActionDialog({ title, canConfirm = true, busy, onConfirm, onCancel, children }: Props) {
  const [minutesAgo, setMinutesAgo] = useState(0)

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div class="dialog" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <fieldset>
          <legend>How long ago?</legend>
          <div class="chips">
            {MINUTES_AGO_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                class={minutes === minutesAgo ? 'chip selected' : 'chip'}
                onClick={() => setMinutesAgo(minutes)}
              >
                {minutes === 0 ? 'Now' : `${minutes}m`}
              </button>
            ))}
          </div>
        </fieldset>
        <div class="dialog-actions">
          <button class="secondary" onClick={onCancel}>Cancel</button>
          <button disabled={!canConfirm || busy} onClick={() => onConfirm(minutesAgo)}>Save</button>
        </div>
      </div>
    </div>
  )
}
