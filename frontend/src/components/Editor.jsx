import { forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { Markdown } from 'tiptap-markdown'
import Toolbar from './Toolbar'

const Editor = forwardRef(function Editor({ onImageInsert }, ref) {
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
    editorProps: {
      attributes: {
        'data-placeholder': 'Start writing your blog post…',
      },
    },
  })

  useImperativeHandle(ref, () => ({
    getMarkdown: () => editor?.storage.markdown.getMarkdown() ?? '',
    getEditor: () => editor,
  }))

  return (
    <div>
      <Toolbar editor={editor} onImageInsert={onImageInsert} />
      <EditorContent editor={editor} />
    </div>
  )
})

export default Editor
