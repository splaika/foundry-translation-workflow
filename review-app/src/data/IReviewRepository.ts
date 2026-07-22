import type {
  DocumentRec,
  Segment,
  Decision,
  QeBandConfig,
  TriageStatus,
} from './types'

// UI が依存する唯一のデータ境界。実装（Mock / SharePoint / Dataverse）を差し替えても
// UI・ロジックは無改修。移行は new するアダプタを変えるだけ。
export interface IReviewRepository {
  listQueue(): Promise<DocumentRec[]>
  getDocument(docId: string): Promise<DocumentRec>
  getSegments(docId: string): Promise<Segment[]>

  // 裁定を Decisions（追記のみ）へ書き、Segment の状態も更新する。
  postDecision(d: Decision): Promise<void>
  updateSegmentStatus(
    segmentId: string,
    status: TriageStatus,
    finalTarget?: string,
  ): Promise<void>

  // 文書サインオフ（電子署名＝Part 11）。状態を signed にし、Foundry resume のトリガになる。
  signOff(docId: string, reviewer: string): Promise<void>

  // スーパーユーザー設定。saveConfig は変更を Settings 監査にも残す想定。
  getConfig(projectId: string): Promise<QeBandConfig>
  saveConfig(cfg: QeBandConfig, actor: string): Promise<void>
}
