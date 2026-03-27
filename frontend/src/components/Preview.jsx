import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Preview({ markdown }) {
  return (
    <div className="flex-1 border-l border-gray-200 overflow-auto">
      <div className="sticky top-[53px] z-10 bg-gray-50 border-b border-gray-200 px-6 py-2.5 flex items-center">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preview</span>
      </div>

      <div className="preview-content px-8 py-7">
        {markdown.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        ) : (
          <p className="text-gray-300 text-sm italic">Nothing to preview yet.</p>
        )}
      </div>
    </div>
  )
}
