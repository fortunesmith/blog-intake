import { useRef, useState, useEffect } from 'react'
import { Video, X } from 'lucide-react'

const VIDCAST_HOST = 'app.vidcast.io'

// Accepts either a share URL (.../share/{uuid}) or an already-normalized
// embed URL (.../share/embed/{uuid}) and always returns the embed form,
// matching the syntax confirmed in M0. Returns null for anything that
// isn't a same-host, same-shape Vidcast share link — including any other
// domain, so this also doubles as the URL-side half of keeping arbitrary
// iframes out (Preview.jsx's rehypeVidcastGuard is the other half, for
// content pasted directly into the Markdown view rather than inserted here).
function normalizeVidcastUrl(input) {
  let url
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname !== VIDCAST_HOST) return null
  const match = url.pathname.match(/^\/share\/(?:embed\/)?([^/]+)\/?$/)
  if (!match) return null
  return `https://${VIDCAST_HOST}/share/embed/${match[1]}`
}

export default function VidcastModal({ onInsert, onClose }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState(false)
  const urlInputRef = useRef(null)

  useEffect(() => {
    urlInputRef.current?.focus()
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleInsert = () => {
    const src = normalizeVidcastUrl(url)
    if (!src) {
      setError(true)
      return
    }
    onInsert({ src, title: title.trim() || 'Vidcast video' })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Video className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            Insert Vidcast video
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vidcast URL</label>
          <input
            ref={urlInputRef}
            type="url"
            placeholder="https://app.vidcast.io/share/..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleInsert() }}
            className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 ${
              error ? 'border-red-400 focus:border-red-400' : 'border-gray-200 dark:border-gray-600 focus:border-blue-400'
            }`}
          />
          {error ? (
            <p className="text-xs text-red-500">Enter a valid app.vidcast.io share link.</p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Paste a share or share/embed link from app.vidcast.io.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title (optional)</label>
          <input
            type="text"
            placeholder="Vidcast video"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleInsert() }}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Sets the embedded video's accessible title. Defaults to "Vidcast video".
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!url.trim()}
            className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Insert video
          </button>
        </div>
      </div>
    </div>
  )
}
