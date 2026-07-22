<!-- 内部向け。Confidential | ©Seven to One, Inc. -->

# 構築ガイド（M0–M6）— このスターターを本番まで持っていく

メンバーがこれを読んで手を動かせば、mock で動く現状 → SharePoint バックエンド → Dataverse 拡張、まで進められる。
各 M は独立に検収（現物確認）できる粒度。設計の根拠は `../index.md`（§10-c/§10-e）。

---

## M0. 動かす（半日）— ゴール: mock で全画面が動く

```
cd review-app && npm install && cp .env.example .env && npm run dev
```
- 検収: 対訳ドキュメント（左右/上下）、QE 帯フィルタで要対応→注意→承認済の順送り、承認/修正/却下、スーパーユーザー設定でスライダーを動かすと帯が変わる、テーマ切替でダークが崩れない。
- ここまで外部依存ゼロ。**まずこの現物をチームに見せて較正**（現物先行）。

## M1. データ契約を固める（半日）— ゴール: review package の確定

- `ingestion/review-package.schema.json` をパイプライン担当と合意（特に `sourceSpan/targetSpan`（offset ペア）と `criticFlags[].mode`（closed/open））。
- `src/data/types.ts` はこの契約の TypeScript 表現。契約が変わったら両方直す。
- 検収: サンプル JSON がスキーマに valid（`ajv` などで検証）。

## M2. SharePoint 台帳を作る（半日）— ゴール: リスト作成＋接続

1. `provisioning/entra-setup.md` に従いアプリ登録・API 権限・App Role。
2. `Connect-PnPOnline` 後、`provisioning/sharepoint-lists.ps1 -SiteUrl <site>` を実行。
3. `Decisions` リストは削除権限を運用側で剥奪＋バージョン管理 ON（＝追記のみ＝監査）。
4. `.env` に `VITE_DATA_ADAPTER=sharepoint` ＋ サイト/リスト名/Entra 値。
- 検収: `npm run dev` でサインインでき、`SharePointAdapter.listQueue()` が空でもエラーなく返る。手動で Documents に 1 行入れてキューに出るか。

## M3. 取り込み（Logic Apps / Function）（1–2 日）— ゴール: Foundry 出力が UI に出る

- `ingestion/README.md` の契約どおり、パイプライン出力を `Documents`/`Segments` に展開する Logic Apps（or Function）を作る。
- 重い構造は `PackageJson` 列に JSON 文字列で格納（`SharePointAdapter.spToSegment` が復元）。
- 検収: サンプル 1 文書を流し込み → UI のキューに出て、対訳が並び、QE 帯が正しく色分けされる。

## M4. 実 .docx 描画＋offset ハイライト（2–3 日）— ゴール: Word 体裁で連動ハイライト

- `src/lib/docx.ts` の `renderDocx()`＋`injectSpans()` を `BilingualDocView` に結線（現状はサンプル段落描画）。
- 原文/訳文の docx をライブラリから取得 → mammoth で描画 → offset ペアで span を割る → クリックで両ペイン同一 `data-seg`（1:N は `data-group`）を連動ハイライト。
- **前提**: M1 の offset ペアがパイプラインから来ていること。来ていなければ段落単位描画のまま（フォールバック）。
- 検収: 実プロトコル 1 本で、要注意箇所が文書体裁の中で着色され、クリックで左右が連動する。

## M5. 書き戻し（resume）＋サインオフ（1 日）— ゴール: HITL ループが閉じる

- UI のサインオフ → `Documents.Status=signed` → Logic Apps が検知 → `CheckpointId` で Agent Framework に応答して resume。
- 検収: サインオフ後にパイプラインが最終出力まで進む。Decisions に監査行が残る（誰が・いつ・理由）。

## M6. Dataverse への移行（監査要件が立ったら）— ゴール: アダプタ差し替え

- `src/data/DataverseAdapter.ts` を実装（SharePointAdapter と同型、Web API `/api/data/v9.2/` へ置換、スコープ `https://<org>.crm.dynamics.com/.default`）。
- テーブル/列は SharePoint 版と 1:1（列名・型・選択肢値が互換）なので、移行は「作り直し」でなく「載せ替え」。
- `.env` の `VITE_DATA_ADAPTER=dataverse` に変えるだけで UI・ロジックは無改修。
- 追記のみ列は Dataverse の列レベルセキュリティ＋監査 ON で担保（SharePoint より強い）。電子署名は Power Automate 承認 or ネイティブ署名列。

---

## フィードバックループ（M3–M5 と並行して仕込む）

レビューの裁定はフライホイールの燃料（設計サマリー §10-e）:
- **承認** → 翻訳メモリ(TM) に追記。
- **修正(edit)** → 用語集(termbase) へ**昇格キュー**（`Decision.promoteToGlossary=true`）。**承認ゲート必須**（無断昇格＝逆回転）。
- **却下(reject, MQM)** → critic 改善コーパス（few-shot / AdaptCT）。
- 収集は Logic Apps が `Decisions` から非同期に harvest（UI は Foundry を叩かない）。**モデル再学習ではなくグラウンディング資産化**（モデル pin を崩さない）。

## テスト観点（最低限）

- `bandOf()` の単体テスト（fail-closed 軸が QE に優先する／閾値境界）。
- SharePointAdapter の field マッピング往復（spToSegment / addItem）。
- 権限: 非 SuperUser で設定タブが出ないこと。
- ダークモード表示（`data-theme` 手動切替＋OS 設定の両方）。
