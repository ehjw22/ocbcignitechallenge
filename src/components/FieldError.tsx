import { TriangleAlert } from 'lucide-react'

export function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="field-error">
      <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
