import { useState } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import xml from 'highlight.js/lib/languages/xml'

// Extend the default (GitHub-style) sanitize schema to also allow `blob:`
// object URLs for <img src>. Inserted images use blob: URLs while editing —
// the real filename swap only happens at export time — and the default
// schema's protocol allowlist (http/https only) would otherwise silently
// strip the src attribute, so no inserted image ever renders here. blob:
// URLs only ever resolve to same-session, same-origin browser objects, so
// allowing them for this one attribute doesn't reopen any injection vector.
// Callout.js serializes its node as a raw HTML block:
//   <div><Callout type="info">plain text</Callout></div>
// rehype-raw's HTML parser lowercases the custom tag to <callout> (standard
// HTML parsing behavior for unrecognized tag names) — that's expected, and
// only affects this preview rendering, not the exported Markdown, which
// keeps the original <Callout> capitalization Contentstack expects. Once
// sanitized, <callout type="..."> is rendered by react-markdown as a plain
// custom element (no React component mapping needed) and styled via CSS
// attribute selectors, same approach as the editor's own data-callout div.
const PREVIEW_SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'callout'],
  attributes: {
    ...defaultSchema.attributes,
    callout: ['type'],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: [...defaultSchema.protocols.src, 'blob'],
  },
}

// Mirrors the toolbar's fixed code-block language list (Toolbar.jsx) —
// registering only these 5 highlight.js grammars (rather than the ~190
// available, or even rehype-highlight's default 37-language "common" set)
// keeps the bundle small since authors can't select any language outside
// this list anyway. "html" isn't a distinct grammar; it's aliased to "xml"
// below, matching how highlight.js itself treats markup languages.
const HIGHLIGHT_LANGUAGES = { bash, javascript, json, python, xml }
const HIGHLIGHT_ALIASES = { xml: 'html' }

const REMARK_PLUGINS = [remarkGfm]
// rehypeHighlight runs *after* rehypeSanitize, not before: sanitize is the
// security boundary for author-controlled markup (including the "raw" HTML
// rehypeRaw parses), while the <span class="hljs-*"> wrappers rehypeHighlight
// adds afterward are entirely plugin-generated — never sanitized user
// input — so nothing needs to reach back into PREVIEW_SANITIZE_SCHEMA to
// allow them through. This is rehype-highlight's own documented ordering.
const REHYPE_PLUGINS = [
  rehypeRaw,
  [rehypeSanitize, PREVIEW_SANITIZE_SCHEMA],
  [rehypeHighlight, { languages: HIGHLIGHT_LANGUAGES, aliases: HIGHLIGHT_ALIASES }],
]

// react-markdown applies its own URL allowlist on top of rehype-sanitize
// (independent of the schema above), and its default only allows
// http(s)/irc(s)/mailto/xmpp — blob: would still be stripped without this,
// even with the rehype-sanitize schema extended above. Scoped to img[src]
// only, so link hrefs keep the original, stricter default behavior.
function previewUrlTransform(url, key, node) {
  if (node?.tagName === 'img' && key === 'src' && url.startsWith('blob:')) {
    return url
  }
  return defaultUrlTransform(url)
}

export default function Preview({ markdown }) {
  const [view, setView] = useState('rendered')

  return (
    <div className="border-l border-gray-200 dark:border-gray-700">
      {/* Pane header with Rendered / Markdown toggle */}
      <div className="editor-toolbar bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 min-h-[49px] flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Preview</span>
        <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-xs bg-white dark:bg-gray-900">
          <button
            onClick={() => setView('rendered')}
            className={`px-2.5 py-1 transition-colors ${
              view === 'rendered'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Rendered
          </button>
          <button
            onClick={() => setView('markdown')}
            className={`px-2.5 py-1 border-l border-gray-200 dark:border-gray-700 transition-colors ${
              view === 'markdown'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-medium'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Markdown
          </button>
        </div>
      </div>

      {/* Rendered view */}
      {view === 'rendered' && (
        <div className="preview-content px-8 py-7">
          {markdown.trim() ? (
            <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} urlTransform={previewUrlTransform}>{markdown}</ReactMarkdown>
          ) : (
            <p className="text-gray-300 dark:text-gray-600 text-sm italic">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Raw Markdown code view */}
      {view === 'markdown' && (
        <div className="px-6 py-6">
          {markdown.trim() ? (
            <pre className="text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed break-words">
              {markdown}
            </pre>
          ) : (
            <p className="text-gray-300 dark:text-gray-600 text-sm italic font-mono">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
