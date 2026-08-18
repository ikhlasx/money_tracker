export default function CardDetailModal({ isOpen, onClose, cardName, periodLabel, balance, transactions }) {
  if (!isOpen) return null

  const periodNet = transactions.reduce((sum, t) => {
    const amt = Number(t.amount)
    if (t.type === 'Income' || t.type === 'Debt Cleared') return sum + amt
    if (t.type === 'Expense' || t.type === 'Money to Get') return sum - amt
    return sum
  }, 0)

  return (
    <div className="fixed inset-0 bg-scrim/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card-tint-primary w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl shadow-xl overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-cyan-500/10">
              <span className="material-symbols-outlined text-[24px] text-cyan-300">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="text-headline-sm font-headline-sm text-primary m-0">{cardName}</h3>
              <p className="text-body-sm text-on-surface-variant m-0 mt-1">{periodLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Balance summary */}
        <div className="px-6 py-4 border-b border-outline-variant/20 shrink-0 flex items-center justify-between gap-4">
          <div>
            <p className="text-label-caps text-on-surface-variant mb-1">Current Balance</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
              ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-label-caps text-on-surface-variant mb-1">Net for Period</p>
            <p className={`text-xl font-bold ${periodNet >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
              {periodNet >= 0 ? '+' : ''}₹{periodNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* List */}
        <div className="p-6 overflow-y-auto no-scrollbar flex flex-col gap-4">
          {transactions.length === 0 ? (
            <p className="text-on-surface-variant text-center py-8">No transactions on this card for the selected period.</p>
          ) : (
            transactions.map(txn => {
              const isCredit = txn.type === 'Income' || txn.type === 'Debt Cleared'
              const itemColorClass = isCredit ? 'text-emerald-400' : 'text-red-400'
              const sign = isCredit ? '+' : '-'

              return (
                <div key={txn.id} className="flex justify-between items-center p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:border-outline-variant/40 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="text-body-lg font-bold text-on-surface">{txn.desc || txn.category}</span>
                    <span className="text-body-sm text-on-surface-variant">
                      {new Date(txn.txn_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {txn.type}
                    </span>
                  </div>
                  <span className={`text-body-lg font-bold ${itemColorClass}`}>
                    {sign}₹{Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
