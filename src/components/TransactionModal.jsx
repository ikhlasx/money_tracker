import React from 'react'

export default function TransactionModal({ isOpen, onClose, category, type, transactions }) {
  if (!isOpen) return null

  const iconName = type === 'Income' ? 'trending_up' : 'trending_down'
  const colorClass = type === 'Income' ? 'text-[#009668]' : 'text-error'

  return (
    <div className="fixed inset-0 bg-scrim/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card-tint-primary w-full max-w-lg max-h-[80vh] flex flex-col rounded-3xl shadow-xl overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${type === 'Income' ? 'bg-[#009668]/10' : 'bg-error-container'}`}>
              <span className={`material-symbols-outlined text-[24px] ${type === 'Income' ? 'text-[#005236]' : 'text-on-error-container'}`}>
                {iconName}
              </span>
            </div>
            <div>
              <h3 className="text-headline-sm font-headline-sm text-primary m-0">{category}</h3>
              <p className="text-body-sm text-on-surface-variant m-0 mt-1">History of {type}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* List */}
        <div className="p-6 overflow-y-auto no-scrollbar flex flex-col gap-4">
          {transactions.length === 0 ? (
            <p className="text-on-surface-variant text-center py-8">No transactions found.</p>
          ) : (
            transactions.map(txn => (
              <div key={txn.id} className="flex justify-between items-center p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:border-outline-variant/40 transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-body-lg font-bold text-on-surface">{txn.desc || txn.category}</span>
                  <span className="text-body-sm text-on-surface-variant">
                    {new Date(txn.txn_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {txn.bank || 'Cash'}
                  </span>
                </div>
                <span className={`text-body-lg font-bold ${colorClass}`}>
                  ₹{Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
