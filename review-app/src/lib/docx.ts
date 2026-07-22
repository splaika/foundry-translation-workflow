import mammoth from 'mammoth'
import type { OffsetSpan } from '../data/types'

// 実 .docx を Word 体裁のまま描画し、offset ペアでセグメントをハイライトするための関数群。
// BilingualDocView（サンプルは段落描画）を「実文書描画」に差し替えるときに使う。
//
// 方式①（第一版・推奨）: mammoth.js で docx → HTML に変換して自前 DOM に流し込む。
//   体裁は8割再現（見出し・段落・表）。span を自在に重ねられる。
// 方式②: Office Online / SharePoint 埋込 iframe（体裁は完全だがハイライト重ね不可）。
//   → 「原本を Word で開く」リンクとして併設する（最終体裁チェック用）。

export interface RenderedDoc {
  html: string
  plainText: string // offset 計算の基準（span.start/end はこの文字列上の位置）
}

// docx（ArrayBuffer）を HTML + プレーンテキストに変換。
export async function renderDocx(buf: ArrayBuffer): Promise<RenderedDoc> {
  const [{ value: html }, { value: plainText }] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer: buf }),
    mammoth.extractRawText({ arrayBuffer: buf }),
  ])
  return { html, plainText }
}

// offset ペアでセグメント範囲に <span data-seg="id"> を挿入する（プレーンテキスト上での簡易実装）。
// 実運用では HTML ノードを走査して範囲に span を割る（表・改行を跨ぐケアが要る）。
// 1:N alignment（1 EN 文 → 複数 JA 文）は同一 groupId を全 span に付け、連動ハイライトを groupId 単位にする。
export function injectSpans(
  plainText: string,
  spans: { id: string; groupId?: string; span: OffsetSpan }[],
): string {
  const sorted = [...spans].sort((a, b) => a.span.start - b.span.start)
  let out = ''
  let cursor = 0
  for (const s of sorted) {
    if (s.span.start < cursor) continue // 重複はスキップ（要 alignment 精査）
    out += escapeHtml(plainText.slice(cursor, s.span.start))
    const g = s.groupId ? ` data-group="${s.groupId}"` : ''
    out += `<span class="seg" data-seg="${s.id}"${g}>${escapeHtml(plainText.slice(s.span.start, s.span.end))}</span>`
    cursor = s.span.end
  }
  out += escapeHtml(plainText.slice(cursor))
  return out
}

function escapeHtml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ⚠ 実装メモ（docs/BUILD_GUIDE.md M4 と対応）:
//  - offset は「Foundry タグ付け段が出す原文/訳文の対訳ペア」を前提にする。無ければ本方式は成立しない。
//  - mammoth の HTML と extractRawText のテキストは 1:1 で対応しないことがある（表・脚注）。
//    実装では convertToHtml の変換結果 DOM に対して Range で span を割るのが堅い。
//  - EN/JA の文境界ズレ（1:N）は groupId で束ね、hover/click で同 group を一括ハイライトする。
