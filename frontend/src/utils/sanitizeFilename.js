/**
 * Produces a filename containing only [A-Za-z0-9._-], matching the character
 * set Werkzeug's `secure_filename()` (used server-side for ZIP export in
 * backend/app.py) treats as already safe. Sanitizing here, at insertion
 * time, means the name referenced in the exported Markdown always matches
 * the actual filename bundled into the .zip — server-side re-sanitizing is
 * a no-op.
 */
export function sanitizeFilename(name) {
  const base = (name || 'file').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot + 1) : ''

  const cleanStem = stem
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .replace(/-{2,}/g, '-')
  const cleanExt = ext.replace(/[^A-Za-z0-9]+/g, '')

  const safeStem = cleanStem || 'file'
  return cleanExt ? `${safeStem}.${cleanExt}` : safeStem
}

/** Appends -1, -2, ... to `filename` until it no longer collides with `existingNames`. */
export function dedupeFilename(filename, existingNames) {
  if (!existingNames.has(filename)) return filename
  const dot = filename.lastIndexOf('.')
  const stem = dot > 0 ? filename.slice(0, dot) : filename
  const ext = dot > 0 ? filename.slice(dot) : '' // includes leading dot

  let n = 1
  let candidate = `${stem}-${n}${ext}`
  while (existingNames.has(candidate)) {
    n += 1
    candidate = `${stem}-${n}${ext}`
  }
  return candidate
}
