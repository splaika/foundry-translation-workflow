import type { IReviewRepository } from './IReviewRepository'
import type { DocumentRec, Segment, Decision, QeBandConfig, TriageStatus } from './types'

// 監査要件が立った段階で SharePoint から差し替える先。
// テーブル/列は SharePoint 版と 1:1 で設計済み（列名・型・選択肢値が互換）なので、
// ここは Web API（OData v4: /api/data/v9.2/<entityset>）の呼び出しに置き換えるだけ。
//
// 実装は SharePointAdapter とほぼ同型。差分は:
//   - エンドポイント: https://<org>.crm7.dynamics.com/api/data/v9.2/
//   - 認証スコープ: https://<org>.crm.dynamics.com/.default
//   - 追記のみ列は Dataverse の「列レベルセキュリティ + 監査ON」で担保（SharePoint より強い）
//   - 電子署名は Power Automate 承認 or ネイティブ署名列で
//
// TODO(実装): getAccessToken(['https://<org>.crm.dynamics.com/.default']) を使い、
//             cr_documents / cr_segments / cr_decisions / cr_reviewconfig を CRUD する。
export class DataverseAdapter implements IReviewRepository {
  private notImplemented(): never {
    throw new Error(
      'DataverseAdapter は未実装です。docs/BUILD_GUIDE.md「M6: Dataverse への移行」を参照。' +
        'SharePointAdapter と同型で Web API に置き換えてください。',
    )
  }
  async listQueue(): Promise<DocumentRec[]> { return this.notImplemented() }
  async getDocument(_docId: string): Promise<DocumentRec> { return this.notImplemented() }
  async getSegments(_docId: string): Promise<Segment[]> { return this.notImplemented() }
  async postDecision(_d: Decision): Promise<void> { return this.notImplemented() }
  async updateSegmentStatus(_id: string, _s: TriageStatus, _f?: string): Promise<void> { return this.notImplemented() }
  async signOff(_docId: string, _reviewer: string): Promise<void> { return this.notImplemented() }
  async getConfig(_projectId: string): Promise<QeBandConfig> { return this.notImplemented() }
  async saveConfig(_cfg: QeBandConfig, _actor: string): Promise<void> { return this.notImplemented() }
}
