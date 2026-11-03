import { useState, useEffect, useCallback } from 'react'

const SHORTCUTS_KEY = 'gpay-note-shortcuts'

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isAndroid = () => /Android/i.test(navigator.userAgent)

const readShortcuts = () => {
  try { return JSON.parse(localStorage.getItem(SHORTCUTS_KEY) || '{}') || {} } catch { return {} }
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-white/10 text-on-surface text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
      <div className="text-body-sm text-on-surface-variant leading-relaxed">{children}</div>
    </li>
  )
}

const Kbd = ({ children }) => (
  <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-on-surface font-semibold whitespace-nowrap">{children}</span>
)

export default function ScanSection({ onImport }) {
  const [dragging, setDragging] = useState(false)
  const [pasteMsg, setPasteMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [codes, setCodes] = useState(readShortcuts)
  const [guide, setGuide] = useState(() => (isIOS() ? 'iphone' : isAndroid() ? 'android' : 'iphone'))

  const shortcutUrl = `${window.location.origin}/?ocr=`

  const handleFiles = useCallback((list) => {
    const files = Array.from(list || []).filter((f) => f.type.startsWith('image/'))
    if (files.length) onImport(files)
  }, [onImport])

  const handleText = useCallback((text) => {
    if (/\d/.test(text) && /upi|google pay|paid|payment|to /i.test(text)) {
      onImport([{ text }])
      return true
    }
    return false
  }, [onImport])

  // Ctrl/⌘+V anywhere on this screen.
  useEffect(() => {
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || [])
      const images = items.filter((i) => i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean)
      if (images.length) { e.preventDefault(); onImport(images); return }
      const text = e.clipboardData?.getData('text/plain')
      if (text && handleText(text)) e.preventDefault()
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onImport, handleText])

  const pasteFromClipboard = async () => {
    setPasteMsg('')
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read()
        const images = []
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'))
          if (type) {
            const blob = await item.getType(type)
            images.push(new File([blob], 'pasted.png', { type }))
          }
        }
        if (images.length) { onImport(images); return }
      }
      const text = await navigator.clipboard?.readText?.()
      if (text && handleText(text)) return
      setPasteMsg('No screenshot found on the clipboard. Copy the screenshot first, then tap Paste.')
    } catch {
      setPasteMsg('Clipboard access was blocked. Use "Choose screenshots" instead.')
    }
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shortcutUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const removeCode = (key) => {
    const next = { ...codes }
    delete next[key]
    setCodes(next)
    try { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Primary action */}
      <div
        className={`glass-violet rounded-3xl p-6 lg:p-8 relative overflow-hidden transition-all ${dragging ? 'ring-2 ring-violet-300' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-5">
          <div>
            <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-300">document_scanner</span>
              Scan GPay payment
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Pick the payment-details screenshot. Amount, payee, date, bank and your note code
              (like <Kbd>fod</Kbd> or <Kbd>pe</Kbd>) are filled in for you to check and save.
            </p>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-3xl border-2 border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 cursor-pointer active:scale-[0.99] transition-all">
            <span className="material-symbols-outlined text-4xl text-primary">add_photo_alternate</span>
            <span className="text-body-lg font-bold text-on-surface">Choose screenshots</span>
            <span className="text-body-sm text-on-surface-variant">You can pick several at once</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
            />
          </label>

          <button
            type="button"
            onClick={pasteFromClipboard}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-white/15 text-on-surface font-semibold hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">content_paste</span>
            Paste screenshot
          </button>
          {pasteMsg && <p className="text-body-sm text-amber-200 -mt-2">{pasteMsg}</p>}
        </div>
      </div>

      {/* One-tap setup guides */}
      <div className="card-tint-primary rounded-3xl p-6 lg:p-8">
        <h3 className="text-body-lg font-bold text-on-surface flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-on-surface-variant">ios_share</span>
          Share straight from GPay
        </h3>
        <p className="text-body-sm text-on-surface-variant mb-4">One-time setup so you can share a screenshot to MoneyTracker without opening the app first.</p>

        <div className="flex gap-2 mb-5">
          {[['iphone', 'iPhone'], ['android', 'Android']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setGuide(id)}
              className={`px-4 py-2 rounded-full text-body-sm font-semibold transition-all ${guide === id ? 'bg-white/15 text-on-surface border border-white/15' : 'text-on-surface-variant hover:bg-white/5 border border-transparent'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {guide === 'iphone' ? (
          <>
            <ol className="flex flex-col gap-3">
              <Step n={1}>Open the <Kbd>Shortcuts</Kbd> app, tap <Kbd>+</Kbd>, and name the shortcut <Kbd>MoneyTracker</Kbd>.</Step>
              <Step n={2}>Tap the <Kbd>ⓘ</Kbd> button and turn on <Kbd>Show in Share Sheet</Kbd>. Back in the editor, set it to receive <Kbd>Images</Kbd> only.</Step>
              <Step n={3}>Add the action <Kbd>Extract Text from Image</Kbd> (input: Shortcut Input).</Step>
              <Step n={4}>Add <Kbd>URL Encode</Kbd> (input: Text).</Step>
              <Step n={5}>
                Add a <Kbd>URL</Kbd> action. Paste this link, then insert the <Kbd>URL Encoded Text</Kbd> variable right after it:
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate px-3 py-2 rounded-xl bg-black/30 text-on-surface text-[13px]">{shortcutUrl}</code>
                  <button type="button" onClick={copyUrl} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-on-surface text-body-sm font-semibold shrink-0">
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </Step>
              <Step n={6}>Add <Kbd>Open URLs</Kbd>. Done.</Step>
            </ol>
            <div className="mt-5 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-body-sm text-on-surface-variant flex flex-col gap-1.5">
              <p><span className="text-on-surface font-semibold">Daily use:</span> in GPay take a screenshot of the payment → tap the preview → Share → <Kbd>MoneyTracker</Kbd>.</p>
              <p>iPhone reads the text itself (Live Text), so it's fast and accurate. The shortcut opens in Safari — sign in there once.</p>
            </div>
          </>
        ) : (
          <>
            <ol className="flex flex-col gap-3">
              <Step n={1}>Open this site in <Kbd>Chrome</Kbd>, tap <Kbd>⋮</Kbd> → <Kbd>Add to Home screen</Kbd> / <Kbd>Install app</Kbd>.</Step>
              <Step n={2}>In GPay, take a screenshot of the payment and tap <Kbd>Share</Kbd>.</Step>
              <Step n={3}>Pick <Kbd>MoneyTracker</Kbd>. The app opens, reads it, and saves after a short countdown — tap to edit first.</Step>
            </ol>
            <p className="mt-4 text-body-sm text-on-surface-variant">Not in the share list? Remove the app and install it again so Android picks up the new option.</p>
          </>
        )}
      </div>

      {/* Learned note codes */}
      <div className="card-tint-primary rounded-3xl p-6 lg:p-8">
        <h3 className="text-body-lg font-bold text-on-surface flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-on-surface-variant">sell</span>
          Note codes
        </h3>
        <p className="text-body-sm text-on-surface-variant mb-4">
          Short notes are matched to category names automatically (<Kbd>fod</Kbd> → Food). When you correct one, it's remembered here on this device.
        </p>
        {Object.keys(codes).length === 0 ? (
          <p className="text-body-sm text-on-surface-variant/70">Nothing learned yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(codes).map(([key, cat]) => (
              <span key={key} className="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-white/10 text-body-sm text-on-surface">
                <span className="font-semibold">{key}</span>
                <span className="text-on-surface-variant">→ {cat}</span>
                <button type="button" onClick={() => removeCode(key)} className="w-6 h-6 rounded-full hover:bg-white/15 flex items-center justify-center" aria-label={`Forget ${key}`}>
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
