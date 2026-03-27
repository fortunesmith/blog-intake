import { forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { Markdown } from 'tiptap-markdown'
import Toolbar from './Toolbar'

const Editor = forwardRef(function Editor({ onImageInsert, onMarkdownChange }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({ html: false, tightLists: true }),
    ],
    content: '',
    onCreate({ editor }) {
      onMarkdownChange?.(editor.storage.markdown?.getMarkdown() ?? '')
    },
    onUpdate({ editor }) {
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
  }))

  const wordCount = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0

  return (
    <div className="flex-1 flex flex-col">
      <Toolbar editor={editor} onImageInsert={onImageInsert} />
      <EditorContent editor={editor} className="flex-1" />
      <div className="border-t border-gray-100 px-8 py-2 flex justify-end">
        <span className="text-xs text-gray-400">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>
    </div>
  )
})

export default Editor
