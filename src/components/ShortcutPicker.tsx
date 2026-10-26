import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Check, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { choiceClass } from '@/components/Choice'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { themeVars } from '@/lib/accent'
import { SHORTCUT_ICONS } from '@/lib/shortcutItems'

const SLOT_COUNT = 6

const GROUPS: { label: string; ids: string[] }[] = [
  { label: 'nav.pay', ids: ['paynow', 'scan', 'transfer', 'bills', 'overseas', 'giro', 'topup'] },
  { label: 'nav.accounts', ids: ['goals', 'investments', 'accounts', 'insights'] },
  { label: 'shortcuts.cards', ids: ['cards'] },
  { label: 'nav.help', ids: ['insurance', 'rewards', 'help', 'staff'] },
]

type DragData = { source: 'slot' | 'list'; shortcutId: string; index: number }

const slotCollision: CollisionDetection = (args) => {
  if (args.pointerCoordinates) return pointerWithin(args)
  const hit = rectIntersection(args)
  return hit.length > 0 ? hit : closestCenter(args)
}

class MousePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: ReactPointerEvent) => {
        if (!nativeEvent.isPrimary || nativeEvent.button !== 0) return false
        return nativeEvent.pointerType !== 'touch'
      },
    },
  ]
}

function circleSize() {
  return { width: 'min(4rem, 72px)', height: 'min(4rem, 72px)' }
}

function ShortcutFace({ id, label, compact }: { id: string; label: string; compact: boolean }) {
  const Icon = SHORTCUT_ICONS[id]
  return (
    <>
      <span className="flex shrink-0 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--link)]" style={circleSize()}>
        {Icon ? <Icon aria-hidden size={26} strokeWidth={1.75} /> : null}
      </span>
      <span className={`block max-h-[2.8em] w-full max-w-full overflow-hidden text-center leading-tight [overflow-wrap:anywhere] ${compact ? 'text-[13px]' : 'text-[0.75rem]'}`}>{label}</span>
    </>
  )
}

function Slot({
  index,
  shortcutId,
  label,
  large,
  canDown,
  onRemove,
  onMove,
  moveUp,
  moveDown,
  emptyLabel,
}: {
  index: number
  shortcutId: string | null
  label: string
  large: boolean
  canDown: boolean
  onRemove: () => void
  onMove: (dir: number) => void
  moveUp: string
  moveDown: string
  emptyLabel: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: `slot-${index}`,
    disabled: !shortcutId,
    data: { source: 'slot', shortcutId: shortcutId ?? '', index } satisfies DragData,
  })
  const target = isOver && !isDragging
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: isDragging ? undefined : (transition || 'transform 200ms ease') }}
      className={`min-w-0 rounded-2xl ${target ? 'outline outline-2 outline-offset-2 outline-[var(--accent)]' : ''}`}
    >
      {shortcutId ? (
        <button
          type="button"
          className={`flex w-full flex-col items-center gap-1.5 rounded-2xl py-1 ${isDragging ? 'opacity-40' : ''}`}
          {...attributes}
          {...listeners}
          aria-pressed={true}
          onClick={onRemove}
        >
          <ShortcutFace id={shortcutId} label={label} compact={large} />
        </button>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-1">
          <span className="sr-only">{emptyLabel}</span>
          <span className="flex items-center justify-center rounded-full border-2 border-dashed border-[var(--line)] text-[var(--muted)] opacity-50" style={circleSize()}>
            <Plus aria-hidden size={22} strokeWidth={1.75} />
          </span>
        </div>
      )}
      {large && shortcutId && (
        <span className="mt-1 flex justify-center gap-1">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] disabled:opacity-30" aria-label={moveUp} disabled={index === 0} onClick={() => onMove(-1)}>
            <ChevronUp aria-hidden size={16} />
          </button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] disabled:opacity-30" aria-label={moveDown} disabled={!canDown} onClick={() => onMove(1)}>
            <ChevronDown aria-hidden size={16} />
          </button>
        </span>
      )}
    </div>
  )
}

