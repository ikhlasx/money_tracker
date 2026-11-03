// Parses OCR output of a Google Pay "transaction details" screenshot into a
// transaction draft, and maps the payment note (e.g. "fod", "pe") to a category.

const STOPWORDS = new Set(['of', 'the', 'and', '&'])

export const norm = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const compact = (s) => norm(s).replace(/ /g, '')

const toNumber = (s) => {
  if (!s) return null
  const n = parseFloat(String(s).replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

const digitsOnly = (s) => String(s || '').replace(/[^\d.]/g, '')

/**
 * The big hero amount ("₹38") is the tallest number on screen. GPay draws the ₹
 * smaller than the digits, and OCR often misreads it as "3", "2" or "¥", so a
 * leading glyph that is noticeably shorter than the digits, or isn't a digit,
 * gets dropped.
 */
function heroAmountFromWords(words) {
  let best = null
  for (const w of words) {
    if (!/^\D?[\d,]+(\.\d{1,2})?$/.test(w.text) || !/\d/.test(w.text)) continue
    const syms = w.symbols?.length === w.text.length ? w.symbols : null
    const heights = syms ? syms.map((s) => s.bbox.y1 - s.bbox.y0) : [w.bbox.y1 - w.bbox.y0]
    const maxH = Math.max(...heights)
    if (!best || maxH > best.height) best = { word: w, syms, heights, height: maxH }
  }
  if (!best) return null
  let text = best.word.text
  if (/^\D/.test(text)) {
    text = text.slice(1)
  } else if (best.syms && text.length > 1) {
    const rest = best.heights.slice(1)
    const restMax = Math.max(...rest)
    if (best.heights[0] < restMax * 0.8) text = text.slice(1)
  }
  // Ignore tiny text (e.g. a date like "29") — the hero amount is much bigger than body text.
  const bodyHeights = words.filter((w) => w !== best.word).map((w) => w.bbox.y1 - w.bbox.y0).sort((a, b) => a - b)
  const median = bodyHeights[Math.floor(bodyHeights.length / 2)] || 0
  if (median && best.height < median * 1.8) return null
  return toNumber(text)
}

function amountFromSentence(lines) {
  for (const l of lines) {
    const m = l.match(/(?:payment of|paid|received|sent)\s+(\S+)/i)
    if (m && /\d/.test(m[1])) {
      const raw = m[1].replace(/[^\d.,]+$/, '')
      // Leading non-digit = misread ₹; keep both readings for reconciliation.
      const stripped = raw.replace(/^\D+/, '')
      return { raw: digitsOnly(raw), value: toNumber(stripped), hadSymbol: /^\D/.test(raw) }
    }
  }
  return null
}

function reconcileAmount(hero, sentence) {
  if (hero && sentence?.value) {
    const h = digitsOnly(String(hero))
    const s = digitsOnly(sentence.raw)
    if (sentence.value === hero) return { amount: hero, confident: true }
    // "₹38" misread as "338" → sentence has one extra leading digit.
    if (s.length === h.length + 1 && s.endsWith(h)) return { amount: hero, confident: true }
    return { amount: hero, confident: false }
  }
  if (hero) return { amount: hero, confident: false }
  if (sentence?.value) return { amount: sentence.hadSymbol ? sentence.value : sentence.value, confident: false }
  return { amount: null, confident: false }
}

// OCR swaps look-alike characters in month names: "0ct", "N0v", "Ju1", "JuI",
// "5ept", "Fe8", "Au9". Map them back before looking the month up.
const OCR_LETTER = { 0: 'o', 1: 'l', '|': 'l', 5: 's', 8: 'b', 9: 'g', 6: 'g' }
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const monthNum = (word) => {
  let w = String(word).toLowerCase().replace(/[0158|69]/g, (c) => OCR_LETTER[c])
  if (/^ju[il]/.test(w)) w = 'jul' + w.slice(3) // "JuI"/"Ju1" → Jul (June is "Jun")
  // Must be the start of a real month name ("sep", "sept", "october"),
  // so words like "Mark" or "Decline" are not taken as months.
  const i = MONTH_NAMES.findIndex((name) => w.length >= 3 && name.startsWith(w))
  return i >= 0 ? i + 1 : null
}

// Digits that OCR turned into letters inside numbers ("2O26", "l5").
const fixDigits = (s) => String(s).replace(/[Oo]/g, '0').replace(/[lI|]/g, '1')

/** A real calendar date as YYYY-MM-DD, or null (rejects 31 Feb, 31 Apr, …). */
const ymd = (year, month, day) => {
  const y = parseInt(fixDigits(year), 10)
  const m = typeof month === 'number' ? month : parseInt(fixDigits(month), 10)
  const d = parseInt(fixDigits(day), 10)
  if (!m || m < 1 || m > 12 || !d || d < 1 || y < 2000 || y > 2100) return null
  const check = new Date(Date.UTC(y, m - 1, d))
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const localYmd = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const DAY = '([0-3Oo]?[0-9Oo]|[0-9])'
const MON = '([A-Za-z05][A-Za-z0158|69]{2,8})'
const YEAR = '((?:19|20|2O)[0-9Oo]{2})'

export function parseDate(text, now = new Date()) {
  const t = String(text)
  const patterns = [
    // 29 Sept 2026 · 3 Oct 2026 · 03 0ct, 2026 · 3rd October 2026 · 3-Oct-2026
    [new RegExp(`\\b${DAY}(?:st|nd|rd|th)?[\\s.\\-/]+${MON}\\.?,?[\\s.\\-/]+${YEAR}\\b`, 'g'), (m) => ymd(m[3], monthNum(m[2]), m[1])],
    // Oct 3, 2026 · October 03 2026
    [new RegExp(`\\b${MON}\\.?\\s+${DAY}(?:st|nd|rd|th)?,?\\s+${YEAR}\\b`, 'g'), (m) => ymd(m[3], monthNum(m[1]), m[2])],
    // 03/10/2026 · 3-10-2026 · 03.10.2026 (day first, Indian format)
    [/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g, (m) => ymd(m[3], m[2], m[1])],
    // 2026-10-03
    [/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (m) => ymd(m[1], m[2], m[3])],
  ]
  for (const [re, build] of patterns) {
    for (const m of t.matchAll(re)) {
      const d = build(m)
      if (d) return d
    }
  }
  // Recent payments can show "Today, 12:40 pm" / "Yesterday" instead of a date.
  if (/\btoday\b/i.test(t)) return localYmd(now)
  if (/\byesterday\b/i.test(t)) {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return localYmd(y)
  }
  // Day and month without a year ("3 Oct, 12:40 pm"): use the most recent such date.
  const short = t.match(new RegExp(`\\b${DAY}(?:st|nd|rd|th)?\\s+${MON}\\b\\.?,?(?!\\s*(?:19|20|2O)[0-9Oo]{2})`))
  if (short) {
    const m = monthNum(short[2])
    if (m) {
      let d = ymd(now.getFullYear(), m, short[1])
      if (d && d > localYmd(now)) d = ymd(now.getFullYear() - 1, m, short[1])
      if (d) return d
    }
  }
  return null
}

/** Matches an OCR'd bank name ("Federal Bank") to one of the user's card names ("FED"). */
export function matchCard(bankName, cards) {
  const b = norm(bankName)
  if (!b) return null
  const words = b.split(' ').filter((w) => !STOPWORDS.has(w))
  const initials = words.map((w) => w[0]).join('')
  const initialsNoBank = words.filter((w) => w !== 'bank').map((w) => w[0]).join('')
  const flat = words.join('')
  for (const card of cards) {
    const c = compact(card)
    if (!c || c === 'cash' || c === 'other') continue
    if (flat.includes(c) || c === initials || c === initialsNoBank) return card
    if (words.some((w) => w.length >= 3 && w !== 'bank' && c.includes(w))) return card
  }
  return null
}

const isSubsequence = (needle, hay) => {
  let i = 0
  for (const ch of hay) if (ch === needle[i]) i++
  return i === needle.length
}

/**
 * Maps a short note ("fod", "pe") to a category. Order: learned shortcut →
 * exact → prefix → abbreviation (letters in order, same first letter).
 */
// Fixed note codes. Each maps to the first of your categories whose name
// matches one of the targets (in order), so "pe" finds "Petrol", or "Fuel"
// if you have no Petrol category.
export const BUILTIN_CODES = {
  pe: ['petrol', 'fuel'],
  pet: ['petrol', 'fuel'],
  ptl: ['petrol', 'fuel'],
  ptrl: ['petrol', 'fuel'],
  petrl: ['petrol', 'fuel'],
  fod: ['food'],
  fd: ['food'],
}

export function matchCategory(note, categories, shortcuts = {}) {
  const n = compact(note)
  if (!n) return null
  const learned = shortcuts[n]
  if (learned && categories.includes(learned)) return { category: learned, source: 'shortcut', ambiguous: false }

  const cats = categories.map((c) => ({ name: c, key: compact(c) })).filter((c) => c.key)

  for (const target of BUILTIN_CODES[n] || []) {
    const hit = cats.find((c) => c.key === target) || cats.find((c) => c.key.includes(target))
    if (hit) return { category: hit.name, source: 'note', ambiguous: false }
  }
  // A fixed code whose category doesn't exist must not fall through to a
  // look-alike ("pe" → "Personal"); leave it for the user to pick.
  if (BUILTIN_CODES[n]) return null
  const exact = cats.find((c) => c.key === n)
  if (exact) return { category: exact.name, source: 'note', ambiguous: false }

  if (n.length >= 2) {
    const prefix = cats.filter((c) => c.key.startsWith(n) || n.startsWith(c.key))
    if (prefix.length) {
      return { category: prefix[0].name, source: 'note', ambiguous: prefix.length > 1 }
    }
    const abbrev = cats
      .filter((c) => c.key[0] === n[0] && isSubsequence(n, c.key))
      .map((c) => ({ ...c, score: n.length / c.key.length }))
      .sort((a, b) => b.score - a.score)
    if (abbrev.length) {
      const ambiguous = abbrev.length > 1 && abbrev[1].score === abbrev[0].score
      return { category: abbrev[0].name, source: 'note', ambiguous }
    }
  }
  return null
}

/** Category last used for this payee, from transaction history. */
export function matchFromHistory(payee, transactions, categories) {
  const p = norm(payee)
  if (!p) return null
  const hit = transactions.find((t) => norm((t.desc || '').split(' · ')[0]) === p && categories.includes(t.category))
  return hit ? { category: hit.category, source: 'history', ambiguous: false } : null
}

export function findDuplicate(draft, transactions) {
  if (!draft.amount || !draft.txn_date) return null
  const p = norm(draft.payee)
  return (
    transactions.find(
      (t) =>
        (t.txn_date || '').slice(0, 10) === draft.txn_date &&
        Number(t.amount) === Number(draft.amount) &&
        (!p || norm(t.desc).startsWith(p))
    ) || null
  )
}

/** Raw extraction from OCR output — no knowledge of the user's categories/cards. */
export function parseGpay({ text, words = [] }) {
  // GPay's own "Share" button sends one line instead of the screen, e.g.
  // "1790650202 - 38.00 To FARSA HOTEL on Google Pay" — no note, date or bank.
  const share = text.match(/(?:^|\s)(\d{6,})?\s*[-–]?\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s+(to|from)\s+(.+?)\s+(?:on|via|using)\s+google\s*pay/i)
  if (share && !/upi transaction id/i.test(text)) {
    return {
      type: share[3].toLowerCase() === 'from' ? 'Income' : 'Expense',
      payee: share[4].trim(),
      note: '',
      noteCandidates: [],
      amount: toNumber(share[2]),
      amountConfident: true,
      txn_date: parseDate(text),
      bankName: '',
      accountSuffix: '',
      status: '',
      upiId: share[1] || '',
      isGpay: true,
      shareText: true,
    }
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const statusIdx = lines.findIndex((l) => /\b(completed|successful|pending|failed|declined|processing)\b/i.test(l))
  const status = statusIdx >= 0 ? lines[statusIdx].match(/\b(completed|successful|pending|failed|declined|processing)\b/i)[1] : ''
  const headEnd = statusIdx >= 0 ? statusIdx : Math.min(lines.length, 6)

  // Header "To FARSA HOTEL" (paid) or "From X" (received). Not "To:" detail lines.
  let headerIdx = -1
  let type = 'Expense'
  let payee = ''
  for (let i = 0; i < headEnd; i++) {
    const m = lines[i].match(/^\W*(to|from)\s+([^:\s].*)$/i)
    if (m) {
      headerIdx = i
      type = m[1].toLowerCase() === 'from' ? 'Income' : 'Expense'
      payee = m[2].trim()
      break
    }
  }

  // The note sits near the amount, between the header and the date/status.
  // Collect every plausible line; the caller picks the first that maps to a
  // category. Skips the amount (also when ₹ is misread as a letter, "Z38"),
  // the status line, the date, and long sentences.
  const dateIdx = lines.findIndex((l) => parseDate(l))
  const noteEnd = Math.min(lines.length, Math.max(headEnd, dateIdx >= 0 ? dateIdx : 0, headerIdx + 1) + 2, headerIdx + 8)
  const noteCandidates = []
  for (let i = headerIdx + 1; i < noteEnd; i++) {
    const l = lines[i]
    if (i === statusIdx || i === dateIdx) continue
    if (!/[a-z]/i.test(l) || /^\W*[a-z]?\W*[\d,.]+\W*$/i.test(l)) continue
    if (/google pay|transaction|bank|completed|successful|pending|failed/i.test(l)) continue
    const cleaned = l.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '')
    if (cleaned && cleaned.length <= 40) noteCandidates.push(cleaned)
  }
  const note = noteCandidates[0] || ''

  const hero = heroAmountFromWords(words)
  let heroFallback = null
  if (!hero) {
    for (let i = headerIdx + 1; i < headEnd; i++) {
      const m = lines[i].match(/^\D?\s*([\d,]+(?:\.\d{1,2})?)$/)
      if (m) { heroFallback = toNumber(m[1]); break }
    }
  }
  const { amount, confident: amountConfident } = reconcileAmount(hero || heroFallback, amountFromSentence(lines))

  // Own bank: "From: NAME (Federal Bank)" when paying, "To: NAME (Bank)" when receiving.
  let bankName = ''
  const ownSide = type === 'Income' ? 'to' : 'from'
  for (const l of lines) {
    const m = l.match(/^\W*(from|to)\s*:\s*.+?\(([^)]+)\)/i)
    if (m && m[1].toLowerCase() === ownSide) { bankName = m[2].trim(); break }
  }
  if (!bankName) {
    const l = lines.find((x) => /\bbank\b/i.test(x) && !/@|receiver|confirmed|deposit/i.test(x))
    const m = l && l.match(/([A-Za-z][A-Za-z .&]*\bBank)\b/i)
    if (m) bankName = m[1].trim()
  }

  // Masked account/card number under the bank name, e.g. "356137XXXXXXXX67".
  // Lines with "@" are UPI IDs (often the payee's), so they're skipped.
  let accountSuffix = ''
  for (const l of lines) {
    if (l.includes('@')) continue
    const m = l.match(/(?:[x•*]{2,})\s*(\d{2,4})(?!\d)/i)
    if (m) { accountSuffix = m[1]; break }
  }

  const upiIdx = lines.findIndex((l) => /upi transaction id/i.test(l))
  const upiId = upiIdx >= 0 ? (lines.slice(upiIdx, upiIdx + 2).join(' ').match(/\d{8,}/) || [''])[0] : ''

  const isGpay = /google pay|upi transaction id|google transaction id/i.test(text)

  return {
    type,
    payee,
    note,
    noteCandidates,
    amount,
    amountConfident,
    txn_date: parseDate(text),
    bankName,
    accountSuffix,
    status,
    upiId,
    isGpay,
  }
}
