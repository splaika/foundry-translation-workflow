import { bandOf, type QeBandConfig, type Segment } from '../data/types'

export type FilterKey = 'red' | 'amber' | 'done' | 'all'

const CHIPS: { key: FilterKey; label: string; sub: string; fg: string; bg: string }[] = [
  { key: 'red', label: '要対応', sub: '', fg: 'var(--danger-fg)', bg: 'var(--danger-bg)' },
  { key: 'amber', label: '注意', sub: '', fg: 'var(--warn-fg)', bg: 'var(--warn-bg)' },
  { key: 'done', label: '承認済', sub: '', fg: 'var(--ok-fg)', bg: 'var(--ok-bg)' },
  { key: 'all', label: 'すべて', sub: '', fg: 'var(--muted)', bg: 'var(--accent-bg)' },
]

function count(segs: Segment[], cfg: QeBandConfig, key: FilterKey): number {
  return segs.filter((s) => {
    if (key === 'all') return true
    if (key === 'done') return s.status === 'approved'
    if (s.status === 'approved') return false
    return bandOf(s, cfg) === key
  }).length
}

export function QeFilterBar(props: {
  segments: Segment[]
  config: QeBandConfig
  filter: FilterKey
  matched: Segment[]
  selectedId: string | null
  onFilter: (f: FilterKey) => void
  onStep: (id: string) => void
}) {
  const { segments, config, filter, matched, selectedId, onFilter, onStep } = props
  const idx = Math.max(0, matched.findIndex((s) => s.segmentId === selectedId))

  function step(delta: number) {
    if (!matched.length) return
    const next = (idx + delta + matched.length) % matched.length
    onStep(matched[next].segmentId)
  }

  return (
    <div className="bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="muted">QE 帯</span>
        {CHIPS.map((c) => {
          const on = filter === c.key
          const sub =
            c.key === 'red' ? `QE<${config.redMax}` : c.key === 'amber' ? `${config.redMax}–${config.amberMax - 1}` : ''
          return (
            <button
              key={c.key}
              className="chip"
              onClick={() => onFilter(c.key)}
              style={{
                borderColor: on ? c.fg : 'var(--border)',
                background: on ? c.bg : 'transparent',
                color: on ? c.fg : 'var(--text)',
              }}
            >
              {c.label}
              {sub && <span className="muted" style={{ fontSize: 10 }}> {sub}</span>} · {count(segments, config, c.key)}
            </button>
          )
        })}
      </div>
      {filter !== 'all' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => step(-1)}>‹</button>
          <span className="muted" style={{ minWidth: 70, textAlign: 'center' }}>
            {matched.length ? `${idx + 1} / ${matched.length} 件` : '0 件'}
          </span>
          <button onClick={() => step(1)}>次へ ›</button>
        </div>
      )}
    </div>
  )
}
