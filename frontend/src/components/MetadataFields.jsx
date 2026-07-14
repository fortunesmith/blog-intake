import { useRef, useState } from 'react'
import { ImageIcon, X, TriangleAlert } from 'lucide-react'

const BANNER_WIDTH = 1024
const BANNER_HEIGHT = 342

export default function MetadataFields({ metadata, onChange, onBannerImageInsert, onBannerImageRemove }) {
  const handle = (field) => (e) => onChange({ ...metadata, [field]: e.target.value })
  const bannerInputRef = useRef(null)
  const [bannerError, setBannerError] = useState(null)

  const handleBannerFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setBannerError(null)

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      if (img.width !== BANNER_WIDTH || img.height !== BANNER_HEIGHT) {
        setBannerError(
          `Banner image must be exactly ${BANNER_WIDTH}\u00d7${BANNER_HEIGHT}px ` +
          `(selected image is ${img.width}\u00d7${img.height}px)`
        )
        URL.revokeObjectURL(objectUrl)
        return
      }
      onBannerImageInsert(objectUrl, file.name)
    }
    img.onerror = () => {
      setBannerError('Could not read that image file.')
      URL.revokeObjectURL(objectUrl)
    }
    img.src = objectUrl
  }

  const handleBannerDrop = (e) => {
    e.preventDefault()
    handleBannerFile(e.dataTransfer.files[0])
  }

  const handleRemoveBanner = (e) => {
    e.stopPropagation()
    setBannerError(null)
    onBannerImageRemove()
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 px-8 py-5 space-y-4">
      <input
        type="text"
        placeholder="Post title"
        value={metadata.title}
        onChange={handle('title')}
        className="w-full text-2xl font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none bg-transparent"
      />
      {/*
        The Author column below is a fixed sm:w-56 (matching the Banner image
        column in the row underneath), and both rows share the same gap-5, so
        Date and Teaser start at the same horizontal position across rows.
      */}
      <div className="flex items-center gap-5">
        <div className="sm:w-56 shrink-0 flex items-center gap-2">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide shrink-0">Author</label>
          <input
            type="text"
            placeholder="Your name"
            value={metadata.author}
            onChange={handle('author')}
            className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none bg-transparent border-b border-transparent focus:border-gray-300 dark:focus:border-gray-600 pb-0.5 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={metadata.date}
            onChange={handle('date')}
            className="text-sm text-gray-700 dark:text-gray-300 focus:outline-none bg-transparent border-b border-transparent focus:border-gray-300 dark:focus:border-gray-600 pb-0.5 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 pt-3 mt-1 border-t border-gray-100 dark:border-gray-800">
        {/* Banner image */}
        <div className="sm:w-56 shrink-0 space-y-1">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Banner image <span className="text-gray-300 dark:text-gray-600">({BANNER_WIDTH}&times;{BANNER_HEIGHT})</span>
          </label>
          <div
            onClick={() => bannerInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleBannerDrop}
            className="relative border border-dashed border-gray-200 dark:border-gray-600 rounded-lg h-20 flex items-center justify-center cursor-pointer hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors overflow-hidden"
          >
            {metadata.bannerObjectUrl ? (
              <>
                <img
                  src={metadata.bannerObjectUrl}
                  alt="Banner preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <button
                  onClick={handleRemoveBanner}
                  title="Remove banner image"
                  className="absolute top-1 right-1 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <ImageIcon className="w-4 h-4" />
                <span className="text-xs">Click or drop</span>
              </div>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleBannerFile(e.target.files[0])}
            />
          </div>
          {bannerError && (
            <p className="text-xs text-red-500 flex items-start gap-1">
              <TriangleAlert className="w-3 h-3 mt-0.5 shrink-0" />
              {bannerError}
            </p>
          )}
        </div>

        {/* Teaser */}
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Teaser</label>
          <textarea
            rows={1}
            placeholder="A short excerpt shown in post listings"
            value={metadata.teaser}
            onChange={handle('teaser')}
            className="w-full text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none bg-transparent border-b border-gray-100 dark:border-gray-800 focus:border-gray-300 dark:focus:border-gray-600 py-0.5 resize-none transition-colors"
          />
        </div>

        {/* Tags */}
        <div className="sm:w-56 shrink-0 space-y-1">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tags</label>
          <input
            type="text"
            placeholder="tag1, tag2, tag3"
            value={metadata.tags}
            onChange={handle('tags')}
            className="w-full text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none bg-transparent border-b border-gray-100 dark:border-gray-800 focus:border-gray-300 dark:focus:border-gray-600 pb-0.5 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
