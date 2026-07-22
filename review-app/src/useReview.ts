import { useCallback, useEffect, useState } from 'react'
import { getRepository } from './data/repository'
import type { Decision, DocumentRec, QeBandConfig, Segment } from './data/types'
import { currentUserName } from './auth/authProvider'

// レビュー画面の状態とアクションを 1 か所に集約するフック。
export function useReview() {
  const repo = getRepository()
  const [doc, setDoc] = useState<DocumentRec | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [config, setConfig] = useState<QeBandConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const queue = await repo.listQueue()
    const first = queue[0]
    if (first) {
      const [segs, cfg] = await Promise.all([
        repo.getSegments(first.docId),
        repo.getConfig('default'),
      ])
      setDoc(await repo.getDocument(first.docId))
      setSegments(segs)
      setConfig(cfg)
    }
    setLoading(false)
  }, [repo])

  useEffect(() => {
    void reload()
  }, [reload])

  const decide = useCallback(
    async (seg: Segment, action: Decision['action'], patch?: Partial<Decision>) => {
      const status =
        action === 'accept' || action === 'auto-pass'
          ? 'approved'
          : action === 'edit'
            ? 'edited'
            : 'rejected'
      const decision: Decision = {
        segmentId: seg.segmentId,
        docId: seg.docId,
        actor: currentUserName(),
        action,
        before: seg.targetDraft,
        after: patch?.after,
        ts: new Date().toISOString(),
        ...patch,
      }
      await repo.postDecision(decision)
      await repo.updateSegmentStatus(seg.segmentId, status, patch?.after)
      await reload()
    },
    [repo, reload],
  )

  const undo = useCallback(
    async (seg: Segment) => {
      await repo.updateSegmentStatus(seg.segmentId, 'pending')
      await reload()
    },
    [repo, reload],
  )

  const signOff = useCallback(async () => {
    if (!doc) return
    await repo.signOff(doc.docId, currentUserName())
    await reload()
  }, [repo, doc, reload])

  const saveConfig = useCallback(
    async (cfg: QeBandConfig) => {
      await repo.saveConfig(cfg, currentUserName())
      setConfig(cfg)
    },
    [repo],
  )

  return { doc, segments, config, loading, decide, undo, signOff, saveConfig }
}
