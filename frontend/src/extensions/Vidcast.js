import { Node, mergeAttributes } from '@tiptap/core'

/** Mirrors Callout.js's escapeHtml — used here for the src/title values
 * interpolated into the exported <iframe> attributes below. */
function escapeHtmlAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Vidcast — an embedded Vidcast.io video, inserted via VidcastModal.jsx
 * (which validates/normalizes the URL before this node ever sees it).
 *
 * An atom (leaf) node: it has no editable text content of its own, only
 * `src`/`title` attributes, and renders as a placeholder card in the editor
 * — never a live <iframe> — to avoid CSP/network issues while editing.
 * `atom: true` is what makes this correct despite renderHTML below
 * returning a DOM spec with nested child elements (title/url text) for
 * display: it tells ProseMirror to treat the whole rendered subtree as a
 * single, non-editable unit rather than trying to reconcile those display
 * elements against a (nonexistent) content model.
 *
 * Exports to Markdown as the full raw HTML embed block confirmed in M0 —
 * a wrapper <div> (for the aspect-ratio box) around the real <iframe>.
 */
const Vidcast = Node.create({
  name: 'vidcast',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-vidcast-src'),
        renderHTML: (attributes) => ({ 'data-vidcast-src': attributes.src }),
      },
      title: {
        default: 'Vidcast video',
        parseHTML: (element) => element.getAttribute('data-vidcast-title') || 'Vidcast video',
        renderHTML: (attributes) => ({ 'data-vidcast-title': attributes.title }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-vidcast]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-vidcast': '' }),
      ['div', { class: 'vidcast-card-title' }, node.attrs.title || 'Vidcast video'],
      ['div', { class: 'vidcast-card-url' }, node.attrs.src || ''],
    ]
  },

  addCommands() {
    return {
      setVidcast: (attributes) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: attributes })
      },
    }
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const src = escapeHtmlAttr(node.attrs.src || '')
          const title = escapeHtmlAttr(node.attrs.title || 'Vidcast video')
          state.write(
            '<div style="padding-bottom: 56.25%; position: relative; display: block; width: 100%">\n' +
            `  <iframe src="${src}" width="100%" height="100%" title="${title}" ` +
            'loading="lazy" allow="fullscreen *;autoplay *;clipboard-write *;" ' +
            'style="position: absolute; top:0; left: 0; border: solid; border-radius: 12px;"></iframe>\n' +
            '</div>'
          )
          state.closeBlock(node)
        },
        parse: {
          // Intentionally omitted, same rationale as Callout.js — this
          // node is never reconstructed from its own exported HTML.
        },
      },
    }
  },
})

export default Vidcast
