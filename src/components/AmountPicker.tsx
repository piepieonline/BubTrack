import { useState } from 'preact/hooks'

const PRESET_STEP_ML = 5
const STEPPER_STEP_ML = 1
const DEFAULT_ANCHOR_ML = 15
const PRESET_OFFSETS = [-1, 0, 1, 2]

function presetsAround(anchorMl: number) {
  const anchor = Math.max(2 * PRESET_STEP_ML, Math.round(anchorMl / PRESET_STEP_ML) * PRESET_STEP_ML)
  return PRESET_OFFSETS.map((offset) => anchor + offset * PRESET_STEP_ML)
}

type Props = {
  label: string
  value: number
  recentMl?: number
  onChange: (value: number) => void
}

export function AmountPicker({ label, value, recentMl, onChange }: Props) {
  const [custom, setCustom] = useState(false)
  const set = (amount: number) => onChange(Math.max(0, Math.round(amount)))

  return (
    <div class="amount-picker">
      <div class="amount-header">
        <span class="muted">{label}</span>
        <div class="stepper">
          <button class="chip" disabled={value <= 0} onClick={() => set(value - STEPPER_STEP_ML)}>−</button>
          <span class="amount-value">{value} ml</span>
          <button class="chip" onClick={() => set(value + STEPPER_STEP_ML)}>+</button>
        </div>
      </div>
      <div class="chips">
        {presetsAround(recentMl ?? DEFAULT_ANCHOR_ML).map((amount) => (
          <button
            key={amount}
            class={!custom && amount === value ? 'chip selected' : 'chip'}
            onClick={() => {
              setCustom(false)
              set(amount)
            }}
          >
            {amount}
          </button>
        ))}
        <button class={custom ? 'chip selected' : 'chip'} onClick={() => setCustom(!custom)}>Custom</button>
      </div>
      {custom && (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="ml"
          value={value || ''}
          onInput={(e) => set(Number(e.currentTarget.value) || 0)}
        />
      )}
    </div>
  )
}
