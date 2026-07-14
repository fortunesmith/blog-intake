import { useRef, useState, useEffect, useCallback } from 'react'
import { PenLine, Download, Copy, Check, FilePlus, Sun, Moon, TriangleAlert, Save, FolderOpen } from 'lucide-react'
import Editor, {
  loadDraft, saveDraft, clearDraft,
  listDrafts, saveNamedDraft, loadNamedDraft, deleteNamedDraft,
} from './components/Editor'
import MetadataFields from './components/MetadataFields'
import Preview from './components/Preview'
import ConfirmModal from './components/ConfirmModal'
import SaveDraftModal from './components/SaveDraftModal'
import DraftManager from './components/DraftManager'
import { sanitizeFilename, dedupeFilename } from './utils/sanitizeFilename'

const MIGRATION_PROMPTED_KEY = 'blog-intake-migration-prompted'

const VIEW_MODES = ['edit', 'split', 'preview']

// Matches an image reference whose src never got swapped for a real
// filename — i.e. buildExportMarkdown had no imageMapRef entry for it.
const UNRESOLVED_IMAGE_RE = /!\[[^\]]*\]\(blob:/

function emptyMetadata() {
  return { title: '', author: '', date: '', bannerFilename: '', bannerObjectUrl: '', teaser: '', tags: '' }
}

function initMetadata() {
  const draft = loadDraft()
  return { ...emptyMetadata(), ...(draft?.metadata ?? {}) }
}

function initDark() {
  return localStorage.getItem('blog-intake-theme') === 'dark'
}

export default function App() {
  const editorRef = useRef(null)
  const imageMapRef = useRef(new Map())
  const copyTimeoutRef = useRef(null)
  const [metadata, setMetadata] = useState(initMetadata)
  const [markdownContent, setMarkdownContent] = useState('')
  const [viewMode, setViewMode] = useState('split')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [showNewDocModal, setShowNewDocModal] = useState(false)
  const [isDark, setIsDark] = useState(initDark)
  const [hasImages, setHasImages] = useState(false)
  // null (no error) | 'network' (Flask unreachable) | 'unresolved-image'
  // (a blob: reference survived substitution — e.g. a draft restored after
  // the page reloaded, leaving an image node with no matching imageMapRef entry)
  const [exportError, setExportError] = useState(null)
  const exportErrorTimeoutRef = useRef(null)
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false)
  const [showDraftManager, setShowDraftManager] = useState(false)
  // One-time V1 -> V2 migration nudge: if there's an existing (unnamed)
  // autosave draft and no named drafts yet, offer to save it as one so it
  // isn't only reachable via the old single-slot autosave. Computed as a
  // lazy initial state (rather than an effect + setState on mount) since it
  // only ever needs to run once, before the first paint.
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(() => {
    let alreadyPrompted = true
    try {
      alreadyPrompted = localStorage.getItem(MIGRATION_PROMPTED_KEY) === '1'
    } catch {
      /* localStorage unavailable — skip the prompt rather than risk asking every load */
    }
    return !alreadyPrompted && Boolean(loadDraft()) && listDrafts().length === 0
  })
  const [draftsVersion, setDraftsVersion] = useState(0)
  // Bumped to force Editor to fully unmount/remount when loading a named
  // draft, rather than calling editor.commands.setContent() on a live
  // instance — see the useMemo(loadDraft) comment in Editor.jsx for why
  // that path is best avoided for anything beyond an empty document.
  const [editorInstanceKey, setEditorInstanceKey] = useState(0)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('blog-intake-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    return () => clearTimeout(copyTimeoutRef.current)
  }, [])

  useEffect(() => {
    return () => clearTimeout(exportErrorTimeoutRef.current)
  }, [])

  // Prune imageMapRef entries for images the author deleted from the editor.
  // Toolbar.jsx sets each inserted image node's src to the raw objectUrl, and
  // that string flows unmodified into markdownContent until export-time
  // filename substitution — so its continued presence here is a reliable
  // signal the image is still referenced somewhere in the document.
  //
  // The banner image (M2) is a special case: its objectUrl never appears in
  // markdownContent (it's only ever written into the YAML front matter as a
  // plain filename, via metadata.bannerFilename) — so it's checked against
  // metadata.bannerObjectUrl instead, to avoid this effect wrongly pruning
  // the currently-selected banner.
  useEffect(() => {
    let changed = false
    for (const objectUrl of imageMapRef.current.keys()) {
      const inBody = markdownContent.includes(objectUrl)
      const isBanner = objectUrl === metadata.bannerObjectUrl
      if (!inBody && !isBanner) {
        URL.revokeObjectURL(objectUrl)
        imageMapRef.current.delete(objectUrl)
        changed = true
      }
    }
    if (changed) setHasImages(imageMapRef.current.size > 0)
  }, [markdownContent, metadata.bannerObjectUrl])

  const handleMetadataChange = (updated) => {
    setMetadata(updated)
    saveDraft({ metadata: updated })
  }

  // Escape a value for use inside a YAML double-quoted scalar.
  // In double-quoted YAML, backslash and double-quote are the only characters
  // that must be escaped; everything else is literal.
  const yamlEscape = (str) => str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

  // Multi-line scalar (YAML literal block) — used for a teaser that spans
  // more than one line, since a double-quoted scalar can't contain a raw
  // newline.
  const yamlLiteralBlock = (str) =>
    '|\n' + str.split('\n').map((line) => `  ${line}`).join('\n')

  // Comma-separated input -> a YAML block sequence, one quoted+escaped
  // scalar per non-empty trimmed tag.
  const yamlSequence = (csv) =>
    csv.split(',').map((t) => t.trim()).filter(Boolean)
      .map((t) => `  - "${yamlEscape(t)}"`).join('\n')

  const buildExportMarkdown = () => {
    let md = markdownContent
    imageMapRef.current.forEach((filename, objectUrl) => {
      md = md.split(objectUrl).join(filename)
    })
    const { title, author, date, bannerFilename, teaser, tags } = metadata
    const tagLines = tags ? yamlSequence(tags) : ''
    if (title || author || date || bannerFilename || teaser || tagLines) {
      const lines = ['---']
      if (title)         lines.push(`title: "${yamlEscape(title)}"`)
      if (author)        lines.push(`author: "${yamlEscape(author)}"`)
      if (date)          lines.push(`date: "${yamlEscape(date)}"`)
      if (bannerFilename) lines.push(`banner_image: "${yamlEscape(bannerFilename)}"`)
      if (teaser) {
        lines.push(`description: ${teaser.includes('\n') ? yamlLiteralBlock(teaser) : `"${yamlEscape(teaser)}"`}`)
      }
      if (tagLines) lines.push('tags:', tagLines)
      lines.push('---', '', '')
      md = lines.join('\n') + md
    }
    return md
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const flagExportError = (reason) => {
    setExportError(reason)
    clearTimeout(exportErrorTimeoutRef.current)
    exportErrorTimeoutRef.current = setTimeout(() => setExportError(null), reason === 'unresolved-image' ? 8000 : 5000)
  }

  const handleExport = async () => {
    const md = buildExportMarkdown()
    const slug = metadata.title
      ? metadata.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : 'blog-post'

    // Don't ship a corrupted .md/.zip. This can happen if a draft was
    // restored (e.g. after closing and reopening the app) with an image
    // node — or a banner image — whose blob: URL is no longer tracked in
    // imageMapRef (imageMapRef itself is never persisted across reloads).
    const bannerUnresolved = metadata.bannerObjectUrl && !imageMapRef.current.has(metadata.bannerObjectUrl)
    if (UNRESOLVED_IMAGE_RE.test(md) || bannerUnresolved) {
      flagExportError('unresolved-image')
      return
    }

    if (!hasImages) {
      downloadBlob(new Blob([md], { type: 'text/markdown' }), `${slug}.md`)
      return
    }

    setExportError(null)
    try {
      const formData = new FormData()
      formData.append('markdown', md)
      formData.append('slug', slug)
      for (const [objectUrl, filename] of imageMapRef.current.entries()) {
        const imageBlob = await fetch(objectUrl).then((r) => r.blob())
        formData.append('images', imageBlob, filename)
      }

      const res = await fetch('/api/export', { method: 'POST', body: formData })
      if (!res.ok) {
        flagExportError('network')
        return
      }
      downloadBlob(await res.blob(), `${slug}.zip`)
    } catch {
      // Most likely cause: the Flask dev server isn't running.
      flagExportError('network')
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildExportMarkdown())
      setCopied(true)
      setCopyError(false)
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopyError(false), 2000)
    }
  }

  const handleCloseNewDocModal = useCallback(() => setShowNewDocModal(false), [])

  const handleImageInsert = (objectUrl, filename) => {
    const existingNames = new Set(imageMapRef.current.values())
    const safeName = dedupeFilename(sanitizeFilename(filename), existingNames)
    imageMapRef.current.set(objectUrl, safeName)
    setHasImages(imageMapRef.current.size > 0)
  }

  const handleBannerImageInsert = (objectUrl, filename) => {
    const existingNames = new Set(imageMapRef.current.values())
    const safeName = dedupeFilename(sanitizeFilename(filename), existingNames)
    imageMapRef.current.set(objectUrl, safeName)
    setHasImages(imageMapRef.current.size > 0)
    // The previous banner's imageMapRef entry (if any) is cleaned up by the
    // pruning effect once metadata.bannerObjectUrl below no longer matches it.
    const updated = { ...metadata, bannerFilename: safeName, bannerObjectUrl: objectUrl }
    setMetadata(updated)
    saveDraft({ metadata: updated })
  }

  const handleBannerImageRemove = () => {
    if (metadata.bannerObjectUrl) {
      URL.revokeObjectURL(metadata.bannerObjectUrl)
      imageMapRef.current.delete(metadata.bannerObjectUrl)
      setHasImages(imageMapRef.current.size > 0)
    }
    const updated = { ...metadata, bannerFilename: '', bannerObjectUrl: '' }
    setMetadata(updated)
    saveDraft({ metadata: updated })
  }

  const handleNewDocument = () => {
    editorRef.current?.reset()
    setMetadata(emptyMetadata())
    imageMapRef.current.forEach((_, objectUrl) => URL.revokeObjectURL(objectUrl))
    imageMapRef.current = new Map()
    setHasImages(false)
    setExportError(null)
    clearDraft()
  }

  const dismissMigrationPrompt = () => {
    try {
      localStorage.setItem(MIGRATION_PROMPTED_KEY, '1')
    } catch {
      /* localStorage unavailable */
    }
    setShowMigrationPrompt(false)
  }

  const handleSaveDraft = (name) => {
    const current = loadDraft()
    saveNamedDraft({ title: name, content: current?.content ?? '', metadata })
    setDraftsVersion((v) => v + 1)
  }

  const handleSaveMigratedDraft = (name) => {
    handleSaveDraft(name)
    dismissMigrationPrompt()
  }

  // Loading a different draft is treated like opening a different document:
  // metadata and the image map are fully replaced (same cleanup as New
  // Document), and the loaded {content, metadata} is written into the
  // autosave slot *before* remounting Editor, so its own
  // useMemo(loadDraft) picks it up as initial content on mount.
  const handleLoadDraft = (id) => {
    const draft = loadNamedDraft(id)
    if (!draft) return
    const nextMetadata = { ...emptyMetadata(), ...(draft.metadata ?? {}) }
    saveDraft({ content: draft.content ?? '', metadata: nextMetadata })
    setMetadata(nextMetadata)
    imageMapRef.current.forEach((_, objectUrl) => URL.revokeObjectURL(objectUrl))
    imageMapRef.current = new Map()
    setHasImages(false)
    setExportError(null)
    setEditorInstanceKey((k) => k + 1)
    setShowDraftManager(false)
  }

  const handleDeleteDraft = (id) => {
    deleteNamedDraft(id)
    setDraftsVersion((v) => v + 1)
  }

  const showEditor  = viewMode === 'edit'  || viewMode === 'split'
  const showPreview = viewMode === 'preview' || viewMode === 'split'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-[53px] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <PenLine className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Blog Post Editor</span>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          <button
            onClick={() => setShowNewDocModal(true)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            title="Start a new document"
          >
            <FilePlus className="w-4 h-4" />
            New
          </button>
          <button
            onClick={() => setShowSaveDraftModal(true)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Save the current post as a named draft"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDraftManager(true)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Open saved drafts"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle — hidden on mobile */}
          <div className="hidden sm:flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            {VIEW_MODES.map((mode, i) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-3 py-1.5 capitalize transition-colors
                  ${viewMode === mode
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
                  ${i > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''}
                `}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Light/dark toggle */}
          <button
            onClick={() => setIsDark((v) => !v)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
            }
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied</>
              : copyError
                ? <><Copy className="w-3.5 h-3.5 text-red-500" />Copy failed</>
                : <><Copy className="w-3.5 h-3.5" />Copy Markdown</>
            }
          </button>
          <button
            onClick={handleExport}
            title={
              exportError === 'network'
                ? 'Start the Flask server (python app.py in backend/) to export images as a .zip'
                : exportError === 'unresolved-image'
                  ? "This document has an image that couldn't be resolved (often from a draft restored after the app was closed). Remove and re-insert it, then export again."
                  : undefined
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              exportError
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
            }`}
          >
            {exportError === 'network'
              ? <><TriangleAlert className="w-3.5 h-3.5" />Export failed</>
              : exportError === 'unresolved-image'
                ? <><TriangleAlert className="w-3.5 h-3.5" />Fix image first</>
                : <><Download className="w-3.5 h-3.5" />{hasImages ? 'Export .zip' : 'Export .md'}</>
            }
          </button>
        </div>
      </header>

      {/* ── Metadata ─────────────────────────────────────────────────── */}
      <MetadataFields
        metadata={metadata}
        onChange={handleMetadataChange}
        onBannerImageInsert={handleBannerImageInsert}
        onBannerImageRemove={handleBannerImageRemove}
      />

      {/* ── Editor + Preview panes ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row">
        <div className={`flex flex-col ${showPreview ? 'sm:w-1/2 w-full' : 'w-full'} ${!showEditor ? 'hidden' : ''}`}>
          <Editor
            key={editorInstanceKey}
            ref={editorRef}
            onImageInsert={handleImageInsert}
            onMarkdownChange={setMarkdownContent}
          />
        </div>
        {showPreview && (
          <div className={`${showEditor ? 'sm:w-1/2 w-full sm:border-t-0 border-t border-gray-200 dark:border-gray-700' : 'w-full'}`}>
            <Preview markdown={markdownContent} />
          </div>
        )}
      </div>

      {/* ── New document confirmation ─────────────────────────────────── */}
      {showNewDocModal && (
        <ConfirmModal
          title="Start a new document?"
          message="Your current content will be permanently cleared. This cannot be undone."
          confirmLabel="Clear and start new"
          onConfirm={handleNewDocument}
          onClose={handleCloseNewDocModal}
        />
      )}

      {/* ── Named drafts (M5) ────────────────────────────────────────── */}
      {showSaveDraftModal && (
        <SaveDraftModal
          defaultName={metadata.title || 'Untitled draft'}
          onSave={handleSaveDraft}
          onClose={() => setShowSaveDraftModal(false)}
        />
      )}

      {showDraftManager && (
        <DraftManager
          key={draftsVersion}
          drafts={listDrafts()}
          onLoad={handleLoadDraft}
          onDelete={handleDeleteDraft}
          onClose={() => setShowDraftManager(false)}
        />
      )}

      {showMigrationPrompt && (
        <SaveDraftModal
          defaultName={metadata.title || 'Migrated draft'}
          description="We found a draft saved from before named drafts existed. Save it as one now so it's easy to find later?"
          saveLabel="Save as draft"
          onSave={handleSaveMigratedDraft}
          onClose={dismissMigrationPrompt}
        />
      )}
    </div>
  )
}
