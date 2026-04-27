/* eslint-disable react-refresh/only-export-components -- draft helpers exported for App */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Extension } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { Markdown } from 'tiptap-markdown'
import Toolbar from './Toolbar'

const STORAGE_KEY = 'blog-intake-draft'

/**
 * Dev-only paste/cursor diagnosis (`import.meta.env.DEV`).
 * Console: `[blog-intake/paste-diag] …` on each paste stage.
 * Globals: `__blogIntakeLastPaste`, `__blogIntakeDumpEditor()`, `__blogIntakePasteDocStats()`.
 */
function pasteDevLog(tag, data) {
  if (!import.meta.env.DEV) return
  console.info(`[blog-intake/paste-diag] ${tag}`, data)
  if (typeof window !== 'undefined') {
    window.__blogIntakeLastPaste = { tag, at: Date.now(), ...data }
  }
}

function countNodesByType(node, typeName, acc = 0) {
  if (!node || typeof node !== 'object') return acc
  if (node.type === typeName) acc += 1
  if (Array.isArray(node.content)) {
    for (const c of node.content) acc = countNodesByType(c, typeName, acc)
  }
  return acc
}

const SAFE_HREF = /^(https?:|mailto:)/i

const TABLE_ATTRS = ['width', 'height', 'valign', 'align', 'border',
  'cellspacing', 'cellpadding', 'bgcolor', 'bordercolor']

/** Normalizes line endings, list bullets, and narrow `}'Word` merge glitches for text/plain paste. */
function normalizePastedPlainText(text) {
  if (!text) return text
  let out = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // NBSP / BOM are not matched by \s in JavaScript; include them explicitly.
  out = out.split('\n').map((line) =>
    line.replace(/^[\u2022\u00B7\u25AA\u25AB\u25E6][\s\u00A0\uFEFF]*/, '- ')
  ).join('\n')
  out = out.replace(/(\}['"])[\s\u00A0\uFEFF]*(?=[A-Z][a-z])/g, '$1\n\n')
  return out
}

/** Inserts plain text as paragraphs (for paste-as-plain shortcut); HTML metacharacters escaped. */
function plainTextToInsertHtml(text) {
  const normalized = normalizePastedPlainText(text)
  const blocks = normalized.split(/\n{2,}/)
  if (blocks.length === 0) return '<p></p>'
  return blocks.map((block) => {
    const inner = block.split('\n').map((line) =>
      line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    ).join('<br>')
    return `<p>${inner.length ? inner : '<br>'}</p>`
  }).join('')
}

/**
 * Shared table + link cleanup so pasted HTML matches TipTap’s table model and avoids
 * prosemirror-tables fixTables correction transactions that desync the cursor.
 *
 * Non-Word clipboards (typical shapes): Google Docs — inline styles on spans, rare tables;
 * Gmail — layout tables; Slack/Notes — mixed. Normalizing row geometry and stripping bogus
 * links addresses the common cursor bugs tied to table maps and internal hrefs.
 */
function normalizePastedTablesAndLinks(div) {
  div.querySelectorAll('a').forEach((el) => {
    const href = el.getAttribute('href') ?? ''
    const hasName = el.hasAttribute('name')
    if (hasName || !SAFE_HREF.test(href)) {
      el.replaceWith(...Array.from(el.childNodes))
    }
  })

  div.querySelectorAll('colgroup').forEach((el) => el.remove())

  // Lift any non-row block content that landed as a direct child of a table
  // container (table, thead, tbody, tfoot) up to just before the nearest
  // ancestor <table>. This happens when a source like Google Docs or Notion
  // emits a paragraph immediately before a table but the HTML parser (or the
  // source itself) nests it inside the table element.
  div.querySelectorAll('table, thead, tbody, tfoot').forEach((container) => {
    const table = container.closest('table') ?? container
    if (!div.contains(table)) return
    Array.from(container.childNodes).forEach((child) => {
      // Keep <tr>, <thead>, <tbody>, <tfoot>, comment nodes, and whitespace-only text nodes in place.
      if (child.nodeType === 8) return // comment
      if (child.nodeType === 3) {
        if (!/\S/.test(child.textContent)) return // whitespace-only text
        // Wrap stray text in a <p> and lift it
        const p = document.createElement('p')
        p.textContent = child.textContent
        table.parentNode?.insertBefore(p, table)
        child.remove()
        return
      }
      if (/^(thead|tbody|tfoot|tr)$/i.test(child.tagName)) return
      // Block element (p, h1-h6, div, ul, ol, pre, blockquote) or anything else —
      // move it before the table.
      table.parentNode?.insertBefore(child, table)
    })
  })

  div.querySelectorAll('td, th').forEach((cell) => {
    cell.removeAttribute('colspan')
    cell.removeAttribute('rowspan')
  })

  div.querySelectorAll('table').forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr'))
    if (!rows.length) return
    const maxCells = Math.max(...rows.map((r) => r.querySelectorAll('td, th').length))
    rows.forEach((row) => {
      const deficit = maxCells - row.querySelectorAll('td, th').length
      for (let i = 0; i < deficit; i++) {
        const td = document.createElement('td')
        td.appendChild(document.createElement('p'))
        row.appendChild(td)
      }
    })
  })

  div.querySelectorAll('td, th').forEach((cell) => {
    const hasBlock = Array.from(cell.childNodes).some(
      (n) => n.nodeType === 1 && /^(p|h[1-6]|blockquote|pre|ul|ol)$/i.test(n.tagName)
    )
    if (!hasBlock && cell.childNodes.length) {
      const p = document.createElement('p')
      while (cell.firstChild) p.appendChild(cell.firstChild)
      cell.appendChild(p)
    }
  })

  div.querySelectorAll('table,thead,tbody,tfoot,tr,th,td')
    .forEach((el) => TABLE_ATTRS.forEach((attr) => el.removeAttribute(attr)))
}

