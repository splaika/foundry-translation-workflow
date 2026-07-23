<!-- 内部向け。Confidential | ©Seven to One, Inc. -->

# 検証記録 — 承認/修正/却下 と「ナレッジ蓄積（Foundry 側）」＋ ビルド健全性

**日付**: 2026-07-23 ／ **対象**: `review-app`（mock アダプタ・`npm run dev`）

レビューアプリの裁定がどう記録され、修正がどう用語集ナレッジとして Foundry 側に溜まるかを実機検証し、
その過程で見つかった**ビルド不通**と**ドキュメント不整合**を修正した記録。

---

## 1. 仕組み（フライホイール＝レビューが燃料）

UI は Foundry を叩かない。裁定は `Decisions` 台帳に**追記のみ**（誰が・いつ・理由＝監査）。
Logic Apps が非同期に harvest して振り分ける：

| レビュー操作 | 溜まる先 | 効き方 |
|---|---|---|
| 承認(accept) | 翻訳メモリ TM | 次回 exact/fuzzy 再利用 |
| 修正(edit) | 用語集 termbase へ**昇格キュー（承認ゲート必須）** | 次回から決定論的に正訳語 |
| 却下(reject, MQM) | critic 改善コーパス（few-shot / AdaptCT） | 同型誤りの検出力向上 |

溜まるのは**グラウンディング資産**（TM・用語集・few-shot）で **モデル再学習ではない**
→ モデル pin を崩さず品質だけ上がる。**無断昇格禁止**（＝フライホイール逆回転）。

**昇格フラグの結線**（修正フォームの「用語集に昇格」→ `Decision.promoteToGlossary`）と
`MockAdapter` の harvest 可視化ログは **main (`d3a14f5`) に実装済み**。実機で
`promoteToGlossary:true` が Decision に乗ることを確認済み。

## 2. この変更で直したもの

| # | 所見 | 対応 |
|---|---|---|
| (d) | **ビルド不通**：`DecisionStrip` の `axis === '—'` が TS2367（`criticFlags[0]` が常に定義扱いで比較不成立）。このリポジトリは一度も `tsc`/ビルドされておらず露見していなかった。**main は `npm run build` が失敗する状態**。 | `hasCritic = criticFlags.length > 0` 真偽で表現し直し。`npm run build`（`tsc -b && vite build`）がクリーン通過することを確認。トグル（`d3a14f5`）には触れていない。 |
| (b) | **doc/impl 不整合**：設計文が `PromotionQueue` を独立リストとして記述していたが、provisioning は作らず、実装は `Decisions.PromoteToGlossary` フラグで表現していた。 | `index.md` / `index.html` / `types.ts` / `provisioning` を **「独立リストではなくフラグ列＋harvest 側の承認ゲート。materialize したい場合は Logic Apps の下流投影」** に統一。 |

## 3. 検証の根拠

- **ビルド**：修正前は `DecisionStrip.tsx(41,70) TS2367` で失敗。修正後は `tsc -b && vite build` 成功（333 modules）。
- **ナレッジループ（実行時）**：mock 起動 → 修正フォームで「用語集に昇格」ON → 確定 →
  記録された Decision に `promoteToGlossary:true` を実機で捕捉（console フック）。承認→TM、却下→critic の各ログも確認。

## 4. 残（この repo の外・既定路線どおり）

- Logic Apps harvest（Decisions → TM/termbase/critic 実体化）＝ BUILD_GUIDE **M3–M5**。
- termbase 昇格の承認ゲート UI（`PromoteToGlossary=true` の Decisions を一覧して承認/棄却する画面）は未実装（M5 想定）。
