import { useState } from 'react'
import type { MqmCategory, Segment, Severity } from '../data/types'

const MQM_CATS: MqmCategory[] = ['Accuracy', 'Terminology', 'Fluency', 'Style', 'Locale', 'Other']
const SEVS: Severity[] = ['critical', 'major', 'minor', 'neutral']

function qeColor(qe: number): string {
  return qe < 60 ? 'var(--danger-fg)' : qe < 85 ? 'var(--warn-fg)' : 'var(--ok-fg)'
}

// 該当セグメントの QE 確認 → 承認/修正/却下の導線。
export function DecisionStrip(props: {
  segment: Segment
  onAccept: () => void
  onEdit: (after: string, reason: string, promoteToGlossary: boolean) => void
  onReject: (cat: MqmCategory, sev: Severity, reason: string) => void
  onUndo: () => void
}) {
  const { segment: s, onAccept, onEdit, onReject, onUndo } = props
  const [mode, setMode] = useState<'view' | 'edit' | 'reject'>('view')
  const [draft, setDraft] = useState(s.finalTarget ?? s.targetDraft)
  const [reason, setReason] = useState('')
  // 用語逸脱(L-Term)や用語集ヒットがある修正は termbase 昇格の第一候補なので既定 ON。
  // ただし承認ゲート必須（フラグは Decisions に載るだけ、昇格の確定は harvest 側の承認）。
  const isTermFix = s.glossaryHits.length > 0 || s.criticFlags.some((f) => f.axis === 'L-Term')
  const [promote, setPromote] = useState(isTermFix)
  const [cat, setCat] = useState<MqmCategory>('Terminology')
  const [sev, setSev] = useState<Severity>('major')
  const approved = s.status === 'approved'
  const hasCritic = s.criticFlags.length > 0
  const axis = hasCritic ? s.criticFlags[0].axis : '—'
  const flagMsg = hasCritic ? s.criticFlags[0].message : '全チェック通過'

  return (
    <div className="strip">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', minWidth: 56 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: qeColor(s.qeScore), lineHeight: 1 }}>{s.qeScore}</div>
          <div className="muted" style={{ fontSize: 10 }}>QE / 100</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="muted" style={{ fontSize: 11 }}>
            {`セグメント ${s.order + 1}`} ・ critic: <span style={{ color: hasCritic ? 'var(--danger-fg)' : 'var(--ok-fg)' }}>{axis}</span>
          </div>
          <div style={{ fontSize: 12 }}>{flagMsg}</div>
          {s.backTranslation && (
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>逆翻訳: {s.backTranslation}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {approved ? (
            <>
              <span style={{ color: 'var(--ok-fg)', fontSize: 12 }}>✓ 承認済</span>
              <button onClick={onUndo}>取消</button>
            </>
          ) : (
            <>
              <button style={{ background: 'var(--ok-bg)', color: 'var(--ok-fg)', borderColor: 'var(--ok-fg)' }} onClick={onAccept}>承認</button>
              <button onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}>修正</button>
              <button onClick={() => setMode(mode === 'reject' ? 'view' : 'reject')}>却下</button>
            </>
          )}
        </div>
      </div>

      {mode === 'edit' && !approved && (
        <div style={{ marginTop: 10 }}>
          <textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <input
            style={{ width: '100%', marginTop: 6, padding: '6px 8px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6 }}
            placeholder="変更理由（必須）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={promote} onChange={(e) => setPromote(e.target.checked)} />
              用語集に昇格（承認ゲート行き）
              <span className="muted" style={{ fontSize: 10 }}>
                ✓ で Decision.promoteToGlossary=true → harvest が用語責任者の承認を経て termbase 化
              </span>
            </label>
            <button
              disabled={!reason.trim()}
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-fg)', borderColor: 'var(--accent-fg)' }}
              onClick={() => { onEdit(draft, reason, promote); setMode('view') }}
            >
              修正を確定
            </button>
          </div>
        </div>
      )}

      {mode === 'reject' && !approved && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="muted">MQM</label>
          <select value={cat} onChange={(e) => setCat(e.target.value as MqmCategory)}>
            {MQM_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sev} onChange={(e) => setSev(e.target.value as Severity)}>
            {SEVS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <input
            style={{ flex: 1, minWidth: 160, padding: '6px 8px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6 }}
            placeholder="理由"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button onClick={() => { onReject(cat, sev, reason); setMode('view') }}>差戻しを確定</button>
        </div>
      )}

      <div className="muted" style={{ fontSize: 10, marginTop: 7 }}>
        承認/修正/却下は Decisions リストへ追記（誰が・いつ・理由）＝監査証跡（Dataverse 互換）
      </div>
    </div>
  )
}