const GLUE_JSON_HEADING_G = /(\}['"])[\s\u00A0\uFEFF]*(?=[A-Z][a-z])/g

const GLUE_JSON_HEADING_TEST = /(\}['"])[\s\u00A0\uFEFF]*(?=[A-Z][a-z])/

/** True for divs that act like a paragraph (no nested block-level children). */
function isParagraphLikeDiv(el) {
  if (!el || el.tagName !== 'DIV') return false
  for (const c of el.children) {
    if (/^(P|DIV|UL|OL|TABLE|PRE|H[1-6]|BLOCKQUOTE)$/i.test(c.tagName)) return false
  }
  return true
}

/** Long unbroken lines in <pre> break ProseMirror coordsAtPos; soft-wrap at maxCols. */
function softWrapPreLineLength(root, maxCols = 120) {
  root.querySelectorAll('pre').forEach((pre) => {
    const t = pre.textContent
    if (t.length <= maxCols) return
    const lines = t.split('\n')
    const out = lines.map((line) => {
      if (line.length <= maxCols) return line
      const chunks = []
      for (let i = 0; i < line.length; i += maxCols) chunks.push(line.slice(i, i + maxCols))
      return chunks.join('\n')
    }).join('\n')
    pre.textContent = out
  })
}

function segmentTextOnJsonGlue(txt) {
  const re = new RegExp(GLUE_JSON_HEADING_G.source, 'g')
  const segments = []
  let last = 0
  let m
  while ((m = re.exec(txt)) !== null) {
    const end = m.index + m[0].length
    segments.push(txt.slice(last, end))
    last = end
  }
  segments.push(txt.slice(last))
  return segments
}

/**
 * Splits JSON-like `}'` / `}"` before a prose word using each block’s full textContent
 * (handles div-as-paragraph clipboards and glue split across <span>s). Flattens inline
 * markup in affected blocks only. Inside <pre>, newline-only insertion.
 */
function repairGluedJsonHeadingInDiv(root) {
  root.querySelectorAll('pre').forEach((pre) => {
    const t = pre.textContent
    if (!GLUE_JSON_HEADING_TEST.test(t)) return
    pre.textContent = t.replace(GLUE_JSON_HEADING_G, '$1\n\n')
  })

  const blockHosts = []
  root.querySelectorAll('p').forEach((p) => {
    if (!p.closest('pre') && root.contains(p)) blockHosts.push(p)
  })
  root.querySelectorAll('div').forEach((d) => {
    if (d.closest('pre') || !root.contains(d)) return
    if (isParagraphLikeDiv(d)) blockHosts.push(d)
  })

  for (const el of blockHosts) {
    if (!root.contains(el)) continue
    const txt = el.textContent
    if (!GLUE_JSON_HEADING_TEST.test(txt)) continue

    const segments = segmentTextOnJsonGlue(txt)
    if (segments.length < 2) continue

    const parent = el.parentNode
    if (!parent) continue

    el.textContent = segments[0]
    let anchor = el
    for (let i = 1; i < segments.length; i++) {
      const p = document.createElement('p')
      p.textContent = segments[i]
      parent.insertBefore(p, anchor.nextSibling)
      anchor = p
    }
  }
}

function transformWordPasteHtml(html) {
  let clean = html.replace(/<!--[\s\S]*?-->/g, '')
  clean = clean
    .replace(/<\/?o:[^>]*>/gi, '')
    .replace(/<\/?v:[^>]*>/gi, '')
    .replace(/<\/?w:[^>]*>/gi, '')
    .replace(/<\/?m:[^>]*>/gi, '')

  const div = document.createElement('div')
  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  div.innerHTML = bodyMatch ? bodyMatch[1] : clean

  div.querySelectorAll('style,head,meta,link,script').forEach((el) => el.remove())

  div.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'))
  div.querySelectorAll('[class]').forEach((el) => {
    if (/^Mso|word/i.test(el.getAttribute('class') ?? '')) el.removeAttribute('class')
  })
  div.querySelectorAll('[lang]').forEach((el) => el.removeAttribute('lang'))

  div.querySelectorAll('span').forEach((el) => {
    if (!el.hasAttributes()) el.replaceWith(...Array.from(el.childNodes))
  })

  div.normalize()

  normalizePastedTablesAndLinks(div)
  repairGluedJsonHeadingInDiv(div)
  softWrapPreLineLength(div)
  return div.innerHTML
}

function transformGenericPasteHtml(html) {
  if (!html.includes('<')) return normalizePastedPlainText(html)

  const div = document.createElement('div')
  div.innerHTML = html

  div.querySelectorAll('style,head,meta,link,script').forEach((el) => el.remove())

  normalizePastedTablesAndLinks(div)

  div.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'))
  let pass = 0
  while (pass++ < 20) {
    const bare = Array.from(div.querySelectorAll('span')).filter((el) => !el.hasAttributes())
    if (!bare.length) break
    bare.forEach((el) => el.replaceWith(...Array.from(el.childNodes)))
  }

  div.normalize()

  repairGluedJsonHeadingInDiv(div)
  softWrapPreLineLength(div)
  return div.innerHTML
}

const PastePlainShortcut = Extension.create({
  name: 'pasteAsPlain',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-v': () => {
        const ed = this.editor
        navigator.clipboard.readText().then((t) => {
          ed.chain().focus().insertContent(plainTextToInsertHtml(t)).run()
        }).catch((err) => {
          if (import.meta.env.DEV) console.warn('[paste-as-plain] clipboard read failed:', err)
        })
        return true
      },
    }
  },
})

