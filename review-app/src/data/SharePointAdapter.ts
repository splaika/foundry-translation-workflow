import type { IReviewRepository } from './IReviewRepository'
import type { DocumentRec, Segment, Decision, QeBandConfig, TriageStatus } from './types'
import { graph, resolveListId } from './graphClient'

// SharePoint リスト（Microsoft Graph 経由）実装。
// リスト列は provisioning/sharepoint-lists.ps1 で Dataverse 互換に作成される。
// SharePoint 列内部名（fields.<InternalName>）とアプリ型の対応はこのファイルに閉じ込める。
export class SharePointAdapter implements IReviewRepository {
  private siteId = import.meta.env.VITE_SP_SITE_ID
  private names = {
    docs: import.meta.env.VITE_SP_LIST_DOCUMENTS,
    segs: import.meta.env.VITE_SP_LIST_SEGMENTS,
    decisions: import.meta.env.VITE_SP_LIST_DECISIONS,
    config: import.meta.env.VITE_SP_LIST_CONFIG,
  }

  private async items(listName: string, query = ''): Promise<any[]> {
    const listId = await resolveListId(this.siteId, listName)
    const data = await graph.get(
      `/sites/${this.siteId}/lists/${listId}/items?expand=fields${query ? '&' + query : ''}`,
    )
    return data.value ?? []
  }
  private async addItem(listName: string, fields: Record<string, unknown>): Promise<void> {
    const listId = await resolveListId(this.siteId, listName)
    await graph.post(`/sites/${this.siteId}/lists/${listId}/items`, { fields })
  }
  private async patchItemByKey(
    listName: string,
    keyField: string,
    keyValue: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const listId = await resolveListId(this.siteId, listName)
    const rows = await this.items(listName, `$filter=fields/${keyField} eq '${keyValue}'`)
    const itemId = rows[0]?.id
    if (!itemId) throw new Error(`${listName} に ${keyField}=${keyValue} が見つかりません`)
    await graph.patch(`/sites/${this.siteId}/lists/${listId}/items/${itemId}/fields`, fields)
  }

  async listQueue(): Promise<DocumentRec[]> {
    const rows = await this.items(this.names.docs, `$filter=fields/Status ne 'signed'`)
    return rows.map(spToDoc)
  }
  async getDocument(docId: string): Promise<DocumentRec> {
    const rows = await this.items(this.names.docs, `$filter=fields/DocId eq '${docId}'`)
    return spToDoc(rows[0])
  }
  async getSegments(docId: string): Promise<Segment[]> {
    const rows = await this.items(this.names.segs, `$filter=fields/DocId eq '${docId}'`)
    return rows.map(spToSegment).sort((a, b) => a.order - b.order)
  }
  async postDecision(d: Decision): Promise<void> {
    // Decisions は追記のみ（列レベルの削除権限を運用側で剥奪しておく＝監査証跡）。
    await this.addItem(this.names.decisions, {
      SegmentId: d.segmentId,
      DocId: d.docId,
      Actor: d.actor,
      Action: d.action,
      BeforeText: d.before ?? '',
      AfterText: d.after ?? '',
      MqmCategory: d.mqmCategory ?? '',
      MqmSeverity: d.mqmSeverity ?? '',
      Reason: d.reason ?? '',
      PromoteToGlossary: !!d.promoteToGlossary,
      Ts: d.ts,
    })
  }
  async updateSegmentStatus(
    segmentId: string,
    status: TriageStatus,
    finalTarget?: string,
  ): Promise<void> {
    const fields: Record<string, unknown> = { Status: status }
    if (finalTarget !== undefined) fields.FinalTarget = finalTarget
    await this.patchItemByKey(this.names.segs, 'SegmentId', segmentId, fields)
  }
  async signOff(docId: string, reviewer: string): Promise<void> {
    await this.patchItemByKey(this.names.docs, 'DocId', docId, {
      Status: 'signed',
      Reviewer: reviewer,
      SignedAt: new Date().toISOString(),
    })
    // status=signed を Logic Apps が検知 → checkpointId で Foundry を resume する（ingestion/README.md）。
  }
  async getConfig(projectId: string): Promise<QeBandConfig> {
    const rows = await this.items(this.names.config, `$filter=fields/ProjectId eq '${projectId}'`)
    return spToConfig(rows[0], projectId)
  }
  async saveConfig(cfg: QeBandConfig, actor: string): Promise<void> {
    // 変更は追記型で残す（Settings 監査）。最新行を読む運用にすると変更履歴がそのまま監査ログになる。
    await this.addItem(this.names.config, {
      ProjectId: cfg.projectId,
      RedMax: cfg.redMax,
      AmberMax: cfg.amberMax,
      FailClosedAxes: cfg.failClosedAxes.join(','),
      AutoPassEnabled: cfg.autoPassEnabled,
      ChangedBy: actor,
      ChangedAt: new Date().toISOString(),
    })
  }
}

// ---- SharePoint fields ⇄ アプリ型 マッピング（列内部名はここだけ） ----
function spToDoc(row: any): DocumentRec {
  const f = row.fields
  return {
    docId: f.DocId,
    name: f.Title ?? f.DocId,
    sourceDocxUrl: f.SourceDocxUrl,
    targetDocxUrl: f.TargetDocxUrl,
    status: f.Status,
    checkpointId: f.CheckpointId,
    modelPin: f.ModelPin,
    reviewer: f.Reviewer,
    signedAt: f.SignedAt,
    segmentTotal: f.SegmentTotal ?? 0,
    segmentApproved: f.SegmentApproved ?? 0,
  }
}
function spToSegment(row: any): Segment {
  const f = row.fields
  // review package の重い列（criticFlags 等）は JSON 文字列で 1 列に格納している前提。
  const pkg = f.PackageJson ? JSON.parse(f.PackageJson) : {}
  return {
    segmentId: f.SegmentId,
    docId: f.DocId,
    order: f.SortOrder ?? 0,
    sourceText: f.SourceText,
    targetDraft: f.TargetDraft,
    finalTarget: f.FinalTarget || undefined,
    segmentType: f.SegmentType ?? 'narrative',
    sourceSpan: pkg.sourceSpan,
    targetSpan: pkg.targetSpan,
    groupId: pkg.groupId,
    glossaryHits: pkg.glossaryHits ?? [],
    criticFlags: pkg.criticFlags ?? [],
    qeScore: f.QeScore ?? 0,
    backTranslation: pkg.backTranslation,
    provenance: pkg.provenance ?? { model: '', modelPin: f.ModelPin ?? '', pass: 0, ts: '' },
    status: (f.Status as TriageStatus) ?? 'pending',
  }
}
function spToConfig(row: any, projectId: string): QeBandConfig {
  if (!row) return { projectId, redMax: 60, amberMax: 85, failClosedAxes: ['L-Term', 'L-Gov'], autoPassEnabled: true }
  const f = row.fields
  return {
    projectId,
    redMax: f.RedMax ?? 60,
    amberMax: f.AmberMax ?? 85,
    failClosedAxes: (f.FailClosedAxes ?? 'L-Term,L-Gov').split(',').filter(Boolean),
    autoPassEnabled: !!f.AutoPassEnabled,
  }
}
