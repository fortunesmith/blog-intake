import { useRef, useState, useEffect } from 'react'
import { ImageIcon, X } from 'lucide-react'

export default function ImageInsertModal({ onInsert, onClose }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [alt, setAlt] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFile = (f) => {
    if (f && f.type.startsWith('image/')) setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleInsert = () => {
    if (!file) return
    // Create a fresh object URL for the inserted image rather than handing
    // off previewUrl. previewUrl's cleanup (below) runs on every `file`
    // change, not just on unmount, so clearing `file` would immediately
    // revoke it out from under the caller. This new URL is independent of
    // the preview's lifecycle; the caller (imageMapRef in App.jsx) owns it
    // and revokes it itself later (on "New document" or unmount).
    const objectUrl = URL.createObjectURL(file)
    onInsert({ objectUrl, filename: file.name, alt })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Insert image</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragging
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
          `}
        >
          {file ? (
            <div className="space-y-1">
              <img
                src={previewUrl}
                alt="preview"
                className="max-h-32 mx-auto rounded object-contain"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{file.name}</p>
              <p className="text-xs text-blue-500">Click to change</p>
            </div>
          ) : (
            <div className="space-y-2">
              <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Click to browse or drag an image here</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF, WebP</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        {/* Alt text */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Alt text</label>
          <input
            type="text"
            placeholder="Describe the image for accessibility"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && file) handleInsert() }}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The exported Markdown will reference <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded">{file?.name ?? 'filename.jpg'}</code>.
            Keep the image file alongside the .md when sharing.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!file}
            className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Insert image
          </button>
        </div>
      </div>
    </div>
  )
}