// Converts a single <td>/<th> DOM node's inner content to inline markdown.
function cellHtmlToMarkdown(cell) {
  let html = cell.innerHTML
  // collapse block wrappers to spaces so multi-paragraph cells become one line
  html = html.replace(/<\/?(?:p|div)[^>]*>/gi, ' ')
  html = html
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~')
    .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')       // strip remaining tags
    .replace(/\s+/g, ' ')          // normalise whitespace
    .replace(/\|/g, '\\|')         // escape pipe characters
    .trim()
  return html
}

// Replaces every HTML <table>…</table> block in a markdown string with a GFM
// pipe table. Falls back silently to the original HTML if anything goes wrong.
function htmlTablesToGFM(md) {
  return md.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    try {
      const div = document.createElement('div')
      div.innerHTML = tableHtml
      const rows = Array.from(div.querySelectorAll('tr'))
      if (!rows.length) return tableHtml

      const rowToLine = (row) =>
        '| ' + Array.from(row.querySelectorAll('th, td'))
          .map(cellHtmlToMarkdown)
          .join(' | ') + ' |'

      const colCount = rows[0].querySelectorAll('th, td').length
      const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |'

      return [
        rowToLine(rows[0]),
        separator,
        ...rows.slice(1).map(rowToLine),
      ].join('\n')
    } catch {
      return tableHtml  // fallback: return original HTML unchanged
    }
  })
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDraft(patch) {
  try {
    const existing = loadDraft() ?? {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...patch }))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* localStorage unavailable */
  }
}

const MARKDOWN_DEBOUNCE_MS = 250

