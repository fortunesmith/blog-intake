import { useState, useRef, useEffect } from 'react'
import { useEditorState } from '@tiptap/react'
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

// Values match standard highlighter language identifiers (highlight.js/
// Prism naming convention) rather than free text, so a code block's
// language attribute is always one of a known, unambiguous set — not
// whatever an author happens to type. "Shell / Bash" covers CLI examples
// (e.g. `npm install`, `node app.js`); Node.js itself has no distinct
// grammar from JavaScript in any mainstream highlighter.
const CODE_BLOCK_LANGUAGES = [
  { value: '',           label: 'Plain text' },
  { value: 'json',       label: 'JSON' },
  { value: 'xml',        label: 'XML' },
  { value: 'html',       label: 'HTML' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'bash',       label: 'Shell / Bash' },
  { value: 'python',     label: 'Python' },
]

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

  const [showOrderedPopover, setShowOrderedPopover] = useState(false)
  const [orderedStartInput, setOrderedStartInput] = useState('1')
  const orderedStartInputRef = useRef(null)
  const orderedPopoverRef = useRef(null)

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
    if (!showLinkPopover && !showTablePopover && !showOrderedPopover) return
    const handleOutside = (e) => {
      if (showLinkPopover && linkPopoverRef.current && !linkPopoverRef.current.contains(e.target)) {
        setShowLinkPopover(false)
      }
      if (showTablePopover && tablePopoverRef.current && !tablePopoverRef.current.contains(e.target)) {
        setShowTablePopover(false)
      }
      if (showOrderedPopover && orderedPopoverRef.current && !orderedPopoverRef.current.contains(e.target)) {
        setShowOrderedPopover(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showLinkPopover, showTablePopover, showOrderedPopover])

  useEffect(() => {
    if (!showOrderedPopover || !editor) return
    const start = editor.isActive('orderedList')
      ? (editor.getAttributes('orderedList').start ?? 1)
      : 1
    setOrderedStartInput(String(start))
    setTimeout(() => orderedStartInputRef.current?.focus(), 50)
  }, [showOrderedPopover, editor])

  const fmt = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold:        e.isActive('bold'),
      italic:      e.isActive('italic'),
      strike:      e.isActive('strike'),
      h1:          e.isActive('heading', { level: 1 }),
      h2:          e.isActive('heading', { level: 2 }),
      h3:          e.isActive('heading', { level: 3 }),
      h4:          e.isActive('heading', { level: 4 }),
      bulletList:  e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote:  e.isActive('blockquote'),
      code:        e.isActive('code'),
      codeBlock:   e.isActive('codeBlock'),
      link:        e.isActive('link'),
      table:       e.isActive('table'),
    }),
  })

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

  const parseOrderedStart = () => {
    const n = parseInt(orderedStartInput, 10)
    if (Number.isNaN(n) || n < 1) return 1
    return n
  }

  const applyOrderedPopover = () => {
    const start = parseOrderedStart()

    if (editor.isActive('orderedList')) {
      const { $from } = editor.state.selection
      let listDepth = -1
      for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type.name === 'orderedList') { listDepth = d; break }
      }

      const atFirstItem = listDepth >= 0 && $from.index(listDepth) === 0

      if (atFirstItem) {
        editor.chain().focus().updateAttributes('orderedList', { start }).run()
      } else {
        // Split the orderedList at the cursor's item so items before the cursor
        // keep the original start and the cursor item onward becomes a new
        // independent list with the new start number.
        editor.chain().focus().command(({ tr, state: s }) => {
          const { $from: $f } = s.selection
          let depth = -1
          for (let d = $f.depth; d >= 0; d--) {
            if ($f.node(d).type.name === 'orderedList') { depth = d; break }
          }
          if (depth < 0) return false
          const splitPos = $f.before(depth + 1)
          const olType = s.schema.nodes.orderedList
          tr.split(splitPos, 1, [{ type: olType, attrs: { start } }])
          return true
        }).run()
      }
    } else {
      // Use wrapInList instead of toggleOrderedList — wrapInList does NOT call
      // joinListBackwards/joinListForwards, so the new list stays independent
      // from any adjacent ordered list above it.
      editor.chain().focus().wrapInList('orderedList', { start }).run()
    }

    setShowOrderedPopover(false)
  }

  const removeOrderedNumbering = () => {
    editor.chain().focus().toggleOrderedList().run()
    setShowOrderedPopover(false)
  }

  const handleCodeBlock = () => {
    if (fmt.codeBlock) {
      editor.chain().focus().toggleCodeBlock().run()
      return
    }
    const { state } = editor
    const { from, to } = state.selection
    const text = state.doc.textBetween(from, to, '\n')
    editor.chain().focus()
      .insertContentAt({ from, to }, {
        type: 'codeBlock',
        content: text ? [{ type: 'text', text }] : [],
      })
      .run()
  }

  return (
    <>
      <div className="editor-toolbar bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-0.5 flex-wrap select-none">

        {/* Text format */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={fmt.bold} title="Bold (⌘B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={fmt.italic} title="Italic (⌘I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={fmt.strike} title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={fmt.h1} title="Heading 1">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={fmt.h2} title="Heading 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={fmt.h3} title="Heading 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={fmt.h4} title="Heading 4">
          <Heading4 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Lists & blocks */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={fmt.bulletList} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <div className="relative" ref={orderedPopoverRef}>
          <ToolbarBtn
            onClick={() => setShowOrderedPopover((v) => !v)}
            active={fmt.orderedList || showOrderedPopover}
            title="Numbered list"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarBtn>
          {showOrderedPopover && (
            <div className="absolute left-0 top-10 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 space-y-2 min-w-52">
              <div className="flex items-center gap-2">
                <label htmlFor="ordered-start-input" className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Start at
                </label>
                <input
                  id="ordered-start-input"
                  ref={orderedStartInputRef}
                  type="number"
                  min={1}
                  value={orderedStartInput}
                  onChange={(e) => setOrderedStartInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyOrderedPopover()
                    if (e.key === 'Escape') setShowOrderedPopover(false)
                  }}
                  className="w-20 text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); applyOrderedPopover() }}
                  className="text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
                >
                  Apply
                </button>
              </div>
              {fmt.orderedList && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); removeOrderedNumbering() }}
                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                >
                  Remove numbering
                </button>
              )}
            </div>
          )}
        </div>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={fmt.blockquote} title="Blockquote">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Code */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={fmt.code} title="Inline code">
          <Code className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={handleCodeBlock} active={fmt.codeBlock} title="Code block">
          <Code2 className="w-3.5 h-3.5" />
        </ToolbarBtn>

        {/* Code block language selector — a fixed list (rather than free
            text) so every code block's language is one of a small,
            unambiguous set of values a highlighter can actually recognize.
            A <select> only fires onChange once per pick, not per
            keystroke, so unlike a text input it's safe to include .focus()
            here — it just returns focus to the code block after choosing. */}
        {fmt.codeBlock && (
          <select
            value={editor.getAttributes('codeBlock').language ?? ''}
            onChange={(e) =>
              editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value || null }).run()
            }
            className="ml-1 text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 focus:outline-none focus:border-gray-400 dark:focus:border-gray-400 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            {CODE_BLOCK_LANGUAGES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}

        <Divider />

        {/* Insert */}
        <div className="relative" ref={linkPopoverRef}>
          <ToolbarBtn
            onClick={() => setShowLinkPopover((v) => !v)}
            active={fmt.link || showLinkPopover}
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

      {fmt.table && (
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
