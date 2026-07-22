import { useEffect, useState } from 'react'
import { ReviewPage } from './components/ReviewPage'
import { SuperUserSettings } from './components/SuperUserSettings'
import { useReview } from './useReview'
import { currentRoles } from './auth/authProvider'

export default function App() {
  const review = useReview()
  const [screen, setScreen] = useState<'review' | 'settings'>('review')
  const [isSuper, setIsSuper] = useState(false)

  useEffect(() => {
    void currentRoles().then((r) => setIsSuper(r.includes('SuperUser')))
  }, [])

  function toggleTheme() {
    const root = document.documentElement
    const cur = root.getAttribute('data-theme')
    const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', dark ? 'light' : 'dark')
  }

  return (
    <div className="wrap">
      <div className="nav">
        <h1>治験翻訳 レビューアプリ</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="tabs">
            <button className={screen === 'review' ? 'on' : ''} onClick={() => setScreen('review')}>
              レビュー画面
            </button>
            {isSuper && (
              <button
                className={screen === 'settings' ? 'on' : ''}
                onClick={() => setScreen('settings')}
              >
                スーパーユーザー設定
              </button>
            )}
          </div>
          <button onClick={toggleTheme} title="テーマ切替">◐</button>
        </div>
      </div>

      {review.loading && <p className="muted">読み込み中…</p>}

      {!review.loading && screen === 'review' && <ReviewPage review={review} />}
      {!review.loading && screen === 'settings' && isSuper && review.config && (
        <SuperUserSettings config={review.config} onSave={review.saveConfig} />
      )}
    </div>
  )
}