function CatalogueTile({
  id,
  label,
  selected,
  dim,
  compact,
  onToggle,
}: {
  id: string
  label: string
  selected: boolean
  dim: boolean
  compact: boolean
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pick-${id}`,
    data: { source: 'list', shortcutId: id, index: -1 } satisfies DragData,
  })
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-pressed={selected}
      onClick={onToggle}
      className={`${choiceClass(selected)} relative flex w-full min-w-0 flex-col items-center gap-1.5 rounded-2xl py-2 ${dim ? 'opacity-45' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      <ShortcutFace id={id} label={label} compact={compact} />
      <span className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] ${selected ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
        <Check size={13} strokeWidth={3} />
      </span>
    </button>
  )
}

export function ShortcutPicker({ order, onChange }: { order: string[]; onChange: (next: string[]) => void }) {
  const app = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [note, setNote] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const suppress = useRef(false)
  const selected = order.filter((id, index) => id && order.indexOf(id) === index).slice(0, SLOT_COUNT)
  const full = selected.length >= SLOT_COUNT
  const large = app.prefs.textSize >= 24
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => selected[index] ?? null)
  const sensors = useSensors(
    useSensor(MousePointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const sayFull = () => {
    setNote('')
    requestAnimationFrame(() => setNote(t('shortcutFull')))
  }

  const toggle = (id: string) => {
    if (suppress.current) return
    if (selected.includes(id)) {
      setNote('')
      onChange(selected.filter((item) => item !== id))
      return
    }
    if (full) {
      sayFull()
      return
    }
    setNote('')
    onChange([...selected, id])
  }

  const onDragStart = (event: DragStartEvent) => {
    suppress.current = true
    const data = event.active.data.current as DragData | undefined
    setActive(data?.shortcutId || null)
  }

  const clearDrag = () => {
    setActive(null)
    window.setTimeout(() => {
      suppress.current = false
    }, 40)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const data = event.active.data.current as DragData | undefined
    const overId = event.over ? String(event.over.id) : ''
    const overSlot = overId.startsWith('slot-') ? Number(overId.slice(5)) : -1
    clearDrag()
    if (!data?.shortcutId) return

    if (data.source === 'slot') {
      const from = data.index
      if (overSlot < 0) {
        setNote('')
        onChange(selected.filter((_, index) => index !== from))
        return
      }
      if (overSlot === from || from < 0) return
      if (overSlot < selected.length) {
        const next = [...selected]
        const held = next[from]
        next[from] = next[overSlot]
        next[overSlot] = held
        onChange(next)
        return
      }
      if (overSlot >= selected.length) {
        const next = [...selected]
        const [item] = next.splice(from, 1)
        next.push(item)
        onChange(next)
        return
      }
      onChange(arrayMove(selected, from, overSlot))
      return
    }

    const id = data.shortcutId
    if (overSlot < 0) return
    const from = selected.indexOf(id)
    if (from >= 0) {
      if (overSlot >= selected.length) {
        const next = [...selected]
        next.splice(from, 1)
        next.push(id)
        onChange(next)
      } else if (from !== overSlot) onChange(arrayMove(selected, from, overSlot))
      setNote('')
      return
    }
    if (overSlot >= selected.length) {
      if (full) {
        sayFull()
        return
      }
      setNote('')
      onChange([...selected, id])
      return
    }
    const next = [...selected]
    next[overSlot] = id
    setNote('')
    onChange(next)
  }

  const move = (index: number, dir: number) => {
    const target = index + dir
    if (target < 0 || target >= selected.length) return
    onChange(arrayMove(selected, index, target))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={slotCollision} onDragStart={onDragStart} onDragCancel={clearDrag} onDragEnd={onDragEnd}>
      <section aria-labelledby="your-shortcuts-title">
        <h3 id="your-shortcuts-title" className="font-semibold">{t('quickActions')}</h3>
        <p className="mt-1 font-semibold">{t('selectedCount', { n: selected.length })}</p>
        <p className="mt-1 text-sm leading-snug text-[var(--muted)]">{t('reorderHint')}</p>
        <SortableContext items={slots.map((_, index) => `slot-${index}`)} strategy={rectSortingStrategy}>
          <div className="shortcut-grid mt-3 grid grid-cols-3 gap-3">
            {slots.map((id, index) => (
              <Slot
                key={`slot-${index}`}
                index={index}
                shortcutId={id}
                label={id ? t(`shortcuts.${id}`) : ''}
                large={large}
                canDown={index < selected.length - 1}
                moveUp={t('moveUp')}
                moveDown={t('moveDown')}
                emptyLabel={t('emptySlot')}
                onRemove={() => {
                  if (suppress.current || !id) return
                  setNote('')
                  onChange(selected.filter((item) => item !== id))
                }}
                onMove={(dir) => move(index, dir)}
              />
            ))}
          </div>
        </SortableContext>
        {note && <p className="mt-2" role="status">{note}</p>}
      </section>
      <section className="mt-6" aria-labelledby="all-shortcuts-title">
        <h3 id="all-shortcuts-title" className="font-semibold">{t('allShortcuts')}</h3>
        {GROUPS.map((group) => (
          <div key={group.label} className="mt-4">
            <h4 className="text-sm font-semibold text-[var(--muted)]">{t(group.label)}</h4>
            <div className="mt-2 grid grid-cols-3 gap-x-1 gap-y-3">
              {group.ids.map((id) => (
                <CatalogueTile key={id} id={id} label={t(`shortcuts.${id}`)} selected={selected.includes(id)} dim={full && !selected.includes(id)} compact={large} onToggle={() => toggle(id)} />
              ))}
            </div>
          </div>
        ))}
      </section>
      <DragOverlay zIndex={80} dropAnimation={null}>
        {active ? (
          <div style={themeVars(app.prefs)} className="flex w-[104px] flex-col items-center gap-1.5 rounded-2xl bg-[var(--card)] p-2 text-[var(--text)] shadow-[0_16px_36px_rgba(0,0,0,0.28)]">
            <ShortcutFace id={active} label={t(`shortcuts.${active}`)} compact={large} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
