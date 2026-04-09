import { useState, useRef, useEffect } from 'react'
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote,
  Code, Code2,
  Link, Image, Table, Minus,
  Rows2, Columns2, Trash2,
  ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine,
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
          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
}

const TABLE_MAX_COLS = 5
const TABLE_MAX_ROWS = 10

const ALLOWED_LINK_SCHEMES = /^(https?:\/\/|mailto:|\/|#)/i

export default function Toolbar({ editor, onImageInsert }) {
  const [showImageModal, setShowImageModal] = useState(false)
  const [showLinkPopover, setShowLinkPopover] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState(false)
  const linkInputRef = useRef(null)
  const linkPopoverRef = useRef(null)

  const [showTablePopover, setShowTablePopover] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const tableRowsRef = useRef(null)
  const tablePopoverRef = useRef(null)

  useEffect(() => {
    if (showLinkPopover) {
      setLinkUrl(editor?.getAttributes('link').href ?? '')
      setLinkError(false)
      setTimeout(() => linkInputRef.current?.focus(), 50)
    }
  }, [showLinkPopover, editor])

  useEffect(() => {
    if (showTablePopover) {
      setTimeout(() => tableRowsRef.current?.focus(), 50)
    }
  }, [showTablePopover])

  useEffect(() => {
    if (!showLinkPopover && !showTablePopover) return
    const handleOutside = (e) => {
      if (showLinkPopover && linkPopoverRef.current && !linkPopoverRef.current.contains(e.target)) {
        setShowLinkPopover(false)
      }
      if (showTablePopover && tablePopoverRef.current && !tablePopoverRef.current.contains(e.target)) {
        setShowTablePopover(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showLinkPopover, showTablePopover])

  if (!editor) return null

  const applyLink = () => {
    const href = linkUrl.trim()
    if (href && !ALLOWED_LINK_SCHEMES.test(href)) {
      setLinkError(true)
      return
    }
    if (href) {
      editor.chain().focus().setLink({ href }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setShowLinkPopover(false)
    setLinkUrl('')
    setLinkError(false)
  }

  const handleImageInsert = ({ objectUrl, filename, alt }) => {
    editor.chain().focus().setImage({ src: objectUrl, alt, title: filename }).run()
    onImageInsert(objectUrl, filename)
  }

  const applyTable = () => {
    editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run()
    setShowTablePopover(false)
    setTableRows(3)
    setTableCols(3)
  }

  const clampTableNum = (value, max) => Math.min(Math.max(1, Number(value) || 1), max)

  return (
    <>
      <div className="editor-toolbar bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-0.5 flex-wrap select-none">

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
            className="ml-1 text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 w-24 focus:outline-none focus:border-gray-400 dark:focus:border-gray-400 font-mono bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
        )}

        <Divider />

        {/* Insert */}
        <div className="relative" ref={linkPopoverRef}>
          <ToolbarBtn
            onClick={() => setShowLinkPopover((v) => !v)}
            active={editor.isActive('link') || showLinkPopover}
            title="Link"
          >
            <Link className="w-3.5 h-3.5" />
          </ToolbarBtn>

          {showLinkPopover && (
            <div className="absolute left-0 top-10 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 space-y-1.5 min-w-72">
              <div className="flex items-center gap-2">
                <input
                  ref={linkInputRef}
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); setLinkError(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setShowLinkPopover(false) }}
                  className={`flex-1 text-sm border rounded px-2.5 py-1.5 focus:outline-none transition-colors bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 ${linkError ? 'border-red-400 focus:border-red-400' : 'border-gray-200 dark:border-gray-600 focus:border-blue-400'}`}
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); applyLink() }}
                  className="text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
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
              {linkError && (
                <p className="text-xs text-red-500">Only http, https, mailto, and relative URLs are allowed.</p>
              )}
            </div>
          )}
        </div>

        <ToolbarBtn onClick={() => setShowImageModal(true)} title="Insert image">
          <Image className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="relative" ref={tablePopoverRef}>
          <ToolbarBtn
            onClick={() => setShowTablePopover((v) => !v)}
            active={showTablePopover}
            title="Insert table"
          >
            <Table className="w-3.5 h-3.5" />
          </ToolbarBtn>

          {showTablePopover && (
            <div className="absolute left-0 top-10 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Rows</label>
                <input
                  ref={tableRowsRef}
                  type="number"
                  min={1}
                  max={TABLE_MAX_ROWS}
                  value={tableRows}
                  onChange={(e) => setTableRows(clampTableNum(e.target.value, TABLE_MAX_ROWS))}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyTable(); if (e.key === 'Escape') setShowTablePopover(false) }}
                  className="w-14 text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Cols</label>
                <input
                  type="number"
                  min={1}
                  max={TABLE_MAX_COLS}
                  value={tableCols}
                  onChange={(e) => setTableCols(clampTableNum(e.target.value, TABLE_MAX_COLS))}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyTable(); if (e.key === 'Escape') setShowTablePopover(false) }}
                  className="w-14 text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
              <button
                onMouseDown={(e) => { e.preventDefault(); applyTable() }}
                className="text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors whitespace-nowrap"
              >
                Insert
              </button>
            </div>
          )}
        </div>

        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      {editor.isActive('table') && (
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-t border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-gray-800 flex-wrap select-none">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-1 flex items-center gap-1">
            <Rows2 className="w-3.5 h-3.5" /> Rows
          </span>
          <ToolbarBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add row above">
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row below">
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </ToolbarBtn>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-1 flex items-center gap-1">
            <Columns2 className="w-3.5 h-3.5" /> Cols
          </span>
          <ToolbarBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add column before">
            <ArrowLeftToLine className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column after">
            <ArrowRightToLine className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </ToolbarBtn>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run() }}
            title="Delete table"
            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Delete table
          </button>
        </div>
      )}

      {showImageModal && (
        <ImageInsertModal
          onInsert={handleImageInsert}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </>
  )
}
