import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { recognizeScreenshot } from '../lib/ocr'
import { parseGpay, matchCard, matchCategory, matchFromHistory, findDuplicate, norm } from '../lib/gpayParser'

const DEFAULT_CARDS = ['Cash', 'IOB', 'FED', 'Other']
const SHORTCUTS_KEY = 'gpay-note-shortcuts'
const AUTO_SAVE_SECONDS = 4

const loadShortcuts = () => {
  try { return JSON.parse(localStorage.getItem(SHORTCUTS_KEY) || '{}') || {} } catch { return {} }
}
const saveShortcut = (note, category) => {
  const key = norm(note).replace(/ /g, '')
  // Only learn short codes like "fod" / "pe", not free-text notes.
  if (!key || key.length > 12 || norm(note).split(' ').length > 2) return
  try {
    const all = loadShortcuts()
    all[key] = category
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(all))
  } catch { /* storage unavailable */ }
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * `files` items are either image Files (scanned on-device) or `{ text }` objects
 * with already-recognised text (from the iPhone Shortcut, which uses Apple's Live Text).
 */
export default function ScreenshotImport({ files, transactions, onClose, onSaved }) {
  const [index, setIndex] = useState(0)
  const [categories, setCategories] = useState(null)
  const [cards, setCards] = useState(null)
  const [phase, setPhase] = useState('reading') // reading | review | saving | error
  const [progress, setProgress] = useState({ label: 'Preparing…', pct: 0 })
  const [form, setForm] = useState(null)
  const [info, setInfo] = useState(null) // { note, categorySource, warnings[], uncertain:Set }
  const [countdown, setCountdown] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const timerRef = useRef(null)
  const txnsRef = useRef(transactions)
  useEffect(() => { txnsRef.current = transactions }, [transactions])

  const file = files[index]
  const isImage = file instanceof Blob
  const total = files.length

  useEffect(() => {
    ;(async () => {
      const [{ data: catData }, cardRes] = await Promise.all([
        supabase.from('categories').select('name'),
        supabase.from('cards').select('name').order('id'),
      ])
      setCategories((catData || []).map((c) => c.name))
      setCards(cardRes.data && cardRes.data.length ? cardRes.data.map((c) => c.name) : DEFAULT_CARDS)
    })()
  }, [])

  useEffect(() => {
    if (!(file instanceof Blob)) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const stopCountdown = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = null
    setCountdown(null)
  }, [])

  // OCR + parse the current screenshot once categories/cards are known.
  useEffect(() => {
    if (!file || !categories || !cards) return
    let cancelled = false
    stopCountdown()
    setPhase('reading')
    setProgress({ label: 'Preparing…', pct: 0 })

    ;(async () => {
      try {
        const ocr = file instanceof Blob
          ? await recognizeScreenshot(file, (m) => {
              if (cancelled) return
              const label = m.status === 'recognizing text' ? 'Reading screenshot…' : 'Loading text reader (first time only)…'
              setProgress({ label, pct: Math.round((m.progress || 0) * 100) })
            })
          : { text: String(file.text || ''), words: [] }
        if (cancelled) return
        const p = parseGpay(ocr)
        const uncertain = new Set()
        const warnings = []

        if (p.shareText) {
          warnings.push("GPay's Share button only sends the amount and payee — no note, date or bank. For those, share a screenshot of the payment instead.")
        } else if (!p.isGpay) warnings.push("This doesn't look like a Google Pay payment screen — check every field.")
        if (p.status && !/completed|successful/i.test(p.status)) warnings.push(`Payment status is "${p.status}".`)

        const amount = p.amount
        if (!amount) { uncertain.add('amount'); warnings.push("Couldn't read the amount.") }
        else if (!p.amountConfident) uncertain.add('amount')

        if (!p.txn_date) uncertain.add('txn_date')

        let cat = matchCategory(p.note, categories, loadShortcuts())
        if (!cat) cat = matchFromHistory(p.payee, txnsRef.current, categories)
        if (!cat || cat.ambiguous) uncertain.add('category')

        const bank = matchCard(p.bankName, cards)
        if (!bank) uncertain.add('bank')

        // Keep the note in the description unless it was used as the category code.
        const noteUsed = cat && (cat.source === 'note' || cat.source === 'shortcut')
        const desc = [p.payee, !noteUsed && p.note ? p.note : ''].filter(Boolean).join(' · ')

        const draft = {
          type: p.type,
          amount: amount ? String(amount) : '',
          category: cat?.category || '',
          txn_date: p.txn_date || today(),
          bank: bank || cards[0] || 'Cash',
          desc,
        }
        if (findDuplicate({ ...draft, amount, payee: p.payee }, txnsRef.current)) {
          warnings.push('A matching transaction (same date, amount and payee) is already logged.')
          uncertain.add('duplicate')
        }

        setForm(draft)
        setInfo({ note: p.note, bankName: p.bankName, categorySource: cat?.source || null, warnings, uncertain })
        setPhase('review')

        // Text arriving through a link always waits for a tap, so a crafted
        // link can never log a transaction on its own.
        if (file instanceof Blob && uncertain.size === 0 && warnings.length === 0) {
          setCountdown(AUTO_SAVE_SECONDS)
          timerRef.current = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Screenshot import failed', err)
        setErrorMsg(err?.message || 'Could not read the screenshot.')
        setPhase('error')
      }
    })()

    return () => { cancelled = true }
  }, [file, categories, cards, stopCountdown])

  useEffect(() => () => clearInterval(timerRef.current), [])

  const next = useCallback(() => {
    stopCountdown()
    if (index + 1 < total) setIndex(index + 1)
    else onClose()
  }, [index, total, onClose, stopCountdown])

  const save = useCallback(async () => {
    if (!form || phase === 'saving') return
    stopCountdown()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { alert('Enter a valid amount.'); return }
    if (!form.category) { alert('Choose a category.'); return }
    setPhase('saving')
    try {
      const { data, error } = await supabase.from('transactions').insert([{ ...form, amount }]).select().single()
      if (error) throw error
      if (info?.note && form.category) saveShortcut(info.note, form.category)
      onSaved?.(data)
      next()
    } catch (err) {
      console.error('Error saving transaction', err)
      alert('Error saving transaction: ' + err.message)
      setPhase('review')
    }
  }, [form, phase, info, onSaved, next, stopCountdown])

  useEffect(() => {
    if (countdown === 0) save()
  }, [countdown, save])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const flag = (key) => (info?.uncertain.has(key) ? 'ring-2 ring-amber-400/70' : '')

  const dropdownArrow = "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjYzRjN2M4IiBkPSJNNyAxMGw1IDUgNS01eiIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_12px_center]"
  const field = 'input-field rounded-2xl px-4 py-3 text-body-lg text-on-surface w-full'

  const sourceLabel = {
    note: `from note "${info?.note}"`,
    shortcut: `remembered for "${info?.note}"`,
    history: 'used last time for this payee',
  }[info?.categorySource]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in">
      <div
        className="card-tint-primary bg-surface-container-lowest w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden"
        onPointerDownCapture={() => countdown !== null && stopCountdown()}
        onKeyDownCapture={() => countdown !== null && stopCountdown()}
      >
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">document_scanner</span>
            <div>
              <h3 className="text-body-lg font-bold text-on-surface m-0">Import payment</h3>
              {total > 1
                ? <p className="text-body-sm text-on-surface-variant m-0">Screenshot {index + 1} of {total}</p>
                : !isImage && <p className="text-body-sm text-on-surface-variant m-0">Read by iPhone — check and save</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-white/10" aria-label="Close">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            {previewUrl && (
              <img src={previewUrl} alt="Shared screenshot" className="w-20 rounded-xl border border-white/10 object-cover object-top max-h-40 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              {phase === 'reading' && (
                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-body-sm text-on-surface-variant">{progress.label}</p>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
                  </div>
                </div>
              )}
              {phase === 'error' && (
                <p className="text-body-sm text-red-300 pt-2">{errorMsg}</p>
              )}
              {(phase === 'review' || phase === 'saving') && form && (
                <div className="pt-1">
                  <p className="text-2xl font-bold text-on-surface">₹{Number(form.amount || 0).toLocaleString()}</p>
                  <p className="text-body-sm text-on-surface-variant truncate">{form.desc || 'Unknown payee'}</p>
                  {info?.note && (
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      Note: <span className="text-on-surface font-semibold">{info.note}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {info?.warnings.length > 0 && phase !== 'reading' && (
            <div className="flex flex-col gap-1 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              {info.warnings.map((w) => (
                <p key={w} className="text-body-sm text-amber-200 flex gap-2">
                  <span className="material-symbols-outlined text-[16px] mt-0.5">warning</span>{w}
                </p>
              ))}
            </div>
          )}

          {(phase === 'review' || phase === 'saving') && form && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-label-caps text-on-surface-variant ml-1">Type</span>
                <select className={`${field} appearance-none ${dropdownArrow}`} value={form.type} onChange={set('type')}>
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                  <option value="Money to Get">Money to Get</option>
                  <option value="Debt Cleared">Debt Cleared</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-caps text-on-surface-variant ml-1">Amount (₹)</span>
                <input type="number" step="0.01" min="0" inputMode="decimal" className={`${field} ${flag('amount')}`} value={form.amount} onChange={set('amount')} />
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-label-caps text-on-surface-variant ml-1">
                  Category {sourceLabel && <span className="normal-case tracking-normal font-normal opacity-70">· {sourceLabel}</span>}
                </span>
                <select className={`${field} appearance-none ${dropdownArrow} ${flag('category')}`} value={form.category} onChange={set('category')}>
                  {!form.category && <option value="" disabled>Choose category…</option>}
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-caps text-on-surface-variant ml-1">Date</span>
                <input type="date" className={`${field} ${flag('txn_date')}`} value={form.txn_date} onChange={set('txn_date')} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-caps text-on-surface-variant ml-1">Account</span>
                <select className={`${field} appearance-none ${dropdownArrow} ${flag('bank')}`} value={form.bank} onChange={set('bank')}>
                  {cards.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-label-caps text-on-surface-variant ml-1">Description</span>
                <input type="text" className={field} value={form.desc} onChange={set('desc')} />
              </label>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0">
          {total > 1 && (
            <button type="button" onClick={next} className="px-5 py-3.5 rounded-full font-bold text-on-surface-variant border border-white/10 hover:bg-white/10">
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={phase !== 'review'}
            className="flex-1 bg-emerald-500/80 hover:bg-emerald-500 disabled:opacity-40 text-white px-6 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
          >
            <span className={`material-symbols-outlined ${phase === 'saving' ? 'animate-spin' : ''}`}>
              {phase === 'saving' ? 'refresh' : 'check'}
            </span>
            {phase === 'saving' ? 'Saving…' : countdown !== null ? `Saving in ${countdown}… (tap to edit)` : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
