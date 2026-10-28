type Props<T extends string> = {
  options: readonly T[]
  value: T | undefined
  onChange: (value: T) => void
}

export function Choice<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div class="chips">
      {options.map((option) => (
        <button
          key={option}
          class={option === value ? 'chip large selected' : 'chip large'}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
