import { useRef, useState } from 'react'
import { PenLine, Download, Copy, Check } from 'lucide-react'
import Editor from './components/Editor'
import MetadataFields from './components/MetadataFields'

export default function App() {
  const editorRef = useRef(null)
  const imageMapRef = useRef(new Map()) // objectUrl → filename
  const [metadata, setMetadata] = useState({ title: '', author: '', date: '' })
  const [copied, setCopied] = useState(false)

  const buildMarkdown = () => {
    let md = editorRef.current?.getMarkdown() ?? ''

    // Replace blob object URLs with original filenames in image tags
    imageMapRef.current.forEach((filename, objectUrl) => {
      md = md.split(objectUrl).join(filename)
    })

    // Prepend frontmatter if any metadata is filled in
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
    const md = buildMarkdown()
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
    const md = buildMarkdown()
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleImageInsert = (objectUrl, filename) => {
    imageMapRef.current.set(objectUrl, filename)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-[53px] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Blog Post Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</>
              : <><Copy className="w-3.5 h-3.5" /> Copy Markdown</>
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

      {/* Content */}
      <main className="max-w-4xl mx-auto">
        <MetadataFields metadata={metadata} onChange={setMetadata} />
        <Editor ref={editorRef} onImageInsert={handleImageInsert} />
      </main>
    </div>
  )
}
