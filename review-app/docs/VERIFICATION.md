<!-- 内部向け。Confidential | ©Seven to One, Inc. -->

# 検証記録 — 承認/修正/却下 と「ナレッジ蓄積（Foundry 側）」の動作確認

**日付**: 2026-07-23 ／ **対象**: `review-app`（mock アダプタ・`npm run dev`）
**目的**: レビューアプリの裁定がどのように記録され、修正がどう「用語集ナレッジ」として Foundry 側に溜まるかを実機で確認する。

---

## 1. 確認したこと（実機・mock）

`localhost:5173` で mock データ（治験プロトコル 4 セグメント）を起動し、全導線を操作。裁定は
`useReview.decide()` → `IReviewRepository.postDecision()` で **`Decisions` 台帳に追記のみ**（誰が・いつ・理由）。
**UI は Foundry を一切叩かない**（Foundry が SharePoint に置く → UI が拾う、の非同期 HITL）。

捕捉した実 Decision レコード（mock の console 追記をフックして取得）:

```json
// 修正: estimand「エスティマンド」→ 定訳「推定値」、用語集昇格フラグ ON
{ "action":"edit", "segmentId":"seg-0",
  "before":"…主要なエスティマンドは…", "after":"…主要な推定値は…",
  "reason":"用語集準拠: estimand の社内定訳「推定値」を適用…",
  "promoteToGlossary": true }          // ← 本検証で結線した項目

// 却下: informed consent の用語逸脱（MQM 分類つき）
{ "action":"reject", "segmentId":"seg-3",
  "mqmCategory":"Terminology", "mqmSeverity":"major",
  "reason":"ICH/社内定訳「同意」から逸脱。few-shot へ同型誤り検出用に投入。" }

// 承認: 文体 advisory は通す
{ "action":"accept", "segmentId":"seg-2", "before":"被験者は2対1の割合で…" }

// サインオフ → Foundry resume(checkpoint chk-abc123)（HITL ループが閉じる）
```

## 2. ナレッジ蓄積の仕組み（フライホイール）

```
レビュアーの裁定 → Decisions台帳(追記のみ/削除権剥奪=監査)
                        │ Logic Apps が承認分を非同期 harvest
        ┌───────────────┼────────────────────┐
   承認(accept)      修正(edit)           却下(reject/MQM)
        ↓                ↓                    ↓
    翻訳メモリTM     用語集termbase        critic改善コーパス
                    へ昇格（承認ゲート）    (few-shot / AdaptCT)
        └──────── 次 run の“入力”に効く（グラウンディング） ───────┘
```

- 溜まるのは **グラウンディング資産（TM・用語集・few-shot）**。**モデル再学習ではない** → モデル pin を崩さず品質だけ上がる。
- **承認なき自動昇格は禁止**（無断昇格＝フライホイール逆回転）。
- harvest 本体（Decisions → TM/termbase/critic への振り分け）は **この repo の外＝Logic Apps 側**（BUILD_GUIDE M3–M5）。repo が担うのは *追記台帳まで*。

## 3. 検証で見つかった穴 → 本コミットで対応

| # | 所見 | 対応 |
|---|---|---|
| (a) | 修正→用語集昇格の構造化フラグ `promoteToGlossary` が **UI から立てられなかった**（修正フォームに導線なし）。型・SharePoint 列・provisioning は揃っていたが、edit レコードは常に未設定＝Logic Apps が拾えない。 | `DecisionStrip` の修正フォームに **「用語集に昇格（承認ゲート行き）」チェックボックス**を追加し、`ReviewPage → useReview → Decision.promoteToGlossary` まで結線。L-Term/用語ヒットのある修正は既定 ON、その他は OFF。実機で `promoteToGlossary:true` の記録を確認。 |
| (b) | 設計文が `PromotionQueue` を独立リストとして記述していたが、provisioning は作らず、実装は `Decisions.PromoteToGlossary` フラグで表現していた（doc と impl のズレ）。 | `index.md`/`index.html`/`types.ts`/`provisioning` を **「独立リストではなくフラグ列＋harvest 側の承認ゲート。materialize したい場合は Logic Apps の下流投影」** に統一。 |
| (c) | `MockAdapter.postDecision` が監査ログ1本のみで、**蓄積先（TM / 用語集 / critic）が mock で見えなかった**（§10-e のフライホイール表が絵に描いた餅）。 | postDecision を **3ストリームの擬似 harvest ログ**に拡張：accept/edit→`[TM 追記]`、edit+promote→`[用語集 昇格キュー] 承認ゲート待ち`、reject→`[critic 改善コーパス]`。mock でフライホイールの行き先が console に出る。 |
| (d) | **潜在型エラー**：`DecisionStrip` の `axis === '—'` が TS2367（`criticFlags[0]` が常に定義扱いのため比較不成立）。このリポジトリは今まで一度も `tsc`/ビルドされておらず露見していなかった。 | `hasCritic = criticFlags.length > 0` 真偽で表現し直し。`npm run build`（`tsc -b && vite build`）が**クリーン通過**することを確認（本リポジトリ初のビルド成功）。 |

**関連する運用上の発見**：`_recent-outputs`（vault）は 2026-07-22 に「commit d3a14f5 で promoteToGlossary 結線＋MockAdapter 3ストリーム化を push 済み」と記録していたが、**origin/main は 9f0802d が最新で d3a14f5 は存在しない**（push が着地していなかった）。本コミットがその未着地分を実際に届ける。→ 「完了はユーザー実環境で確認するまで仮」（検収主権）の実例。

## 検証の根拠（どこまで確認したか）

- **ビルド**：`npm run build` = `tsc -b`（型チェック）＋ `vite build` が成功（333 modules）。
- **実行時（フラグ）**：mock 起動 → 修正フォームで「用語集に昇格」ON → 確定 → 記録された Decision に `promoteToGlossary:true` を実機で捕捉（console フック）。
- **3ストリームログ**：ビルド通過＋dev サーバが新 `MockAdapter` を配信していることを確認。console への3行出力自体の再実行は、プレビューペインが 0x0（非表示）化したため未実施（分岐は `d.action`/`d.promoteToGlossary` の決定論的条件のみ）。

## 4. 再現手順

```
cd review-app && npm install && npm run dev   # http://localhost:5173（mock、SharePoint 不要）
```
QE 帯「要対応」の estimand セグメントで［修正］→ 訳を直し、［用語集に昇格］を ON → ［修正を確定］。
ブラウザ DevTools console に `[Decisions 追記] {…, promoteToGlossary:true}` が出れば OK。

## 5. 残（この repo の外・既定路線どおり）

- Logic Apps harvest（Decisions → TM/termbase/critic 実体化）＝ BUILD_GUIDE **M3–M5**。
- termbase 昇格の承認ゲート UI（スーパーユーザー用の昇格レビュー画面）は未実装（`PromoteToGlossary=true` の Decisions を一覧して承認/棄却する画面を M5 で追加想定）。
