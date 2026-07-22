# Foundry アウトプットの取り込み（非同期 HITL）

**UI が Foundry を叩くのではなく、Foundry が SharePoint に置く → UI が拾う。**（設計サマリー §6・§10-e）

```
Foundry パイプライン完了
  └─ Logic Apps / Azure Functions が書込:
       ├ 原本 .docx / 訳文 .docx → SharePoint ドキュメントライブラリ
       ├ review-package(JSON)   → Segments リスト（1 セグメント=1 アイテム、PackageJson 列に構造を格納）
       └ Documents に status="need-review" + checkpointId
                    │
   React UI ─ Graph で need-review を購読 → キュー表示 → 裁定
                    │
   React UI ─ Decisions に追記 ＋ Documents.status="signed"
                    │
   Logic Apps が status 変化を検知 → checkpointId で Foundry を resume → 最終出力
```

## 取り込みステップ（Logic Apps / Function 側の実装契約）

1. パイプライン出力を [`review-package.schema.json`](review-package.schema.json) に検証（契約）。
2. `Documents` に 1 行 upsert（`DocId`, `Status=need-review`, `CheckpointId`, `ModelPin`, `SegmentTotal`）。
3. `segments[]` を `Segments` に展開。基本列（`SegmentId/DocId/SortOrder/SourceText/TargetDraft/QeScore/Status=pending`）＋重い構造は `PackageJson` に JSON 文字列で格納（`SharePointAdapter.spToSegment` が復元）。
4. 原本/訳文 .docx をドキュメントライブラリへ。`Documents.SourceDocxUrl/TargetDocxUrl` に URL。

## 書き戻し（resume）

- UI が `Documents.Status="signed"` にした変化を Logic Apps がトリガ検知。
- `CheckpointId` で Agent Framework の `request_info` に応答を返し、パイプラインを継続。
- **UI は Foundry を直接知らない** → Foundry の Workflows 廃止(2026-12)→Agent Framework 移行に UI が巻き込まれない。
- 書込を Logic Apps 経由にすると **レビュアーに Power Platform 対話ライセンス不要**（人数課金回避）。

## offset（bilingual alignment）が最優先

- 対訳ドキュメントの連動ハイライトは、各セグメントの `sourceSpan`/`targetSpan`（原文/訳文の文字オフセットペア）が前提。
- これは **Foundry タグ付け段の責務**。offset が無いと `src/lib/docx.ts` の実文書ハイライトが成立しない（段落単位描画にフォールバックはするが「文書体裁で該当箇所」は出せない）。
- EN/JA の文境界ズレ（1 EN 文 → 複数 JA 文）は `groupId` で束ねる。

## ローカル検証

`ingestion/sample/review-package.sample.json` が `src/data/sampleData.ts` と同内容。MockAdapter がこれを使うので、SharePoint 無しで `npm run dev` すれば取り込み後の UI 挙動をそのまま確認できる。
