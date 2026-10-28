import { useState } from 'preact/hooks'

type Props = {
  initial: string
  busy: boolean
  onSave: (notes: string) => void
  onCancel?: () => void
}

export function NotesEditor({ initial, busy, onSave, onCancel }: Props) {
  const [notes, setNotes] = useState(initial)

  return (
    <div class="notes-editor">
      <textarea
        rows={2}
        placeholder="Notes"
        value={notes}
        onInput={(e) => setNotes(e.currentTarget.value)}
      />
      <div class="notes-actions">
        {onCancel && <button class="secondary small" onClick={onCancel}>Cancel</button>}
        <button class="small" disabled={busy || notes === initial} onClick={() => onSave(notes)}>
          Save notes
        </button>
      </div>
    </div>
  )
}
