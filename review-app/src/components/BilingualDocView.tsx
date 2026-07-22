import type { CSSProperties } from 'react'
import { bandOf, type Band, type QeBandConfig, type Segment } from '../data/types'

export type Layout = 'lr' | 'tb'

const BG: Record<Band, string> = { red: 'var(--danger-bg)', amber: 'var(--warn-bg)', green: 'var(--ok-bg)' }

// ハイライト表記は「背景色のみ・下線なし」（要注意/承認済のみ着色、auto-pass 相当は無印）。
function highlightStyle(seg: Segment, cfg: QeBandConfig, dim: boolean): CSSProperties {
  const style: CSSProperties = {}
  if (seg.status === 'approved') style.background = BG.green
  else {
    const b = bandOf(seg, cfg)
    if (b === 'red' || b === 'amber') style.background = BG[b]
  }
  if (dim) style.opacity = 0.32
  return style
}

// 対訳ドキュメント。原文(EN)と訳文(JA)を Word 体裁で並置し、同一セグメントを連動ハイライト。
// ここでは segment を段落として描画する（sample データ / offset 未整備でも動く）。
// 実 .docx を体裁ごと描画する場合は lib/docx.ts の renderDocxWithSpans() に差し替える。
export function BilingualDocView(props: {
  segments: Segment[]
  config: QeBandConfig
  layout: Layout
  selectedId: string | null
  isDim: (s: Segment) => boolean
  onSelect: (id: string) => void
}) {
  const { segments, config, layout, selectedId, isDim, onSelect } = props

  const Pane = ({ lang }: { lang: 'en' | 'ja' }) => (
    <div
      className="pane"
      style={{
        borderRight: layout === 'lr' && lang === 'en' ? '1px solid var(--border)' : undefined,
        borderBottom: layout === 'tb' && lang === 'en' ? '1px solid var(--border)' : undefined,
        background: lang === 'en' ? 'var(--surface)' : 'var(--surface2)',
      }}
    >
      <div className="doctitle">{lang === 'en' ? 'Clinical Study Protocol v3.0' : '治験実施計画書 第3.0版'}</div>
      <div className="docsub">{lang === 'en' ? 'Source (EN)' : '対訳 (JA)'}</div>
      {segments.map((s) => {
        const dim = isDim(s)
        return (
          <div key={s.segmentId}>
            <h4 style={{ opacity: dim ? 0.32 : 1 }}>{`セグメント ${s.order + 1}`}</h4>
            <p>
              <span
                className="seg"
                style={{
                  ...highlightStyle(s, config, dim),
                  outline: s.segmentId === selectedId ? '2px solid var(--accent-fg)' : undefined,
                }}
                onClick={() => onSelect(s.segmentId)}
              >
                {lang === 'en' ? s.sourceText : s.finalTarget ?? s.targetDraft}
              </span>
            </p>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="panegrid" style={{ gridTemplateColumns: layout === 'lr' ? '1fr 1fr' : '1fr' }}>
      <Pane lang="en" />
      <Pane lang="ja" />
    </div>
  )
}
