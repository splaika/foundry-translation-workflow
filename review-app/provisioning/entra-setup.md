# Entra ID（旧 Azure AD）セットアップ手順

顧客テナント内で、顧客管理者が実施する（テナント主権）。新規インフラ不要＝既存 M365 テナントの ID 管理。

## 1. アプリ登録（App registration）

1. Entra 管理センター (`entra.microsoft.com`) → アプリの登録 → 新規登録。
2. 名前: `Translation Review App`。サポート対象: 単一テナント。
3. リダイレクト URI（SPA）: 開発 `http://localhost:5173`、本番 `https://<your-static-web-app>`（＋ Teams タブ用に Teams の埋込 URL）。
4. 控える: **アプリケーション (クライアント) ID** → `.env` の `VITE_ENTRA_CLIENT_ID`、**ディレクトリ (テナント) ID** → `VITE_ENTRA_TENANT_ID`。

## 2. API のアクセス許可

- Microsoft Graph → 委任 → `Sites.ReadWrite.All`, `User.Read` を追加 → **管理者の同意を付与**。
  （SharePoint リスト読み書き用。より絞るなら `Sites.Selected` + 対象サイトへの権限付与。）

## 3. App Role の定義（スーパーユーザー認可）

「アプリロール」→ 新規作成:

| 表示名 | 値 (value) | 許可されるメンバーの種類 | 説明 |
|---|---|---|---|
| Super User | `SuperUser` | ユーザー/グループ | QE 閾値など設定を変更できる |
| Reviewer | `Reviewer` | ユーザー/グループ | レビュー・裁定を行う |

- 割り当ては **エンタープライズ アプリケーション → ユーザーとグループ** で、対象ユーザー（or セキュリティグループ）に付与。
- サインイン時トークンの `roles` クレームに値が入る → アプリは `roles.includes('SuperUser')` で設定画面を出す（`src/auth/authProvider.ts`）。

> 「ロールを切る」= ここでのユーザー/グループ割り当て。アプリのコード改修は不要（人の出し入れだけ）。
> Azure RBAC（リソース権限）・Entra ディレクトリロール（Global Admin 等）とは別レイヤ。

## 4. Teams タブとして使う場合（任意）

- `@microsoft/teams-js` の SSO を使うため、Teams アプリ manifest に本アプリの URL とアプリ登録の情報を設定。
- Teams 用に「公開されている API の公開」→ `api://<domain>/<clientId>` のスコープ + Teams クライアント (`1fec8e78-...`, `5e3ce6c0-...`) を事前承認。
- 単独アプリのときは本節は不要（Teams 依存は `authProvider.ts` の 1 か所に隔離済み）。
