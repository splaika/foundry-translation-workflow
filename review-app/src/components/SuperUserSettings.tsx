import { useState } from 'react'
import type { CriticAxis, QeBandConfig } from '../data/types'

const AXES: { k: CriticAxis; t: string }[] = [
  { k: 'L-Term', t: '用語' },
  { k: 'L-Gov', t: '規制' },
  { k: 'L-Style', t: '文体' },
  { k: 'L-Struct', t: '構造' },
]

// スーパーユーザー向け QE 閾値設定。プロジェクト/文書種別ごと。変更は監査に残す想定。
export function SuperUserSettings(props: { config: QeBandConfig; onSave: (cfg: QeBandConfig) => Promise<void> }) {
  const [cfg, setCfg] = useState<QeBandConfig>(props.config)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof QeBandConfig>(k: K, v: QeBandConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }))
    setSaved(false)
  }
  function toggleAxis(a: CriticAxis) {
    set('failClosedAxes', cfg.failClosedAxes.includes(a) ? cfg.failClosedAxes.filter((x) => x !== a) : [...cfg.failClosedAxes, a])
  }

  const red = cfg.redMax
  const amber = Math.max(cfg.amberMax, red + 1)

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <b style={{ fontSize: 15 }}>QE 閾値設定</b>
        <span className="pill" style={{ background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}>スーパーユーザーのみ</span>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>プロジェクト / 文書種別ごとに設定。この境界で triage の並びと auto-pass が決まる。</p>

      <div className="band" style={{ marginBottom: 6 }}>
        <div style={{ width: `${red}%`, background: 'var(--danger-bg)', color: 'var(--danger-fg)' }}>要対応</div>
        <div style={{ width: `${amber - red}%`, background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}>注意</div>
        <div style={{ width: `${100 - amber}%`, background: 'var(--ok-bg)', color: 'var(--ok-fg)' }}>良好</div>
      </div>
      <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span>QE 0</span><span>100</span>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <span style={{ width: 140 }}><span style={{ color: 'var(--danger-fg)' }}>●</span> 要対応 の上限</span>
        <input type="range" min={1} max={99} step={1} value={red} onChange={(e) => set('redMax', Number(e.target.value))} />
        <span style={{ minWidth: 70, textAlign: 'right' }}>QE &lt; {red}</span>
      </div>
      <div className="row">
        <span style={{ width: 140 }}><span style={{ color: 'var(--warn-fg)' }}>●</span> 注意 の上限</span>
        <input type="range" min={2} max={100} step={1} value={amber} onChange={(e) => set('amberMax', Number(e.target.value))} />
        <span style={{ minWidth: 70, textAlign: 'right' }}>{red} 〜 {amber - 1}</span>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 8 }}>
        <b style={{ fontSize: 12 }}>軸オーバーライド（QE 値に関わらず要対応へ固定）</b>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {AXES.map((a) => {
          const on = cfg.failClosedAxes.includes(a.k)
          return (
            <button
              key={a.k}
              className="chip"
              onClick={() => toggleAxis(a.k)}
              style={{
                background: on ? 'var(--danger-bg)' : 'transparent',
                color: on ? 'var(--danger-fg)' : 'var(--text)',
                borderColor: on ? 'var(--danger-fg)' : 'var(--border)',
              }}
            >
              {on ? '🔒' : '○'} {a.k} {a.t}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <span>auto-pass を有効化 <span className="muted">（良好帯を既定 accept 候補に）</span></span>
        <button
          className="pill"
          onClick={() => set('autoPassEnabled', !cfg.autoPassEnabled)}
          style={{ background: cfg.autoPassEnabled ? 'var(--ok-bg)' : 'transparent', color: cfg.autoPassEnabled ? 'var(--ok-fg)' : 'var(--muted)' }}
        >
          {cfg.autoPassEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <span className="muted" style={{ fontSize: 11 }}>閾値変更は Settings 監査ログに記録（誰が・いつ・旧→新）</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setCfg(props.config)}>取消</button>
          <button
            style={{ background: 'var(--accent-bg)', color: 'var(--accent-fg)', borderColor: 'var(--accent-fg)' }}
            onClick={async () => { await props.onSave({ ...cfg, amberMax: amber }); setSaved(true) }}
          >
            保存
          </button>
        </div>
      </div>
      {saved && <p className="muted" style={{ fontSize: 11, textAlign: 'right', marginBottom: 0 }}>保存しました（監査に記録）</p>}
    </div>
  )
}
