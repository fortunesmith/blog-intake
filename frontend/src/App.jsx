import { useRef, useState } from 'react'
import { PenLine, Download, Copy, Check } from 'lucide-react'
import Editor from './components/Editor'
import MetadataFields from './components/MetadataFields'
import Preview from './components/Preview'

// On narrow viewports, split mode is not usable — collapse to edit
const VIEW_MODES = ['edit', 'split', 'preview']

export default function App() {
  const editorRef = useRef(null)
  const imageMapRef = useRef(new Map()) // objectUrl → filename
  const [metadata, setMetadata] = useState({ title: '', author: '', date: '' })
  const [markdownContent, setMarkdownContent] = useState('')
  const [viewMode, setViewMode] = useState('split')
  const [copied, setCopied] = useState(false)

  const buildExportMarkdown = () => {
    // Substitute blob object URLs with original filenames
    let md = markdownContent
    imageMapRef.current.forEach((filename, objectUrl) => {
      md = md.split(objectUrl).join(filename)
    })

    // Prepend YAML frontmatter if any metadata is present
    const { title, author, date } = metadata
    if (title || author || date) {
      const lines = ['---']
      if (title)  lines.push(`title: "${title}"`)
      if (author) lines.push(`author: "${author}"`)
      if (date)   lines.push(`date: "${date}"`)
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

  const showEditor  = viewMode === 'edit'  || viewMode === 'split'
  const showPreview = viewMode === 'preview' || viewMode === 'split'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-[53px] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Blog Post Editor</span>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle — hidden on mobile (split not usable on small screens) */}
          <div className="hidden sm:flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm">
            {VIEW_MODES.map((mode, i) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-3 py-1.5 capitalize transition-colors
                  ${viewMode === mode ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50'}
                  ${i > 0 ? 'border-l border-gray-200' : ''}
                `}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied</>
              : <><Copy className="w-3.5 h-3.5" />Copy Markdown</>
            }
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export .md
          </button>
        </div>
      </header>

      {/* ── Metadata ─────────────────────────────────────────────────── */}
      <MetadataFields metadata={metadata} onChange={setMetadata} />

      {/* ── Editor + Preview panes ───────────────────────────────────── */}
      {/* On mobile, always show editor only (stack would be too cramped) */}
      <div className="flex flex-col sm:flex-row flex-1">
        {showEditor && (
          <div className={`flex flex-col ${showPreview ? 'sm:w-1/2 w-full' : 'w-full'}`}>
            <Editor
              ref={editorRef}
              onImageInsert={handleImageInsert}
              onMarkdownChange={setMarkdownContent}
            />
          </div>
        )}
        {showPreview && (
          <div className={`${showEditor ? 'sm:w-1/2 w-full sm:border-t-0 border-t border-gray-200' : 'w-full'}`}>
            <Preview markdown={markdownContent} />
          </div>
        )}
      </div>
    </div>
  )
}
