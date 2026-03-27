import { useRef, useState, useEffect } from 'react'
import { PenLine, Download, Copy, Check, FilePlus, Sun, Moon } from 'lucide-react'
import Editor, { loadDraft, saveDraft, clearDraft } from './components/Editor'
import MetadataFields from './components/MetadataFields'
import Preview from './components/Preview'
import ConfirmModal from './components/ConfirmModal'

const VIEW_MODES = ['edit', 'split', 'preview']

function initMetadata() {
  const draft = loadDraft()
  return draft?.metadata ?? { title: '', author: '', date: '' }
}

function initDark() {
  return localStorage.getItem('blog-intake-theme') === 'dark'
}

export default function App() {
  const editorRef = useRef(null)
  const imageMapRef = useRef(new Map())
  const [metadata, setMetadata] = useState(initMetadata)
  const [markdownContent, setMarkdownContent] = useState('')
  const [viewMode, setViewMode] = useState('split')
  const [copied, setCopied] = useState(false)
  const [showNewDocModal, setShowNewDocModal] = useState(false)
  const [isDark, setIsDark] = useState(initDark)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('blog-intake-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const handleMetadataChange = (updated) => {
    setMetadata(updated)
    saveDraft({ metadata: updated })
  }

  // Escape a value for use inside a YAML double-quoted scalar.
  // In double-quoted YAML, backslash and double-quote are the only characters
  // that must be escaped; everything else is literal.
  const yamlEscape = (str) => str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

  const buildExportMarkdown = () => {
    let md = markdownContent
    imageMapRef.current.forEach((filename, objectUrl) => {
      md = md.split(objectUrl).join(filename)
    })
    const { title, author, date } = metadata
    if (title || author || date) {
      const lines = ['---']
      if (title)  lines.push(`title: "${yamlEscape(title)}"`)
      if (author) lines.push(`author: "${yamlEscape(author)}"`)
      if (date)   lines.push(`date: "${yamlEscape(date)}"`)
      lines.push('---', '', '')
      md = lines.join('\n') + md
    }
    return md
  }

  const handleExport = () => {
    const md = buildExportMarkdown()
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = metadata.title
      ? metadata.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : 'blog-post'
    a.download = `${slug}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    const md = buildExportMarkdown()
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleImageInsert = (objectUrl, filename) => {
    imageMapRef.current.set(objectUrl, filename)
  }

  const handleNewDocument = () => {
    editorRef.current?.reset()
    const empty = { title: '', author: '', date: '' }
    setMetadata(empty)
    imageMapRef.current.forEach((_, objectUrl) => URL.revokeObjectURL(objectUrl))
    imageMapRef.current = new Map()
    clearDraft()
  }

  const showEditor  = viewMode === 'edit'  || viewMode === 'split'
  const showPreview = viewMode === 'preview' || viewMode === 'split'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-[53px] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <PenLine className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Blog Post Editor</span>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          <button
            onClick={() => setShowNewDocModal(true)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Start a new document"
          >
            <FilePlus className="w-4 h-4" />
            New
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle — hidden on mobile */}
          <div className="hidden sm:flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            {VIEW_MODES.map((mode, i) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-3 py-1.5 capitalize transition-colors
                  ${viewMode === mode
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
                  ${i > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''}
                `}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Light/dark toggle */}
          <button
            onClick={() => setIsDark((v) => !v)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
            }
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied</>
              : <><Copy className="w-3.5 h-3.5" />Copy Markdown</>
            }
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export .md
          </button>
        </div>
      </header>

      {/* ── Metadata ─────────────────────────────────────────────────── */}
      <MetadataFields metadata={metadata} onChange={handleMetadataChange} />

      {/* ── Editor + Preview panes ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row flex-1">
        <div className={`flex flex-col ${showPreview ? 'sm:w-1/2 w-full' : 'w-full'} ${!showEditor ? 'hidden' : ''}`}>
          <Editor
            ref={editorRef}
            onImageInsert={handleImageInsert}
            onMarkdownChange={setMarkdownContent}
          />
        </div>
        {showPreview && (
          <div className={`${showEditor ? 'sm:w-1/2 w-full sm:border-t-0 border-t border-gray-200 dark:border-gray-700' : 'w-full'}`}>
            <Preview markdown={markdownContent} />
          </div>
        )}
      </div>

      {/* ── New document confirmation ─────────────────────────────────── */}
      {showNewDocModal && (
        <ConfirmModal
          title="Start a new document?"
          message="Your current content will be permanently cleared. This cannot be undone."
          confirmLabel="Clear and start new"
          onConfirm={handleNewDocument}
          onClose={() => setShowNewDocModal(false)}
        />
      )}
    </div>
  )
}
