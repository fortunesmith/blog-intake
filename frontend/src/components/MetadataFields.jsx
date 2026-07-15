import { useEffect, useRef, useState } from 'react'
import { ImageIcon, X, TriangleAlert } from 'lucide-react'

const BANNER_WIDTH = 1024
const BANNER_HEIGHT = 342

const BLOG_CATEGORIES = [
  'Newsletters',
  'Partner Stories',
  'Developer Stories',
  'Events',
  'Product Announcements',
]
const MAX_CATEGORIES = 2
const TEASER_MAX_LENGTH = 500

export default function MetadataFields({ metadata, onChange, onBannerImageInsert, onBannerImageRemove }) {
  const handle = (field) => (e) => onChange({ ...metadata, [field]: e.target.value })
  const bannerInputRef = useRef(null)
  const teaserRef = useRef(null)
  const [bannerError, setBannerError] = useState(null)

  // Auto-grow the teaser textarea so its full content is always visible without
  // an internal scrollbar, however many of the 500 characters have been typed.
  // Also re-measure whenever its width changes (window resize, sm breakpoint
  // stacking, etc.) since narrower text re-wraps into more lines.
  useEffect(() => {
    const el = teaserRef.current
    if (!el) return

    const resize = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    resize()

    let lastWidth = el.offsetWidth
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth !== lastWidth) {
        lastWidth = el.offsetWidth
        resize()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [metadata.teaser])

  const toggleCategory = (option) => {
    const selected = metadata.categories.includes(option)
    const next = selected
      ? metadata.categories.filter((c) => c !== option)
      : [...metadata.categories, option]
    onChange({ ...metadata, categories: next })
  }

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
    <div className="border-b border-gray-200 dark:border-gray-700 px-8 py-6 space-y-5">
      {/* Title — its own prominent block, well separated from the byline below */}
      <input
        type="text"
        placeholder="Post title"
        value={metadata.title}
        onChange={handle('title')}
        className="w-full text-4xl font-bold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none bg-transparent"
      />

      {/* Byline — Author + Date, given more visual weight than a typical form field */}
      <div className="flex items-baseline gap-6 pb-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-baseline gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">By</label>
          <input
            type="text"
            placeholder="Your name"
            value={metadata.author}
            onChange={handle('author')}
            className="min-w-[12rem] text-base font-medium text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none bg-transparent border-b border-transparent focus:border-gray-300 dark:focus:border-gray-600 pb-0.5 transition-colors"
          />
        </div>
        <div className="flex items-baseline gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={metadata.date}
            onChange={handle('date')}
            className="text-base text-gray-700 dark:text-gray-300 focus:outline-none bg-transparent border-b border-transparent focus:border-gray-300 dark:focus:border-gray-600 pb-0.5 transition-colors"
          />
        </div>
      </div>

      {/*
        Supporting metadata panel — Teaser, Category, and Banner are grouped inside a
        single bordered card so they always read as one connected unit, no matter how
        wide the screen is. Ordered to roughly match when they're actually filled in
        during writing (teaser/category before the banner, which is usually finalized last).
      */}
      <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Teaser */}
        <div className="flex-1 space-y-1">
          <div className="flex items-baseline justify-between">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Teaser</label>
            <span className="text-xs text-gray-400 dark:text-gray-500">{metadata.teaser.length}/{TEASER_MAX_LENGTH}</span>
          </div>
          <textarea
            ref={teaserRef}
            rows={2}
            maxLength={TEASER_MAX_LENGTH}
            placeholder="A short excerpt shown in post listings"
            value={metadata.teaser}
            onChange={handle('teaser')}
            className="w-full text-base leading-[1.8] text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 py-0.5 resize-none overflow-hidden transition-colors"
          />
        </div>

        {/* Blog category */}
        <div className="sm:w-56 shrink-0 space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Blog Category <span className="text-gray-400 dark:text-gray-500">(1-{MAX_CATEGORIES})</span>
          </label>
          <div className="space-y-0.5">
            {BLOG_CATEGORIES.map((option) => {
              const checked = metadata.categories.includes(option)
              const disabled = !checked && metadata.categories.length >= MAX_CATEGORIES
              return (
                <label
                  key={option}
                  className={`flex items-center gap-1.5 text-sm ${
                    disabled
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-300 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleCategory(option)}
                    className="accent-gray-700 dark:accent-gray-300"
                  />
                  {option}
                </label>
              )
            })}
          </div>
        </div>

        {/* Banner image */}
        <div className="sm:w-56 shrink-0 space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Banner image <span className="text-gray-400 dark:text-gray-500">({BANNER_WIDTH}&times;{BANNER_HEIGHT})</span>
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
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
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
      </div>
    </div>
  )
}
