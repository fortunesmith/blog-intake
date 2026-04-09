import { forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { Markdown } from 'tiptap-markdown'
import Toolbar from './Toolbar'

const STORAGE_KEY = 'blog-intake-draft'

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
    } catch (_) {
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
  } catch {}
}

const Editor = forwardRef(function Editor({ onImageInsert, onMarkdownChange }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false, allowGapCursor: true }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({ html: true, tightLists: true, linkify: false }),
    ],
    content: '',
    onCreate({ editor }) {
      const draft = loadDraft()
      if (draft?.content) {
        editor.commands.setContent(draft.content, false)
      }
      onMarkdownChange?.(editor.storage.markdown?.getMarkdown() ?? '')
    },
    onUpdate({ editor }) {
      saveDraft({ content: editor.getJSON() })
      onMarkdownChange?.(htmlTablesToGFM(editor.storage.markdown?.getMarkdown() ?? ''))
    },
    editorProps: {
      attributes: {
        'data-placeholder': 'Start writing your blog post…',
      },
      // TODO (Contentstack milestone): Cursor positioning misfires when pasting a large,
      // mixed-content Word document containing tables. Root cause is TipTap's `fixTables`
      // plugin dispatching correction transactions after paste, corrupting ProseMirror's
      // position descriptors. Recommended fix: disable `fixTables` via Table extension
      // config and validate table structure entirely inside `transformPastedHTML`, or
      // intercept at the Slice level using the `transformPasted` editorProp instead of
      // `transformPastedHTML`. The current `transformPastedHTML` cleanup + GapCursor fix
      // handles standalone table pastes correctly; only large mixed-content documents
      // are affected.
      transformPastedHTML(html) {
        if (!html.includes('schemas-microsoft-com')) return html

        // Strip HTML comments (StartFragment, EndFragment, Word conditionals)
        let clean = html.replace(/<!--[\s\S]*?-->/g, '')

        // Strip XML namespace elements
        clean = clean
          .replace(/<\/?o:[^>]*>/gi, '')
          .replace(/<\/?v:[^>]*>/gi, '')
          .replace(/<\/?w:[^>]*>/gi, '')
          .replace(/<\/?m:[^>]*>/gi, '')

        // Extract body content
        const div = document.createElement('div')
        const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        div.innerHTML = bodyMatch ? bodyMatch[1] : clean

        // Remove unwanted elements
        div.querySelectorAll('style,head,meta,link,script').forEach(el => el.remove())

        // Strip inline styles, Word classes, lang attributes
        div.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'))
        div.querySelectorAll('[class]').forEach(el => {
          if (/^Mso|word/i.test(el.getAttribute('class') ?? '')) el.removeAttribute('class')
        })
        div.querySelectorAll('[lang]').forEach(el => el.removeAttribute('lang'))

        // Unwrap attribute-free spans
        div.querySelectorAll('span').forEach(el => {
          if (!el.hasAttributes()) el.replaceWith(...Array.from(el.childNodes))
        })

        // Unwrap Word internal anchor links — TOC cross-references, named anchors,
        // file:// paths, and internal #_Toc / #_Ref hrefs all produce link marks that
        // corrupt TipTap's selection on click. Preserve only real external links.
        const SAFE_HREF = /^(https?:|mailto:)/i
        div.querySelectorAll('a').forEach(el => {
          const href = el.getAttribute('href') ?? ''
          const hasName = el.hasAttribute('name')
          if (hasName || !SAFE_HREF.test(href)) {
            el.replaceWith(...Array.from(el.childNodes))
          }
        })

        // Remove colgroup/col entirely — TipTap's table model only expects tableRow children
        div.querySelectorAll('colgroup').forEach(el => el.remove())

        // Strip colspan/rowspan before normalization so every cell is a simple 1×1 unit.
        // Without this, a <td colspan="2"> counts as 1 cell but spans 2 columns, causing
        // normalization to over-pad rows and leave fixTables with an inconsistent table.
        div.querySelectorAll('td, th').forEach(cell => {
          cell.removeAttribute('colspan')
          cell.removeAttribute('rowspan')
        })

        // Normalize rows to equal cell counts so fixTables never dispatches a
        // correction transaction (which corrupts ProseMirror's descriptor positions)
        div.querySelectorAll('table').forEach(table => {
          const rows = Array.from(table.querySelectorAll('tr'))
          if (!rows.length) return
          const maxCells = Math.max(...rows.map(r => r.querySelectorAll('td, th').length))
          rows.forEach(row => {
            const deficit = maxCells - row.querySelectorAll('td, th').length
            for (let i = 0; i < deficit; i++) {
              const td = document.createElement('td')
              td.appendChild(document.createElement('p'))
              row.appendChild(td)
            }
          })
        })

        // Wrap bare cell text in <p> to satisfy TipTap's block+ cell content requirement
        div.querySelectorAll('td, th').forEach(cell => {
          const hasBlock = Array.from(cell.childNodes).some(
            n => n.nodeType === 1 && /^(p|h[1-6]|blockquote|pre|ul|ol)$/i.test(n.tagName)
          )
          if (!hasBlock && cell.childNodes.length) {
            const p = document.createElement('p')
            while (cell.firstChild) p.appendChild(cell.firstChild)
            cell.appendChild(p)
          }
        })

        // Strip presentational table attributes
        const TABLE_ATTRS = ['width', 'height', 'valign', 'align', 'border',
                             'cellspacing', 'cellpadding', 'bgcolor', 'bordercolor']
        div.querySelectorAll('table,thead,tbody,tfoot,tr,th,td')
           .forEach(el => TABLE_ATTRS.forEach(attr => el.removeAttribute(attr)))

        return div.innerHTML
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

  useImperativeHandle(ref, () => ({
    getMarkdown: () => htmlTablesToGFM(editor?.storage.markdown?.getMarkdown() ?? ''),
    getEditor: () => editor,
    reset: () => {
      editor?.commands.clearContent(true)
    },
  }))

  const wordCount = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0

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
