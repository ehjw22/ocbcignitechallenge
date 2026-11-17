export function Switch({
  on,
  label,
  onChange,
  id,
}: {
  on: boolean
  label: string
  onChange: (next: boolean) => void
  id?: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="pref-switch"
      onClick={() => onChange(!on)}
    >
      <span className="pref-switch__track" aria-hidden style={{ background: on ? 'var(--accent)' : 'var(--line)' }}>
        <span className={`pref-switch__knob ${on ? 'pref-switch__knob--on' : ''}`} />
      </span>
    </button>
  )
}