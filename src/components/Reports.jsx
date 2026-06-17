import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import TransactionModal from './TransactionModal'

/* Cycle through gradient colours for category cards */
const CARD_COLORS = [
  { card: 'glass-violet', icon: 'text-violet-300', label: 'text-violet-300/70', value: 'text-violet-100' },
  { card: 'glass-cyan',   icon: 'text-cyan-300',   label: 'text-cyan-300/70',   value: 'text-cyan-100'   },
  { card: 'glass-pink',   icon: 'text-pink-300',   label: 'text-pink-300/70',   value: 'text-pink-100'   },
  { card: 'glass-amber',  icon: 'text-amber-300',  label: 'text-amber-300/70',  value: 'text-amber-100'  },
  { card: 'glass-green',  icon: 'text-emerald-300',label: 'text-emerald-300/70',value: 'text-emerald-100'},
  { card: 'glass-blue',   icon: 'text-blue-300',   label: 'text-blue-300/70',   value: 'text-blue-100'   },
  { card: 'glass-orange', icon: 'text-orange-300', label: 'text-orange-300/70', value: 'text-orange-100' },
  { card: 'glass-red',    icon: 'text-red-300',    label: 'text-red-300/70',    value: 'text-red-100'    },
]

export default function Reports({ transactions }) {
  const [categories, setCategories] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear())

  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [modalCategory, setModalCategory] = useState('')
  const [modalType, setModalType]       = useState('Income')

  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('name, monthly_budget')
      if (error) {
        const fallback = await supabase.from('categories').select('name')
        if (!fallback.error) setCategories(fallback.data.map(c => ({ ...c, monthly_budget: 0 })))
      } else {
        setCategories(data)
      }
    } catch (err) {
      console.error('Error fetching categories for reports:', err)
    }
  }

  const expenses = useMemo(() => transactions.filter(t => t.type === 'Expense'), [transactions])

  const monthlyExpensesByCategory = useMemo(() => {
    const totals = {}
    expenses
      .filter(t => { const d = new Date(t.txn_date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
      .forEach(t => { totals[t.category] = (totals[t.category] || 0) + Number(t.amount) })
    return totals
  }, [expenses, selectedMonth, selectedYear])

  const yearlyExpensesByCategory = useMemo(() => {
    const totals = {}
    expenses
      .filter(t => new Date(t.txn_date).getFullYear() === selectedYear)
      .forEach(t => { totals[t.category] = (totals[t.category] || 0) + Number(t.amount) })
    return totals
  }, [expenses, selectedYear])

  const topExpenses = useMemo(() => {
    return [...expenses]
      .filter(t => { const d = new Date(t.txn_date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
  }, [expenses, selectedMonth, selectedYear])

  const allTimeStatsByCategory = useMemo(() => {
    const stats = {}
    transactions.forEach(t => {
      if (t.type !== 'Income' && t.type !== 'Expense') return
      if (!stats[t.category]) stats[t.category] = { Income: 0, Expense: 0 }
      stats[t.category][t.type] += Number(t.amount)
    })
    return stats
  }, [transactions])

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const years  = Array.from(new Set(transactions.map(t => new Date(t.txn_date).getFullYear()))).sort((a, b) => b - a)
  if (years.length === 0) years.push(new Date().getFullYear())

  const handleOpenModal = (category, type) => {
    setModalCategory(category); setModalType(type); setIsModalOpen(true)
  }

  const modalTransactions = useMemo(() => {
    if (!isModalOpen) return []
    if (modalType === 'Debt History') {
      return transactions
        .filter(t => (t.type === 'Money to Get' || t.type === 'Debt Cleared') && t.category === modalCategory)
        .sort((a, b) => new Date(b.txn_date) - new Date(a.txn_date))
    }
    return transactions
      .filter(t => t.category === modalCategory && t.type === modalType)
      .sort((a, b) => new Date(b.txn_date) - new Date(a.txn_date))
  }, [isModalOpen, modalCategory, modalType, transactions])

  const getIconForCategory = (category) => {
    const cat = category?.toLowerCase() || ''
    if (cat.includes('food') || cat.includes('grocery')) return 'restaurant'
    if (cat.includes('transport') || cat.includes('fuel')) return 'local_gas_station'
    if (cat.includes('shop')) return 'shopping_bag'
    if (cat.includes('bill') || cat.includes('utilit')) return 'receipt_long'
    if (cat.includes('health') || cat.includes('medic')) return 'medical_services'
    if (cat.includes('entert')) return 'movie'
    return 'category'
  }

  const dropdownArrow = "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjYzRjN2M4IiBkPSJNNyAxMGw1IDUgNS01eiIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_12px_center]"

  const handleExportCSV = () => {
    const headers = ['Category', 'Income', 'Spent', 'Net'];
    const rows = Object.entries(allTimeStatsByCategory)
      .sort((a, b) => (b[1].Expense + b[1].Income) - (a[1].Expense + a[1].Income))
      .map(([catName, stats]) => [
        `"${catName}"`,
        stats.Income,
        stats.Expense,
        stats.Income - stats.Expense
      ].join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `All_Time_Overview_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCategoryCSV = (catName, stats) => {
    const catTransactions = transactions
      .filter(t => t.category === catName && (t.type === 'Income' || t.type === 'Expense'))
      .sort((a, b) => new Date(b.txn_date) - new Date(a.txn_date));

    const headers = ['Date', 'Description', 'Type', 'Amount'];
    const rows = catTransactions.map(t => [
      `"${new Date(t.txn_date).toLocaleDateString()}"`,
      `"${(t.desc || '').replace(/"/g, '""')}"`,
      `"${t.type}"`,
      t.amount
    ].join(','));

    rows.push('');
    rows.push(`"Total Income",,,${stats.Income}`);
    rows.push(`"Total Spent",,,${stats.Expense}`);
    rows.push(`"Net",,,${stats.Income - stats.Expense}`);

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${catName}_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Filter controls — violet glass */}
      <div className="glass-violet rounded-[32px] p-6 flex flex-wrap gap-4 items-center">
        <div className="w-11 h-11 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">calendar_month</span>
        </div>
        <h3 className="text-headline-md font-headline-md text-on-surface mr-auto">Report Filters</h3>

        <select
          className={`input-field rounded-2xl px-4 py-3 text-body-lg text-on-surface appearance-none ${dropdownArrow}`}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
        >
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>

        <select
          className={`input-field rounded-2xl px-4 py-3 text-body-lg text-on-surface appearance-none ${dropdownArrow}`}
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Report — amber glass */}
        <div className="glass-amber rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-amber-300">bar_chart</span>
            <h3 className="text-headline-md font-headline-md text-on-surface">Monthly Report ({months[selectedMonth]})</h3>
          </div>

          {Object.keys(monthlyExpensesByCategory).length === 0 ? (
            <p className="text-on-surface-variant py-4 text-center">No expenses this month.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(monthlyExpensesByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([catName, amount]) => {
                  const catData = categories.find(c => c.name === catName)
                  const budget  = catData?.monthly_budget || 0
                  const isOver  = budget > 0 && amount > budget
                  const pct     = budget > 0 ? Math.min((amount / budget) * 100, 100) : 0

                  return (
                    <div key={catName} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-body-lg font-bold text-on-surface flex items-center gap-2">
                          {catName}
                          {isOver && <span className="material-symbols-outlined text-red-400 text-[16px]" title="Over Budget">warning</span>}
                        </span>
                        <span className={`font-bold ${isOver ? 'text-red-400' : 'text-amber-200'}`}>
                          ₹{amount.toLocaleString()}
                          {budget > 0 && <span className="text-body-sm text-on-surface-variant ml-1">/ ₹{budget}</span>}
                        </span>
                      </div>
                      {budget > 0 && (
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 progress-bar-glow ${isOver ? 'bg-red-400' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Top Expenses — red glass */}
        <div className="glass-red rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-red-300">emoji_events</span>
            <h3 className="text-headline-md font-headline-md text-on-surface">Top Expenses ({months[selectedMonth]})</h3>
          </div>

          {topExpenses.length === 0 ? (
            <p className="text-on-surface-variant py-4 text-center">No expenses to show.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topExpenses.map((txn, idx) => (
                <div key={txn.id || idx} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm font-bold text-red-300/60 w-5">#{idx + 1}</span>
                    <div className="flex flex-col">
                      <span className="text-body-lg font-bold text-on-surface">{txn.desc || txn.category}</span>
                      <span className="text-body-sm text-on-surface-variant">{txn.category} • {new Date(txn.txn_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="text-red-300 font-bold text-body-lg">
                    ₹{Number(txn.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Yearly Report — green glass */}
      <div className="glass-green rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-emerald-300">trending_up</span>
          <h3 className="text-headline-md font-headline-md text-on-surface">Yearly Report ({selectedYear})</h3>
        </div>

        {Object.keys(yearlyExpensesByCategory).length === 0 ? (
          <p className="text-on-surface-variant py-4 text-center">No expenses this year.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(yearlyExpensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([catName, amount], idx) => {
                const c = CARD_COLORS[idx % CARD_COLORS.length]
                return (
                  <div key={catName} className={`${c.card} flex flex-col p-5 rounded-2xl`}>
                    <span className={`text-body-sm mb-1 ${c.label}`}>{catName}</span>
                    <span className={`text-2xl font-bold ${c.value}`}>₹{amount.toLocaleString()}</span>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* All-Time Overview — cyan glass */}
      <div className="glass-cyan rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-cyan-300">pie_chart</span>
          <h3 className="text-headline-md font-headline-md text-on-surface mr-auto">All-Time Overview by Category</h3>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
            title="Export to Excel (CSV)"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span className="text-body-sm font-bold hidden sm:inline">Export</span>
          </button>
        </div>

        {Object.keys(allTimeStatsByCategory).length === 0 ? (
          <p className="text-on-surface-variant py-4 text-center">No transactions found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(allTimeStatsByCategory)
              .sort((a, b) => (b[1].Expense + b[1].Income) - (a[1].Expense + a[1].Income))
              .map(([catName, stats], idx) => {
                const icon = getIconForCategory(catName)
                const c    = CARD_COLORS[idx % CARD_COLORS.length]
                return (
                  <div key={catName} className={`${c.card} p-6 rounded-2xl flex flex-col gap-4`}>
                    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                      <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 ${c.icon}`}>
                        <span className="material-symbols-outlined">{icon}</span>
                      </div>
                      <h4 className="text-body-lg font-bold text-on-surface mr-auto">{catName}</h4>
                      <button
                        onClick={() => handleExportCategoryCSV(catName, stats)}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 transition-colors cursor-pointer"
                        title={`Export ${catName} transactions`}
                      >
                        <span className="material-symbols-outlined text-[18px] text-white/70 hover:text-white">download</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => handleOpenModal(catName, 'Income')}
                        className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl cursor-pointer transition-colors hover:bg-emerald-500/20"
                      >
                        <span className="text-emerald-300 flex items-center gap-2 text-body-sm font-bold">
                          <span className="material-symbols-outlined text-[18px]">trending_up</span> Income
                        </span>
                        <span className="text-emerald-300 font-bold">₹{stats.Income.toLocaleString()}</span>
                      </button>

                      <button
                        onClick={() => handleOpenModal(catName, 'Expense')}
                        className="flex justify-between items-center bg-red-500/10 border border-red-500/20 p-4 rounded-xl cursor-pointer transition-colors hover:bg-red-500/20"
                      >
                        <span className="text-red-300 flex items-center gap-2 text-body-sm font-bold">
                          <span className="material-symbols-outlined text-[18px]">trending_down</span> Spent
                        </span>
                        <span className="text-red-300 font-bold">₹{stats.Expense.toLocaleString()}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Active Debts Tracker — blue glass */}
      <div className="glass-blue rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-blue-300">payments</span>
          <h3 className="text-headline-md font-headline-md text-on-surface">Active Debts Tracker</h3>
        </div>

        {(() => {
          const debts = {}
          transactions.forEach(t => {
            if (t.type === 'Money to Get' || t.type === 'Debt Cleared') {
              const person = t.category || 'Unknown'
              if (!debts[person]) debts[person] = { lent: 0, repaid: 0 }
              if (t.type === 'Money to Get') {
                debts[person].lent += Number(t.amount)
              } else if (t.type === 'Debt Cleared') {
                debts[person].repaid += Number(t.amount)
              }
            }
          })
          
          // Show all persons who have any history, sorted by remaining balance
          const allDebts = Object.entries(debts)
            .map(([person, data]) => ({ person, lent: data.lent, repaid: data.repaid, balance: data.lent - data.repaid }))
            .sort((a, b) => b.balance - a.balance)

          if (allDebts.length === 0) {
            return <p className="text-on-surface-variant py-4 text-center">No debts or history found.</p>
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDebts.map(({ person, lent, repaid, balance }) => (
                <button 
                  key={person} 
                  onClick={() => handleOpenModal(person, 'Debt History')}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/10 transition-colors text-left cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-300">person</span>
                      </div>
                      <span className="text-body-lg font-bold text-on-surface truncate max-w-[120px]">{person}</span>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px] opacity-50">open_in_new</span>
                  </div>

                  <div className="flex justify-between items-end mt-2 pt-3 border-t border-white/10">
                    <div className="flex flex-col gap-1">
                      <span className="text-label-caps text-on-surface-variant flex gap-1">
                        <span className="text-red-300">Lent: ₹{lent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </span>
                      <span className="text-label-caps text-on-surface-variant flex gap-1">
                        <span className="text-emerald-300">Repaid: ₹{repaid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-label-caps text-on-surface-variant block mb-0.5">{balance === 0 ? 'SETTLED' : 'STILL OWES'}</span>
                      <span className={`text-xl font-bold ${balance === 0 ? 'text-emerald-300' : 'text-blue-300'}`}>
                        ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        })()}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={modalCategory}
        type={modalType}
        transactions={modalTransactions}
      />
    </div>
  )
}
