import { useMemo, useState } from 'react'
import type { useReview } from '../useReview'
import { bandOf, type Segment } from '../data/types'
import { QeFilterBar, type FilterKey } from './QeFilterBar'
import { BilingualDocView, type Layout } from './BilingualDocView'
import { ReviewGrid } from './ReviewGrid'
import { DecisionStrip } from './DecisionStrip'

type Review = ReturnType<typeof useReview>

export function ReviewPage({ review }: { review: Review }) {
  const { doc, segments, config, decide, undo, signOff } = review
  const [view, setView] = useState<'doc' | 'grid'>('doc')
  const [layout, setLayout] = useState<Layout>('lr')
  const [filter, setFilter] = useState<FilterKey>('red')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const matches = (s: Segment): boolean => {
    if (!config) return true
    if (filter === 'all') return true
    if (filter === 'done') return s.status === 'approved'
    if (s.status === 'approved') return false
    return bandOf(s, config) === filter
  }

  const matched = useMemo(() => segments.filter(matches), [segments, filter, config])
  const selected = segments.find((s) => s.segmentId === selectedId) ?? matched[0] ?? segments[0] ?? null

  if (!doc || !config) return null

  return (
    <>
      <div className="card">
        <div className="bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pill" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
              Teams タブ / 単独アプリ 共通
            </span>
            <b>{doc.name}</b>
            <span className="muted">EN ⇄ JA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="tabs" style={{ border: '1px solid var(--border)' }}>
              <button className={view === 'doc' ? 'on' : ''} onClick={() => setView('doc')}>対訳ドキュメント</button>
              <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>対訳グリッド</button>
            </div>
            {view === 'doc' && (
              <div className="tabs" style={{ border: '1px solid var(--border)' }}>
                <button className={layout === 'lr' ? 'on' : ''} onClick={() => setLayout('lr')} title="左右">▮▮</button>
                <button className={layout === 'tb' ? 'on' : ''} onClick={() => setLayout('tb')} title="上下">▬</button>
              </div>
            )}
            <span className="muted">承認 <b>{doc.segmentApproved}</b>/{doc.segmentTotal}</span>
            <button
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-fg)', borderColor: 'var(--accent-fg)' }}
              onClick={() => void signOff()}
            >
              サインオフ
            </button>
          </div>
        </div>

        <QeFilterBar
          segments={segments}
          config={config}
          filter={filter}
          onFilter={(f) => {
            setFilter(f)
            const first = segments.find((s) => (f === 'all' ? true : f === 'done' ? s.status === 'approved' : s.status !== 'approved' && bandOf(s, config) === f))
            setSelectedId(first?.segmentId ?? null)
          }}
          matched={matched}
          selectedId={selected?.segmentId ?? null}
          onStep={(id) => setSelectedId(id)}
        />

        {view === 'doc' ? (
          <BilingualDocView
            segments={segments}
            config={config}
            layout={layout}
            selectedId={selected?.segmentId ?? null}
            isDim={(s) => filter !== 'all' && !matches(s)}
            onSelect={setSelectedId}
          />
        ) : (
          <ReviewGrid
            segments={segments}
            config={config}
            selectedId={selected?.segmentId ?? null}
            isDim={(s) => filter !== 'all' && !matches(s)}
            onSelect={setSelectedId}
          />
        )}

        {selected && (
          <DecisionStrip
            segment={selected}
            onAccept={() => void decide(selected, 'accept')}
            onEdit={(after, reason) => void decide(selected, 'edit', { after, reason })}
            onReject={(cat, sev, reason) =>
              void decide(selected, 'reject', { mqmCategory: cat, mqmSeverity: sev, reason })
            }
            onUndo={() => void undo(selected)}
          />
        )}
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        QE 帯で「要対応 → 注意」の順に順送り。該当箇所クリックで両ペイン連動ハイライト → 下部で QE 確認 → 承認。
        ハイライトは背景色のみ（<span style={{ color: 'var(--danger-fg)' }}>赤=要対応</span>・
        <span style={{ color: 'var(--warn-fg)' }}>黄=注意</span>・
        <span style={{ color: 'var(--ok-fg)' }}>緑=承認済</span>）。
      </p>
    </>
  )
}
