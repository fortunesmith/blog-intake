export default function MetadataFields({ metadata, onChange }) {
  const handle = (field) => (e) => onChange({ ...metadata, [field]: e.target.value })

  return (
    <div className="border-b border-gray-200 px-8 py-5 space-y-3">
      <input
        type="text"
        placeholder="Post title"
        value={metadata.title}
        onChange={handle('title')}
        className="w-full text-2xl font-semibold text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
      />
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Author</label>
          <input
            type="text"
            placeholder="Your name"
            value={metadata.author}
            onChange={handle('author')}
            className="text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent border-b border-transparent focus:border-gray-300 pb-0.5 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={metadata.date}
            onChange={handle('date')}
            className="text-sm text-gray-700 focus:outline-none bg-transparent border-b border-transparent focus:border-gray-300 pb-0.5 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
