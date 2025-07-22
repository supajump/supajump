"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Mention from "@tiptap/extension-mention"
import Placeholder from "@tiptap/extension-placeholder"
import { BubbleMenu } from "@tiptap/react"
import { EditorToolbar } from "./editor-toolbar"
import { MentionList } from "./mention-list"
import { extensions } from "../lib/extensions"
import { cn } from "@/lib/utils"

interface RichEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
  showToolbar?: boolean
  showBubbleMenu?: boolean
  onMention?: (mention: { id: string; label: string }) => void
}

export function RichEditor({
  content = "",
  onChange,
  placeholder = "Start writing...",
  className,
  editable = true,
  showToolbar = true,
  showBubbleMenu = true,
  onMention,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      ...extensions,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: {
          items: async ({ query }) => {
            // This would be replaced with actual user search
            return [
              { id: "1", label: "John Doe" },
              { id: "2", label: "Jane Smith" },
            ].filter(item => 
              item.label.toLowerCase().includes(query.toLowerCase())
            )
          },
          render: () => {
            let component: any
            let popup: any

            return {
              onStart: props => {
                component = new MentionList(props)
                popup = component.element
                document.body.appendChild(popup)
              },
              onUpdate(props) {
                component.updateProps(props)
              },
              onKeyDown(props) {
                return component.onKeyDown(props)
              },
              onExit() {
                popup.remove()
                component.destroy()
              },
            }
          },
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className={cn("rich-editor", className)}>
      {showToolbar && <EditorToolbar editor={editor} />}
      
      {showBubbleMenu && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bubble-menu"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "is-active" : ""}
          >
            Bold
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "is-active" : ""}
          >
            Italic
          </button>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} className="editor-content" />
    </div>
  )
}