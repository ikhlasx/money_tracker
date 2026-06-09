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
    return 'account_balance_wallet'
  }

  return (
    <div className="card-tint-primary rounded-3xl p-6 lg:p-8 flex flex-col lg:min-h-[600px]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-headline-md font-headline-md text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">list_alt</span>
          Recent Transactions
        </h2>
      </div>
      
      <div className="overflow-y-auto no-scrollbar flex-1 -mx-6 px-6">
        {transactions.length === 0 ? (
          <p className="text-on-surface-variant text-center py-8">No transactions found.</p>
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            {transactions.map(t => {
              const isIncome = t.type === 'Income'
              const isMTG = t.type === 'Money to Get'
              const amountColor = isIncome ? 'text-[#009668]' : (isMTG ? 'text-[#0058be]' : 'text-error')
              const sign = isIncome ? '+' : (isMTG ? '' : '-')
              const icon = getIconForCategory(t.category, t.type)

              let iconBg = 'bg-surface-container-high text-on-surface-variant'
              if (isIncome) iconBg = 'bg-[#009668]/10 text-[#009668]'
              else if (isMTG) iconBg = 'bg-[#0058be]/10 text-[#0058be]'
              else iconBg = 'bg-error/10 text-error'

              return (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-surface-container-lowest transition-colors group cursor-pointer border border-transparent hover:border-outline-variant/30 shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                      <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <div>
                      <h3 className="text-body-lg font-bold text-on-surface">{t.category}</h3>
                      <p className="text-body-sm text-on-surface-variant flex gap-2">
                        <span>{t.type}</span>•<span>{t.bank || 'Cash'}</span>
                      </p>
                      {t.desc && <p className="text-label-caps text-outline mt-1 truncate max-w-[150px] sm:max-w-xs">{t.desc}</p>}
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
                        className="p-2 text-outline hover:text-secondary hover:bg-secondary/10 rounded-full transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-full transition-colors"
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
