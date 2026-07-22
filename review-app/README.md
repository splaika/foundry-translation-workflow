<!-- 内部向け。Confidential | ©Seven to One, Inc. -->

# 治験翻訳 レビューアプリ — スターター実装（React + SharePoint / Dataverse-ready）

Foundry 翻訳パイプラインの出力を、人が Word 体裁のまま裁いて記録する HITL レビューアプリの**スターター実装**。
設計の全体像は親フォルダの設計サマリー（`../index.md` §10-c/§10-e）を参照。

## すぐ動かす（SharePoint 不要）

```
cd review-app
npm install
cp .env.example .env      # 既定 VITE_DATA_ADAPTER=mock のままでよい
npm run dev               # http://localhost:5173
```

`mock` アダプタが `src/data/sampleData.ts`（=`ingestion/sample/review-package.sample.json` と同内容）で動くので、SharePoint も Entra も無しで UI 挙動を確認できる。承認・裁定・閾値変更は console に監査ログ相当を出す。

## 何がどこにあるか

| 場所 | 役割 |
|---|---|
| `src/data/types.ts` | **review package スキーマ**（型）＋ `bandOf()`（QE 帯判定の唯一の関数） |
| `src/data/IReviewRepository.ts` | UI が依存する唯一のデータ境界（抽象） |
| `src/data/MockAdapter.ts` | SharePoint 不要のインメモリ実装（既定） |
| `src/data/SharePointAdapter.ts` | Microsoft Graph 経由の SharePoint リスト実装 |
| `src/data/DataverseAdapter.ts` | 移行先スタブ（M6 で実装） |
| `src/data/repository.ts` | `VITE_DATA_ADAPTER` で実装を選ぶ唯一の場所 |
| `src/auth/authProvider.ts` | MSAL + Teams 検出（**Teams 依存はこの 1 ファイルに隔離**＝単独でも動く） |
| `src/components/*` | 対訳ドキュメント / 対訳グリッド / QE フィルタ / 裁定ストリップ / 設定 |
| `src/lib/docx.ts` | mammoth で実 .docx を描画し offset で span を割る（実文書対応時に使用） |
| `provisioning/` | `sharepoint-lists.ps1`（Dataverse 互換列でリスト作成）／`entra-setup.md`（App Role） |
| `ingestion/` | `review-package.schema.json`（Foundry→UI データ契約）＋サンプル＋取り込み手順 |
| `docs/BUILD_GUIDE.md` | **M0–M6 の構築ロジック**（このアプリを本番まで持っていく手順） |

## 本番（SharePoint）へ切り替え

1. `provisioning/entra-setup.md` でアプリ登録＋App Role。
2. `provisioning/sharepoint-lists.ps1` で台帳リスト作成。
3. `.env` で `VITE_DATA_ADAPTER=sharepoint` ＋ Entra/SharePoint 値を設定。
4. `npm run dev`（or Static Web Apps へデプロイ）。

詳細は [docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md)。

## 状態

- ✅ 動く: UI 一式、mock データ、QE 帯フィルタ、承認/修正/却下、スーパーユーザー設定、テーマ切替。
- 🔧 実装を要する（BUILD_GUIDE 参照）: SharePoint 実接続の検証、実 .docx 描画＋offset ハイライト（`lib/docx.ts` を BilingualDocView に結線）、Logic Apps 取り込み/resume、Dataverse アダプタ、Teams manifest。
