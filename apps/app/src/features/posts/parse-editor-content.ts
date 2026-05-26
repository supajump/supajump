type TipTapNode = {
  type?: string
  text?: string
  content?: TipTapNode[]
}

function extractPlainText(node: TipTapNode): string {
  if (typeof node.text === "string") return node.text
  if (!Array.isArray(node.content)) return ""
  const parts = node.content.map(extractPlainText).filter(Boolean)
  if (parts.length === 0) return ""
  if (node.type === "doc" || node.type === "paragraph") return parts.join(" ")
  return parts.join(" ")
}

/** Plain text for list previews; handles TipTap JSON or legacy plain strings. */
export function getPlainTextFromPostContent(content: string | null): string {
  if (!content) return ""
  try {
    const doc = JSON.parse(content) as TipTapNode
    if (doc?.type === "doc" || Array.isArray(doc?.content)) {
      return extractPlainText(doc).replace(/\s+/g, " ").trim()
    }
  } catch {
    // legacy plain-text body
  }
  return content
}

export function parseEditorContent(content: string | null) {
  if (!content) return undefined
  try {
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: content }],
        },
      ],
    }
  }
}
