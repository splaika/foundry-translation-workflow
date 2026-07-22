import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser'
import * as microsoftTeams from '@microsoft/teams-js'

// 単独 Web でも Teams タブでも同一ビルドで動く認証層。
// 起動時に「Teams コンテキスト内か」を feature-detect し、認証経路だけ切り替える。
// Teams 固有コードはこのファイルに隔離する（＝単独アプリは Teams 依存なしで完全動作）。

let inTeams = false
let msal: PublicClientApplication | null = null
let account: AccountInfo | null = null

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID
const redirectUri = import.meta.env.VITE_ENTRA_REDIRECT_URI

function getMsal(): PublicClientApplication {
  if (!msal) {
    msal = new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri,
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
  }
  return msal
}

export async function initAuth(): Promise<void> {
  if (import.meta.env.VITE_DATA_ADAPTER === 'mock') return // mock はサインイン不要
  try {
    await microsoftTeams.app.initialize()
    inTeams = true
  } catch {
    inTeams = false
  }
  const m = getMsal()
  await m.initialize()
  const resp = await m.handleRedirectPromise()
  if (resp?.account) account = resp.account
  else account = m.getAllAccounts()[0] ?? null
}

export async function getAccessToken(scopes: string[]): Promise<string> {
  if (inTeams) {
    // Teams SSO: タブ用トークンを取得（バックエンドで OBO 交換する構成もあり）。
    return microsoftTeams.authentication.getAuthToken()
  }
  const m = getMsal()
  if (!account) {
    const login = await m.loginPopup({ scopes })
    account = login.account
  }
  try {
    const r = await m.acquireTokenSilent({ scopes, account: account! })
    return r.accessToken
  } catch {
    const r = await m.acquireTokenPopup({ scopes })
    return r.accessToken
  }
}

// App Role による認可。トークンの roles クレームに 'SuperUser' があるかで設定画面を出す。
export async function currentRoles(): Promise<string[]> {
  if (import.meta.env.VITE_DATA_ADAPTER === 'mock') return ['SuperUser'] // mock は全権
  if (inTeams) return [] // Teams SSO トークンはバックエンド検証前提。ここでは簡略化。
  const claims = account?.idTokenClaims as { roles?: string[] } | undefined
  return claims?.roles ?? []
}

export function currentUserName(): string {
  return account?.name ?? account?.username ?? 'demo-reviewer'
}
