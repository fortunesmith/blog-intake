import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export default function Preview({ markdown }) {
  const [view, setView] = useState('rendered')

  return (
    <div className="border-l border-gray-200 dark:border-gray-700">
      {/* Pane header with Rendered / Markdown toggle */}
      <div className="editor-toolbar bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Preview</span>
        <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-xs bg-white dark:bg-gray-900">
          <button
            onClick={() => setView('rendered')}
            className={`px-2.5 py-1 transition-colors ${
              view === 'rendered'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Rendered
          </button>
          <button
            onClick={() => setView('markdown')}
            className={`px-2.5 py-1 border-l border-gray-200 dark:border-gray-700 transition-colors ${
              view === 'markdown'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{markdown}</ReactMarkdown>
          ) : (
            <p className="text-gray-300 dark:text-gray-600 text-sm italic">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Raw Markdown code view */}
      {view === 'markdown' && (
        <div className="px-6 py-6">
          {markdown.trim() ? (
            <pre className="text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed break-words">
              {markdown}
            </pre>
          ) : (
            <p className="text-gray-300 dark:text-gray-600 text-sm italic font-mono">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
