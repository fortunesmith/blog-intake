import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Preview({ markdown }) {
  const [view, setView] = useState('rendered')

  return (
    <div className="flex-1 border-l border-gray-200">
      {/* Pane header with Rendered / Markdown toggle */}
      <div className="sticky top-[53px] z-10 bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preview</span>
        <div className="flex items-center rounded-md border border-gray-200 overflow-hidden text-xs bg-white">
          <button
            onClick={() => setView('rendered')}
            className={`px-2.5 py-1 transition-colors ${
              view === 'rendered' ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            Rendered
          </button>
          <button
            onClick={() => setView('markdown')}
            className={`px-2.5 py-1 border-l border-gray-200 transition-colors ${
              view === 'markdown' ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            Markdown
          </button>
        </div>
      </div>

      {/* Rendered view */}
      {view === 'rendered' && (
        <div className="preview-content px-8 py-7">
          {markdown.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          ) : (
            <p className="text-gray-300 text-sm italic">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Raw Markdown code view */}
      {view === 'markdown' && (
        <div className="px-6 py-6">
          {markdown.trim() ? (
            <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
              {markdown}
            </pre>
          ) : (
            <p className="text-gray-300 text-sm italic font-mono">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
