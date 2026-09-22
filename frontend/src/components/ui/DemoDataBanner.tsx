export default function DemoDataBanner() {
  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
      <span className="text-amber-400 text-sm">⚠</span>
      <p className="text-amber-400/80 text-xs">
        <strong className="text-amber-400">DEMO DATA</strong> — All data shown is fictional and for demonstration purposes only.
        Not real municipal or road authority data.
      </p>
    </div>
  )
}
