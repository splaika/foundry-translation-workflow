import type { IReviewRepository } from './IReviewRepository'
import { MockAdapter } from './MockAdapter'
import { SharePointAdapter } from './SharePointAdapter'
import { DataverseAdapter } from './DataverseAdapter'

// VITE_DATA_ADAPTER で実装を選ぶ唯一の場所。UI はここから受け取るだけ。
let instance: IReviewRepository | null = null

export function getRepository(): IReviewRepository {
  if (instance) return instance
  const kind = import.meta.env.VITE_DATA_ADAPTER ?? 'mock'
  switch (kind) {
    case 'sharepoint':
      instance = new SharePointAdapter()
      break
    case 'dataverse':
      instance = new DataverseAdapter()
      break
    case 'mock':
    default:
      instance = new MockAdapter()
      break
  }
  return instance
}
