import { bandOf, type QeBandConfig, type Segment } from '../data/types'

const DOT: Record<string, string> = { red: 'var(--danger-fg)', amber: 'var(--warn-fg)', green: 'var(--ok-fg)' }

// 対訳グリッド。行=セグメントの bilingual grid。
export function ReviewGrid(props: {
  segments: Segment[]
  config: QeBandConfig
  selectedId: string | null
  isDim: (s: Segment) => boolean
  onSelect: (id: string) => void
}) {
  const { segments, config, selectedId, isDim, onSelect } = props
  const cols = '1fr 1fr 26px'
  return (
    <div className="pane">
      <div className="muted" style={{ display: 'grid', gridTemplateColumns: cols, fontSize: 11, padding: '6px 4px', borderBottom: '1px solid var(--border)' }}>
        <span>原文 (EN)</span>
        <span>訳文 (JA)</span>
        <span />
      </div>
      {segments.map((s) => {
        const dot = s.status === 'approved' ? DOT.green : DOT[bandOf(s, config)]
        return (
          <div
            key={s.segmentId}
            onClick={() => onSelect(s.segmentId)}
            style={{
              display: 'grid',
              gridTemplateColumns: cols,
              gap: 6,
              padding: '8px 4px',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: 12,
              opacity: isDim(s) ? 0.32 : 1,
              background: s.segmentId === selectedId ? 'var(--accent-bg)' : undefined,
            }}
          >
            <span className="muted">{s.sourceText}</span>
            <span>{s.finalTarget ?? s.targetDraft}</span>
            <span style={{ textAlign: 'center' }}>
              <span className="dot" style={{ background: dot }} />
            </span>
          </div>
        )
      })}
    </div>
  )
}
