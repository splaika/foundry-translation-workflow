<!-- 内部向け。Confidential | ©Seven to One, Inc. -->

# 治験文書 翻訳ワークフロー — 設計サマリー (GitHub Pages)

**社内限定 / Confidential。** GitHub Pages で図付き HTML として閲覧するための最小構成リポジトリ。

## 収録ファイル

| ファイル | 役割 |
|---|---|
| `index.html` | Pages 公開用の入口。marked.js で本文、mermaid.js で図を描画する自己完結レンダラ(Markdown を内蔵) |
| `index.md` | 本文ソース。GitHub のリポジトリ画面で開くと Mermaid が描画される |
| `.nojekyll` | Jekyll 処理を無効化し、ファイルをそのまま静的配信する |
| `robots.txt` | クローラ拒否(補助。実効的な検索避けは各 HTML の `noindex` メタタグ) |
| `mockups/review-app.html` | レビューアプリの動くモックアップ(対訳ドキュメント＋QE 帯フィルタ＋スーパーユーザー設定)。単独で開ける・外部依存なし・ダーク対応。設計サマリー §10-e から参照 |
| `review-app/` | **レビューアプリ スターター実装**(React + SharePoint / Dataverse-ready)。`npm install && npm run dev` で mock データ起動。構築手順は `review-app/docs/BUILD_GUIDE.md`(M0–M6)。メンバー引き渡し用 |

## 公開手順(private + 検索避け)

1. このフォルダを private リポジトリとして GitHub に push する。
2. **Settings → Pages → Source** を `Deploy from a branch` にし、ブランチ `main` / フォルダ `/ (root)` を選択。
3. 数分後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で図付きページが表示される。

> ⚠️ **private リポジトリで Pages を使うには GitHub Pro 以上が必要。** また個人アカウントでは Pages サイト自体は URL を知れば閲覧可能(アクセス制御は Enterprise Cloud 限定)。本リポジトリは `noindex` メタタグ + `robots.txt` で検索避けをしているが、URL 非共有の運用が前提。

## 更新のしかた

`index.md` と `index.html` の `<script id="md">` 内は**同じ本文の二重管理**になっている。本文を直したら両方に反映すること。
