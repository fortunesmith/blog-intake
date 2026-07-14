import { useEffect, useState } from 'react'
import { FileText, Trash2, X } from 'lucide-react'

function formatSavedAt(timestamp) {
  try {
    return new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ''
  }
}

/**
 * Panel listing named drafts (M5), most recently saved first. `drafts` is
 * the raw index array ({id, title, savedAt}[]) from Editor.jsx's
 * listDrafts() — App.jsx owns re-fetching it after any Load/Delete/Save so
 * this component stays a plain, stateless-except-for-its-own-UI list.
 *
 * Delete requires a second click (button becomes "Confirm delete" for the
 * same draft) rather than a full separate confirmation modal — enough
 * friction to avoid one careless click destroying a saved draft, without
 * stacking another modal on top of this one.
 */
export default function DraftManager({ drafts, onLoad, onDelete, onClose }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const sorted = [...drafts].sort((a, b) => b.savedAt - a.savedAt)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Saved drafts</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            No saved drafts yet. Use "Save Draft" in the header to save your current post here.
          </p>
        ) : (
          <ul className="space-y-1.5 overflow-y-auto -mx-1 px-1">
            {sorted.map((draft) => (
              <li
                key={draft.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{draft.title || 'Untitled draft'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatSavedAt(draft.savedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onLoad(draft.id)}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
                  >
                    Load
                  </button>
                  {confirmDeleteId === draft.id ? (
                    <button
                      onClick={() => { onDelete(draft.id); setConfirmDeleteId(null) }}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors whitespace-nowrap"
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(draft.id)}
                      title="Delete draft"
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
