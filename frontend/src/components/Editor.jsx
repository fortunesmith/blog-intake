import { forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { Markdown } from 'tiptap-markdown'
import Toolbar from './Toolbar'

const STORAGE_KEY = 'blog-intake-draft'

export function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDraft(patch) {
  try {
    const existing = loadDraft() ?? {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...patch }))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

const Editor = forwardRef(function Editor({ onImageInsert, onMarkdownChange }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({ html: false, tightLists: true, linkify: false }),
    ],
    content: '',
    onCreate({ editor }) {
      const draft = loadDraft()
      if (draft?.content) {
        editor.commands.setContent(draft.content, false)
      }
      onMarkdownChange?.(editor.storage.markdown?.getMarkdown() ?? '')
    },
    onUpdate({ editor }) {
      saveDraft({ content: editor.getJSON() })
      onMarkdownChange?.(editor.storage.markdown?.getMarkdown() ?? '')
    },
    editorProps: {
      attributes: {
        'data-placeholder': 'Start writing your blog post…',
      },
    },
  })

  useImperativeHandle(ref, () => ({
    getMarkdown: () => editor?.storage.markdown?.getMarkdown() ?? '',
    getEditor: () => editor,
    reset: () => {
      editor?.commands.clearContent(true)
    },
  }))

  const wordCount = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0

  return (
    <div className="flex-1 flex flex-col">
      <Toolbar editor={editor} onImageInsert={onImageInsert} />
      <EditorContent editor={editor} className="flex-1" />
      <div className="border-t border-gray-100 dark:border-gray-800 px-8 py-2 flex justify-end">
        <span className="text-xs text-gray-400 dark:text-gray-600">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>
    </div>
  )
})

export default Editor
