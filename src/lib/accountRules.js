// Which of your accounts a GPay payment came from, decided by the bank name and
// the last digits of the masked number GPay shows under it
// (e.g. "Federal Bank  356137XXXXXXXX67").
// `card` is matched loosely against your account names (Budget Settings → Cards).
export const ACCOUNT_RULES = [
  { bank: 'federal', suffix: '2479', card: 'FED' },
  { bank: 'federal', suffix: '67', card: 'Wavefed' },
]

const compact = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const resolveCard = (name, cards) => {
  const n = compact(name)
  return (
    cards.find((c) => compact(c) === n) ||
    cards.find((c) => compact(c).includes(n)) ||
    null
  )
}

/**
 * Returns { card, known } when a rule applies to this bank, or null when no
 * rule mentions the bank. `known` is false when the rule's account isn't in
 * the user's account list yet.
 */
export function matchAccountRule(bankName, suffix, cards) {
  const bank = compact(bankName)
  const rules = ACCOUNT_RULES.filter((r) => bank && bank.includes(compact(r.bank)))
  if (!rules.length) return null
  const rule = suffix && rules.find((r) => suffix.endsWith(r.suffix) || r.suffix.endsWith(suffix))
  if (!rule) return { card: null, known: false, unmatched: true }
  const card = resolveCard(rule.card, cards)
  return { card: card || rule.card, known: !!card, unmatched: false }
}