const Editor = forwardRef(function Editor({ onImageInsert, onMarkdownChange }, ref) {
  // Load draft once before editor creation so TipTap initialises with the full
  // document natively. setContent (used previously) does a full docView rebuild
  // that causes posAtCoords to misfire on large documents — passing content here
  // avoids that entirely.
  const initialContent = useMemo(() => loadDraft()?.content ?? '', [])
  const markdownDebounceRef = useRef(null)
  const [wordCount, setWordCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false, allowGapCursor: true }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({ html: true, tightLists: true, linkify: false }),
      PastePlainShortcut,
    ],
    content: initialContent,
    onCreate({ editor }) {
      onMarkdownChange?.(htmlTablesToGFM(editor.storage.markdown?.getMarkdown() ?? ''))
      setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length)
    },
    onUpdate({ editor }) {
      saveDraft({ content: editor.getJSON() })
      setWordCount(editor.getText().trim().split(/\s+/).filter(Boolean).length)
      if (markdownDebounceRef.current) clearTimeout(markdownDebounceRef.current)
      markdownDebounceRef.current = setTimeout(() => {
        markdownDebounceRef.current = null
        onMarkdownChange?.(htmlTablesToGFM(editor.storage.markdown?.getMarkdown() ?? ''))
      }, MARKDOWN_DEBOUNCE_MS)
    },
    editorProps: {
      attributes: {
        'data-placeholder': 'Start writing your blog post…',
      },
      // Pasted HTML is sanitized so tables match TipTap’s model (row width, cells with
      // block content, no colgroup/colspan surprises). That reduces prosemirror-tables
      // fixTables follow-up transactions that previously desynced cursor/posAtCoords.
      transformPastedHTML(html) {
        pasteDevLog('transformPastedHTML', {
          branch: html.includes('schemas-microsoft-com') ? 'word' : 'generic',
          htmlLen: html.length,
          htmlPreview: html.slice(0, 300),
        })
        if (html.includes('schemas-microsoft-com')) {
          return transformWordPasteHtml(html)
        }
        return transformGenericPasteHtml(html)
      },

      transformPastedText(text, plain) {
        pasteDevLog('transformPastedText', {
          plain,
          textLen: (text ?? '').length,
          textPreview: (text ?? '').slice(0, 300),
        })
        return normalizePastedPlainText(text)
      },

      // Suppress Safari/WebKit's native table-editing context menu (right-click →
      // "Split Cell", "Merge Cells", etc.). Those options modify the raw DOM directly,
      // bypassing ProseMirror and corrupting the document model. Blocking the default
      // inside table cells prevents this while leaving the normal context menu intact
      // everywhere else in the editor.
      handleDOMEvents: {
        contextmenu(_view, event) {
          const target = event.target
          if (target instanceof Element && target.closest('td, th')) {
            event.preventDefault()
            return true
          }
          return false
        },
      },

      // Replace ProseMirror's coordsAtPos-based scroll with a native selection rect lookup.
      // coordsAtPos misfires for any document containing code blocks with very long lines
      // (e.g. a 200-char base64 string), causing the viewport to snap to the wrong position
      // after a paste. All subsequent posAtCoords calls then map click coordinates to the
      // wrong document positions, making the cursor appear to jump.
      // If the DOM selection rect is zero (selection hasn't settled yet — e.g. during
      // ProseMirror's own selection normalisation after paste), we return false immediately
      // so ProseMirror can finish normalising before we touch the scroll position.
      handleScrollToSelection: () => {
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return false
        const rect = sel.getRangeAt(0).getBoundingClientRect()
        // Zero rect means the selection hasn't been committed to the DOM yet.
        // Return false so ProseMirror's normalisation pass can complete first.
        if (!rect.top && !rect.bottom) return false

        requestAnimationFrame(() => {
          const s = window.getSelection()
          if (!s || s.rangeCount === 0) return
          const r = s.getRangeAt(0).getBoundingClientRect()
          if (!r.top && !r.bottom) return
          const toolbar = document.querySelector('.editor-toolbar')
          const topOffset = toolbar ? toolbar.getBoundingClientRect().bottom : 106
          if (r.top < topOffset) {
            window.scrollBy(0, r.top - topOffset - 8)
          } else if (r.bottom > window.innerHeight - 20) {
            window.scrollBy(0, r.bottom - window.innerHeight + 20)
          }
        })
        return true
      },
    },
  })

  useEffect(() => {
    if (!import.meta.env.DEV || !editor) return undefined
    const w = window
    w.__blogIntakeDumpEditor = () => editor.getJSON()
    w.__blogIntakePasteDocStats = () => {
      const doc = editor.getJSON()
      return {
        jsonChars: JSON.stringify(doc).length,
        codeBlocks: countNodesByType(doc, 'codeBlock'),
        tables: countNodesByType(doc, 'table'),
      }
    }
    return () => {
      delete w.__blogIntakeDumpEditor
      delete w.__blogIntakePasteDocStats
      delete w.__blogIntakeLastPaste
    }
  }, [editor])

  useEffect(() => () => {
    if (markdownDebounceRef.current) clearTimeout(markdownDebounceRef.current)
  }, [])

  useImperativeHandle(ref, () => ({
    getMarkdown: () => htmlTablesToGFM(editor?.storage.markdown?.getMarkdown() ?? ''),
    getEditor: () => editor,
    reset: () => {
      editor?.commands.clearContent(true)
    },
  }))

  return (
    <div className="flex flex-col">
      <Toolbar editor={editor} onImageInsert={onImageInsert} />
      <EditorContent editor={editor} />
      <div className="border-t border-gray-100 dark:border-gray-800 px-8 py-2 flex justify-end">
        <span className="text-xs text-gray-400 dark:text-gray-600">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>
    </div>
  )
})

export default Editor
