import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'type'> & {
  value: number
}

/** Keep incomplete native number input (empty, minus, decimal) out of project data. */
export function NumberField({ value, onChange, onFocus, onBlur, onKeyDown, ...props }: Props) {
  const [draft, setDraft] = useState(String(value))
  const published = useRef(value)

  useEffect(() => {
    // The store may normalize -0 to 0; keep the sign while typing -0.75.
    if (value !== published.current) setDraft(String(value))
    published.current = value
  }, [value])

  return <input {...props} type="number" value={draft}
    onFocus={onFocus}
    onChange={event => {
      setDraft(event.currentTarget.value)
      const number = event.currentTarget.valueAsNumber
      if (Number.isFinite(number)) {
        published.current = number
        onChange?.(event)
      }
    }}
    onBlur={event => {
      setDraft(String(value))
      onBlur?.(event)
    }}
    onKeyDown={event => {
      onKeyDown?.(event)
      if (!event.defaultPrevented && event.key === 'Enter') event.currentTarget.blur()
    }}
  />
}
