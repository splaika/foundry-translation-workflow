// ===== review package（パイプライン → レビュー層の受け渡しスキーマ） =====
// これが Foundry パイプラインが 1 セグメントあたり吐く単位。ingestion/review-package.schema.json と対応。

export type TriageStatus = 'pending' | 'approved' | 'rejected' | 'edited'
export type CriticMode = 'closed' | 'open' // fail-closed（止める）/ fail-open（注意）
export type CriticAxis = 'L-Term' | 'L-Gov' | 'L-Style' | 'L-Struct'
export type Severity = 'critical' | 'major' | 'minor' | 'neutral'

export interface GlossaryHit {
  term: string
  expected: string
  applied: boolean
}

export interface CriticFlag {
  axis: CriticAxis
  severity: Severity
  message: string
  mode: CriticMode
}

// 元 .docx（描画後テキスト）中の文字位置。原文・訳文それぞれに持つ＝bilingual alignment。
export interface OffsetSpan {
  start: number
  end: number
}

export interface Segment {
  segmentId: string
  docId: string
  order: number
  sourceText: string
  targetDraft: string
  finalTarget?: string // edit で確定した訳（未編集なら undefined）
  segmentType: string // 分類ラベル: verbatim / coded / narrative 等
  sourceSpan?: OffsetSpan
  targetSpan?: OffsetSpan
  groupId?: string // 1:N alignment のときの束ね ID（同一 groupId は一括ハイライト）
  glossaryHits: GlossaryHit[]
  criticFlags: CriticFlag[]
  qeScore: number // 0-100
  backTranslation?: string
  provenance: { model: string; modelPin: string; pass: number; ts: string }
  status: TriageStatus
}

export interface DocumentRec {
  docId: string
  name: string
  sourceDocxUrl?: string
  targetDocxUrl?: string
  status: 'need-review' | 'in-review' | 'signed'
  checkpointId?: string // Foundry / Agent Framework の resume 用
  modelPin: string
  reviewer?: string
  signedAt?: string
  segmentTotal: number
  segmentApproved: number
}

export type MqmCategory = 'Accuracy' | 'Terminology' | 'Fluency' | 'Style' | 'Locale' | 'Other'

// 監査単位。追記のみ（上書きしない）。
export interface Decision {
  decisionId?: string
  segmentId: string
  docId: string
  actor: string
  action: 'accept' | 'edit' | 'reject' | 'auto-pass'
  before?: string
  after?: string
  mqmCategory?: MqmCategory
  mqmSeverity?: Severity
  reason?: string
  promoteToGlossary?: boolean // true のとき PromotionQueue へ（承認ゲート経由）
  ts: string
}

// スーパーユーザーが設定する QE 帯。プロジェクト/文書種別ごと。
export interface QeBandConfig {
  projectId: string
  redMax: number // これ未満 = 要対応
  amberMax: number // これ未満（かつ redMax 以上）= 注意 / 以上 = 良好
  failClosedAxes: CriticAxis[] // QE 値に関わらず要対応へ固定する軸
  autoPassEnabled: boolean
}

export type Band = 'red' | 'amber' | 'green'

// QE 値 + 軸オーバーライドから帯を決める唯一の関数（UI 全体で共有）。
export function bandOf(seg: Segment, cfg: QeBandConfig): Band {
  const hasFailClosed = seg.criticFlags.some(
    (f) => cfg.failClosedAxes.includes(f.axis) && f.mode === 'closed',
  )
  if (hasFailClosed) return 'red' // 軸オーバーライドが QE に優先
  if (seg.qeScore < cfg.redMax) return 'red'
  if (seg.qeScore < cfg.amberMax) return 'amber'
  return 'green'
}
