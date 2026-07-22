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
    // eslint-disable-next-line no-console
    console.info('[Decisions 追記]', d)
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
