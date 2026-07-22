import { getAccessToken } from '../auth/authProvider'

const GRAPH = 'https://graph.microsoft.com/v1.0'
// SharePoint リスト操作に必要な委任スコープ。Entra アプリ登録の API 権限で同意しておく。
export const GRAPH_SCOPES = ['Sites.ReadWrite.All', 'User.Read']

async function req(method: string, path: string, body?: unknown): Promise<any> {
  const token = await getAccessToken(GRAPH_SCOPES)
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    throw new Error(`Graph ${method} ${path} → ${res.status} ${await res.text()}`)
  }
  return res.status === 204 ? null : res.json()
}

export const graph = {
  get: (path: string) => req('GET', path),
  post: (path: string, body: unknown) => req('POST', path, body),
  patch: (path: string, body: unknown) => req('PATCH', path, body),
}

// リスト表示名 → listId を解決してキャッシュ。
const listIdCache = new Map<string, string>()
export async function resolveListId(siteId: string, displayName: string): Promise<string> {
  const key = `${siteId}/${displayName}`
  const hit = listIdCache.get(key)
  if (hit) return hit
  const data = await graph.get(
    `/sites/${siteId}/lists?$filter=displayName eq '${encodeURIComponent(displayName)}'`,
  )
  const id = data.value?.[0]?.id
  if (!id) throw new Error(`SharePoint リストが見つかりません: ${displayName}`)
  listIdCache.set(key, id)
  return id
}
