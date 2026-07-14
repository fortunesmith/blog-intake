import { Node, mergeAttributes } from '@tiptap/core'

export const CALLOUT_TYPES = ['info', 'warning']

/** Mirrors the escaping already used for pasted plain text in Editor.jsx's
 * plainTextToInsertHtml — prevents an author's own `<`, `>`, `&`, or a
 * literal `</Callout>` from corrupting the exported HTML block below. */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Callout — a short, single-line, plain-text info/warning annotation.
 *
 * Modeled directly on TipTap's own CodeBlock node spec (content: 'text*',
 * marks: '', code: true, defining: true) since the requirements are nearly
 * identical: a block that holds only unformatted text and must not accept
 * marks (bold/italic/etc.) from StarterKit. `code: true` is what actually
 * enforces "plain text" beyond the `marks: ''` restriction — it also makes
 * ProseMirror treat pasted content as plain text and skips markdown
 * input-rule auto-formatting while inside the node (see prosemirror-view
 * and prosemirror-inputrules), and lets the Enter handler below reuse the
 * built-in exitCode() command.
 *
 * Exports to Markdown as the raw HTML block Contentstack expects:
 *   <div><Callout type="info">plain text content</Callout></div>
 * This is one-way. There is intentionally no parseHTML rule that
 * reconstructs this node from that exported tag — pasting previously
 * published content containing `<Callout>` falls through to default paste
 * handling (most likely flattened to plain text). The parseHTML rule below
 * only recognizes this node's own editor-rendered markup (`data-callout`),
 * which is what TipTap's internal copy/paste within the same editor relies
 * on — a different, narrower case than round-tripping exported HTML.
 */
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => {
          const value = element.getAttribute('data-callout')
          return CALLOUT_TYPES.includes(value) ? value : 'info'
        },
        renderHTML: (attributes) => ({ 'data-callout': attributes.type }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },

  addKeyboardShortcuts() {
    return {
      // Plain Enter exits (unlike CodeBlock, which only exits on triple
      // Enter) — callouts are meant to be a single line, not a multi-line
      // container, so there is no reason to let Enter insert a line break.
      Enter: () => {
        const { state } = this.editor
        const { $from, empty } = state.selection
        if (!empty || $from.parent.type.name !== this.name) return false
        return this.editor.commands.exitCode()
      },
      // Backspace at the start of an empty (or otherwise start-of-content)
      // callout converts it back to a plain paragraph, same convention as
      // TipTap's own CodeBlock.
      Backspace: () => {
        const { $anchor, empty } = this.editor.state.selection
        if (!empty || $anchor.parent.type.name !== this.name) return false
        if ($anchor.parentOffset === 0 || !$anchor.parent.textContent.length) {
          return this.editor.commands.clearNodes()
        }
        return false
      },
    }
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const type = CALLOUT_TYPES.includes(node.attrs.type) ? node.attrs.type : 'info'
          state.write(`<div><Callout type="${type}">${escapeHtml(node.textContent)}</Callout></div>`)
          state.closeBlock(node)
        },
        parse: {
          // Intentionally omitted — see file header comment.
        },
      },
    }
  },
})

export default Callout
