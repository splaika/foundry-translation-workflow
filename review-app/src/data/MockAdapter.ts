import type { IReviewRepository } from './IReviewRepository'
import type { DocumentRec, Segment, Decision, QeBandConfig, TriageStatus } from './types'
import { SAMPLE_DOC, SAMPLE_SEGMENTS, DEFAULT_CONFIG } from './sampleData'

// SharePoint 不要でそのまま動く実装。メモリ上に保持。開発・デモ・テスト用。
// 承認/裁定は console に「Decisions 追記」ログを出す（実運用では SharePointAdapter が追記）。
export class MockAdapter implements IReviewRepository {
  private segments: Segment[] = SAMPLE_SEGMENTS.map((s) => ({ ...s }))
  private doc: DocumentRec = { ...SAMPLE_DOC }
  private config: QeBandConfig = { ...DEFAULT_CONFIG }
  private decisions: Decision[] = []

  async listQueue(): Promise<DocumentRec[]> {
    return [this.recalc()]
  }
  async getDocument(): Promise<DocumentRec> {
    return this.recalc()
  }
  async getSegments(): Promise<Segment[]> {
    return this.segments.map((s) => ({ ...s }))
  }
  async postDecision(d: Decision): Promise<void> {
    this.decisions.push(d)
    // ① 監査台帳（常に・追記のみ）。実運用では SharePointAdapter が Decisions に追記。
    // eslint-disable-next-line no-console
    console.info('[Decisions 追記]', d)
    // ②③ フライホイールの行き先を可視化（§10-e）。実運用では UI ではなく Logic Apps が
    //     Decisions から非同期に harvest して振り分ける。ここは mock が蓄積先を見せる擬似ログ。
    if (d.action === 'accept' || d.action === 'edit') {
      // eslint-disable-next-line no-console
      console.info('[TM 追記] 承認済み対訳を翻訳メモリへ（次回 exact/fuzzy 再利用）', {
        segmentId: d.segmentId,
        target: d.action === 'edit' ? d.after : d.before,
      })
    }
    if (d.action === 'edit' && d.promoteToGlossary) {
      // eslint-disable-next-line no-console
      console.info('[用語集 昇格キュー] 承認ゲート待ち — 無断昇格しない（フライホイール逆回転の防止）', {
        segmentId: d.segmentId,
        before: d.before,
        after: d.after,
        reason: d.reason,
      })
    }
    if (d.action === 'reject') {
      // eslint-disable-next-line no-console
      console.info('[critic 改善コーパス] MQM 分類を few-shot / AdaptCT へ（同型誤りの検出力向上）', {
        segmentId: d.segmentId,
        mqmCategory: d.mqmCategory,
        mqmSeverity: d.mqmSeverity,
      })
    }
  }
  async updateSegmentStatus(
    segmentId: string,
    status: TriageStatus,
    finalTarget?: string,
  ): Promise<void> {
    const s = this.segments.find((x) => x.segmentId === segmentId)
    if (s) {
      s.status = status
      if (finalTarget !== undefined) s.finalTarget = finalTarget
    }
  }
  async signOff(docId: string, reviewer: string): Promise<void> {
    this.doc.status = 'signed'
    this.doc.reviewer = reviewer
    this.doc.signedAt = new Date().toISOString()
    // eslint-disable-next-line no-console
    console.info('[サインオフ]', docId, reviewer, '→ Foundry resume (checkpoint)', this.doc.checkpointId)
  }
  async getConfig(): Promise<QeBandConfig> {
    return { ...this.config }
  }
  async saveConfig(cfg: QeBandConfig, actor: string): Promise<void> {
    const before = { ...this.config }
    this.config = { ...cfg }
    // eslint-disable-next-line no-console
    console.info('[Settings 監査] 閾値変更', { actor, before, after: cfg })
  }

  private recalc(): DocumentRec {
    this.doc.segmentTotal = this.segments.length
    this.doc.segmentApproved = this.segments.filter((s) => s.status === 'approved').length
    return { ...this.doc }
  }
}
