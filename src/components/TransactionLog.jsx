import { supabase } from '../supabaseClient'

export default function TransactionLog({ transactions, fetchTransactions, setEditData }) {

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      fetchTransactions()
    } catch (error) {
      console.error('Error deleting transaction', error)
      alert('Error deleting: ' + error.message)
    }
  }

  const getIconForCategory = (category, type) => {
    if (type === 'Income') return 'payments'
    if (type === 'Money to Get') return 'trending_up'
    const cat = category?.toLowerCase() || ''
    if (cat.includes('food') || cat.includes('grocery')) return 'restaurant'
    if (cat.includes('transport') || cat.includes('fuel')) return 'local_gas_station'
    if (cat.includes('shop')) return 'shopping_bag'
    if (cat.includes('bill') || cat.includes('utilit')) return 'receipt_long'
    if (cat.includes('health') || cat.includes('medic')) return 'medical_services'
    if (cat.includes('entert')) return 'movie'
    if (type === 'Debt Cleared') return 'task_alt'
    return 'account_balance_wallet'
  }

  return (
    <div className="card-tint-primary rounded-3xl p-6 lg:p-8 flex flex-col lg:min-h-[600px]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">list_alt</span>
          Recent Transactions
        </h2>
      </div>

      <div className="overflow-y-auto no-scrollbar flex-1 -mx-6 px-6">
        {transactions.length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">No transactions found.</p>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {transactions.map(t => {
              const isIncome = t.type === 'Income'
              const isMTG    = t.type === 'Money to Get'
              const isDebtCleared = t.type === 'Debt Cleared'
              
              const amountColor = (isIncome || isDebtCleared) ? 'text-emerald-400' : isMTG ? 'text-blue-400' : 'text-red-400'
              const sign        = (isIncome || isDebtCleared) ? '+' : isMTG ? '' : '-'
              const icon        = getIconForCategory(t.category, t.type)

              const iconBg = (isIncome || isDebtCleared)
                ? 'bg-emerald-500/10 text-emerald-400'
                : isMTG
                ? 'bg-blue-500/10 text-blue-400'
                : 'bg-red-500/10 text-red-400'

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <div>
                      <h3 className="text-body-lg font-bold text-on-surface">{t.category}</h3>
                      <p className="text-body-sm text-on-surface-variant flex gap-2">
                        <span>{t.type}</span>•<span>{t.bank || 'Cash'}</span>
                      </p>
                      {t.desc && (
                        <p className="text-label-caps text-outline mt-0.5 truncate max-w-[150px] sm:max-w-xs">{t.desc}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2 sm:gap-4">
                    <div>
                      <p className={`text-body-lg font-bold ${amountColor}`}>
                        {sign}₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {new Date(t.txn_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity flex flex-col sm:flex-row gap-1">
                      <button
                        onClick={() => setEditData(t)}
                        className="p-2 text-on-surface-variant hover:text-amber-400 hover:bg-amber-500/10 rounded-full transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
