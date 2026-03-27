import { useState, useRef, useEffect } from 'react'
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote,
  Code, Code2,
  Link, Image, Table, Minus,
} from 'lucide-react'
import ImageInsertModal from './ImageInsertModal'

function ToolbarBtn({ onClick, active, disabled, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`
        inline-flex items-center justify-center w-8 h-8 rounded text-sm transition-colors
        ${active
          ? 'bg-gray-900 text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />
}

export default function Toolbar({ editor, onImageInsert }) {
  const [showImageModal, setShowImageModal] = useState(false)
  const [showLinkPopover, setShowLinkPopover] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const linkInputRef = useRef(null)

  useEffect(() => {
    if (showLinkPopover) {
      setLinkUrl(editor?.getAttributes('link').href ?? '')
      setTimeout(() => linkInputRef.current?.focus(), 50)
    }
  }, [showLinkPopover, editor])

  if (!editor) return null

  const applyLink = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setShowLinkPopover(false)
    setLinkUrl('')
  }

  const handleImageInsert = ({ objectUrl, filename, alt }) => {
    editor.chain().focus().setImage({ src: objectUrl, alt, title: filename }).run()
    onImageInsert(objectUrl, filename)
  }

  return (
    <div className="relative">
      <div className="sticky top-[53px] z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-0.5 flex-wrap">

        {/* Text format */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive('heading', { level: 4 })} title="Heading 4">
          <Heading4 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Lists & blocks */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Code */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
          <Code className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
          <Code2 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        {/* Code block language selector */}
        {editor.isActive('codeBlock') && (
          <input
            type="text"
            placeholder="language"
            value={editor.getAttributes('codeBlock').language ?? ''}
            onChange={(e) =>
              editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value || null }).run()
            }
            className="ml-1 text-xs border border-gray-200 rounded px-2 py-0.5 w-24 focus:outline-none focus:border-gray-400 font-mono"
          />
        )}

        <Divider />

        {/* Insert */}
        <div className="relative">
          <ToolbarBtn
            onClick={() => setShowLinkPopover((v) => !v)}
            active={editor.isActive('link') || showLinkPopover}
            title="Link"
          >
            <Link className="w-3.5 h-3.5" />
          </ToolbarBtn>

          {showLinkPopover && (
            <div className="absolute left-0 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex items-center gap-2 min-w-72">
              <input
                ref={linkInputRef}
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setShowLinkPopover(false) }}
                className="flex-1 text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); applyLink() }}
                className="text-sm font-medium text-white bg-gray-900 px-3 py-1.5 rounded hover:bg-gray-700 transition-colors"
              >
                {editor.isActive('link') ? 'Update' : 'Set'}
              </button>
              {editor.isActive('link') && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setShowLinkPopover(false) }}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        <ToolbarBtn onClick={() => setShowImageModal(true)} title="Insert image">
          <Image className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <ToolbarBtn
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert table"
        >
          <Table className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      {showImageModal && (
        <ImageInsertModal
          onInsert={handleImageInsert}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  )
}
