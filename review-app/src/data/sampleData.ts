import type { Segment, DocumentRec, QeBandConfig } from './types'

// SharePoint 無しでも動かすためのダミー。ingestion/sample/review-package.sample.json と同内容。
export const SAMPLE_DOC: DocumentRec = {
  docId: 'doc-protocol-v3',
  name: 'protocol_v3.docx',
  status: 'need-review',
  modelPin: 'gpt-4o-2024-08',
  checkpointId: 'chk-abc123',
  segmentTotal: 4,
  segmentApproved: 1,
}

export const SAMPLE_SEGMENTS: Segment[] = [
  {
    segmentId: 'seg-0',
    docId: 'doc-protocol-v3',
    order: 0,
    segmentType: 'narrative',
    sourceText:
      'The primary estimand is defined as the change in symptom score at week 12 in the randomized population.',
    targetDraft:
      '本試験の主要なエスティマンドは、無作為化された全被験者集団における投与12週後の症状スコア変化量として定義される。',
    glossaryHits: [{ term: 'estimand', expected: '推定値', applied: false }],
    criticFlags: [
      { axis: 'L-Term', severity: 'major', message: '用語逸脱: estimand → 期待「推定値」／出力「エスティマンド」', mode: 'closed' },
    ],
    qeScore: 42,
    backTranslation: 'The primary estimand is defined as the change in symptom score at week 12...',
    provenance: { model: 'gpt-4o', modelPin: 'gpt-4o-2024-08', pass: 2, ts: '2026-07-22T00:00:00Z' },
    status: 'pending',
  },
  {
    segmentId: 'seg-1',
    docId: 'doc-protocol-v3',
    order: 1,
    segmentType: 'verbatim',
    sourceText: 'Any serious adverse event must be reported to the sponsor within 24 hours of awareness.',
    targetDraft: '重篤な有害事象は、治験責任医師が認知してから24時間以内に治験依頼者へ報告しなければならない。',
    glossaryHits: [],
    criticFlags: [],
    qeScore: 96,
    backTranslation: 'Any serious adverse event must be reported to the sponsor within 24 hours of awareness.',
    provenance: { model: 'gpt-4o', modelPin: 'gpt-4o-2024-08', pass: 2, ts: '2026-07-22T00:00:00Z' },
    status: 'approved',
  },
  {
    segmentId: 'seg-2',
    docId: 'doc-protocol-v3',
    order: 2,
    segmentType: 'narrative',
    sourceText: 'Subjects will be randomized 2:1 to the treatment or placebo group.',
    targetDraft: '被験者は2対1の割合で治療群またはプラセボ群に割り付けられる。',
    glossaryHits: [],
    criticFlags: [
      { axis: 'L-Style', severity: 'minor', message: '文体: 受動態の連続（advisory・訳は通す）', mode: 'open' },
    ],
    qeScore: 71,
    backTranslation: 'Subjects are randomized in a 2:1 ratio to treatment or placebo.',
    provenance: { model: 'gpt-4o', modelPin: 'gpt-4o-2024-08', pass: 2, ts: '2026-07-22T00:00:00Z' },
    status: 'pending',
  },
  {
    segmentId: 'seg-3',
    docId: 'doc-protocol-v3',
    order: 3,
    segmentType: 'narrative',
    sourceText: 'Written informed consent is obtained prior to any study procedure.',
    targetDraft: 'いかなる治験手技に先立っても、書面によるインフォームド・コンセントを取得する。',
    glossaryHits: [{ term: 'informed consent', expected: '同意', applied: false }],
    criticFlags: [
      { axis: 'L-Term', severity: 'major', message: '用語逸脱: informed consent → 期待「同意」／出力「インフォームド・コンセント」', mode: 'closed' },
    ],
    qeScore: 55,
    backTranslation: 'Written informed consent is obtained before any procedure.',
    provenance: { model: 'gpt-4o', modelPin: 'gpt-4o-2024-08', pass: 2, ts: '2026-07-22T00:00:00Z' },
    status: 'pending',
  },
]

export const DEFAULT_CONFIG: QeBandConfig = {
  projectId: 'default',
  redMax: 60,
  amberMax: 85,
  failClosedAxes: ['L-Term', 'L-Gov'],
  autoPassEnabled: true,
}
