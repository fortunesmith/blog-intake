import { useRef, useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'

/**
 * Name-and-confirm prompt for saving a named draft (M5). Shared by two
 * callers in App.jsx: the header's explicit "Save Draft" button, and the
 * one-time V1-draft migration nudge on first load — both just need "pick a
 * name, confirm" with a pre-filled default, differing only in the
 * `description` copy shown above the input.
 */
export default function SaveDraftModal({ defaultName, description, saveLabel = 'Save draft', onSave, onClose }) {
  const [name, setName] = useState(defaultName || '')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
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
            <Save className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            Save draft
          </h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Draft name</label>
          <input
            ref={inputRef}
            type="text"
            placeholder="Untitled draft"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
