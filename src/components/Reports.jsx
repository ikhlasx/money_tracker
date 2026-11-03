import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import TransactionModal from './TransactionModal'
import CardDetailModal from './CardDetailModal'

const DEFAULT_CARDS = ['Cash', 'IOB', 'FED', 'Other']

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
  const [cards, setCards] = useState(DEFAULT_CARDS)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear())

  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [modalCategory, setModalCategory] = useState('')
  const [modalType, setModalType]       = useState('Income')

  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState('')

  useEffect(() => { fetchCategories(); fetchCards() }, [])

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase.from('cards').select('name').order('id')
      if (error) throw error
      setCards(data && data.length > 0 ? data.map(c => c.name) : DEFAULT_CARDS)
    } catch (err) {
      console.error('Error fetching cards for reports (does the "cards" table exist yet?):', err)
    }
  }

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

  // Income / spent / lent totals per month, keyed 'YYYY-M'.
  const totalsByMonth = useMemo(() => {
    const map = {}
    transactions.forEach(t => {
      const d = new Date(t.txn_date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!map[key]) map[key] = { income: 0, spent: 0, lent: 0, received: 0 }
      const amt = Number(t.amount) || 0
      if (t.type === 'Income') map[key].income += amt
      else if (t.type === 'Expense') map[key].spent += amt
      else if (t.type === 'Money to Get') map[key].lent += amt
      else if (t.type === 'Debt Cleared') map[key].received += amt
    })
    return map
  }, [transactions])

  const monthTotals = (m, y) => totalsByMonth[`${y}-${m}`] || { income: 0, spent: 0, lent: 0, received: 0 }
  const thisMonth = monthTotals(selectedMonth, selectedYear)
  const prevMonth = selectedMonth === 0 ? monthTotals(11, selectedYear - 1) : monthTotals(selectedMonth - 1, selectedYear)
  const left = thisMonth.income - thisMonth.spent
  const spentPct = thisMonth.income > 0 ? (thisMonth.spent / thisMonth.income) * 100 : 0
  const spendChange = thisMonth.spent - prevMonth.spent

  const monthlyIncomeByCategory = useMemo(() => {
    const totals = {}
    transactions
      .filter(t => t.type === 'Income')
      .filter(t => { const d = new Date(t.txn_date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
      .forEach(t => { totals[t.category] = (totals[t.category] || 0) + Number(t.amount) })
    return totals
  }, [transactions, selectedMonth, selectedYear])

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

  const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`
  const now = new Date()
  // Months of the selected year with activity (plus every month so far this year).
  const yearRows = months
    .map((name, m) => ({ name, m, ...monthTotals(m, selectedYear) }))
    .filter(r => r.income || r.spent || (selectedYear === now.getFullYear() && r.m <= now.getMonth()))
  const yearTotal = yearRows.reduce((a, r) => ({ income: a.income + r.income, spent: a.spent + r.spent }), { income: 0, spent: 0 })
  const yearLeft = yearTotal.income - yearTotal.spent

  const handleExportMonthlyCSV = () => {
    const rows = yearRows.map(r => [`"${r.name} ${selectedYear}"`, r.income, r.spent, r.income - r.spent].join(','))
    rows.push(`"Total ${selectedYear}",${yearTotal.income},${yearTotal.spent},${yearLeft}`)
    const csv = ['Month,Income,Spent,Left', ...rows].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `Monthly_Income_vs_Expense_${selectedYear}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const cardBalances = useMemo(() => {
    const balances = {}
    cards.forEach(name => { balances[name] = 0 })
    transactions.forEach(t => {
      const b = t.bank || 'Cash'
      if (!(b in balances)) balances[b] = 0
      const amt = Number(t.amount)
      if (t.type === 'Income' || t.type === 'Debt Cleared') balances[b] += amt
      else if (t.type === 'Expense' || t.type === 'Money to Get') balances[b] -= amt
    })
    return balances
  }, [transactions, cards])

  const handleOpenModal = (category, type) => {
    setModalCategory(category); setModalType(type); setIsModalOpen(true)
  }

  const handleOpenCardModal = (cardName) => {
    setSelectedCard(cardName); setIsCardModalOpen(true)
  }

  const cardModalTransactions = useMemo(() => {
    if (!isCardModalOpen) return []
    return transactions
      .filter(t => {
        const b = t.bank || 'Cash'
        if (b !== selectedCard) return false
        const d = new Date(t.txn_date)
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
      })
      .sort((a, b) => new Date(b.txn_date) - new Date(a.txn_date))
  }, [isCardModalOpen, selectedCard, transactions, selectedMonth, selectedYear])

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

      {/* Month summary — income vs spent, how much is left */}
      <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="material-symbols-outlined text-on-surface-variant">account_balance_wallet</span>
          <h3 className="text-headline-md font-headline-md text-on-surface">{months[selectedMonth]} {selectedYear}</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="glass-green rounded-2xl p-4 min-w-0">
            <p className="text-label-caps text-emerald-300/70 mb-1">INCOME</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-100 truncate">{fmt(thisMonth.income)}</p>
          </div>
          <div className="glass-red rounded-2xl p-4 min-w-0">
            <p className="text-label-caps text-red-300/70 mb-1">SPENT</p>
            <p className="text-lg sm:text-2xl font-bold text-red-100 truncate">{fmt(thisMonth.spent)}</p>
          </div>
          <div className={`${left >= 0 ? 'glass-amber' : 'glass-red'} rounded-2xl p-4 min-w-0`}>
            <p className={`text-label-caps mb-1 ${left >= 0 ? 'text-amber-300/70' : 'text-red-300/70'}`}>{left >= 0 ? 'LEFT' : 'OVERSPENT'}</p>
            <p className={`text-lg sm:text-2xl font-bold truncate ${left >= 0 ? 'text-amber-100' : 'text-red-100'}`}>{fmt(Math.abs(left))}</p>
          </div>
        </div>

        {thisMonth.income > 0 ? (
          <div className="mt-5">
            <div className="flex justify-between gap-3 text-body-sm text-on-surface-variant mb-2">
              <span>Spent {Math.round(spentPct)}% of income</span>
              <span>{left >= 0 ? `Saved ${Math.round(100 - spentPct)}%` : `${fmt(-left)} more than earned`}</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${spentPct > 100 ? 'bg-red-400' : spentPct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(spentPct, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-body-sm text-on-surface-variant">
            No income logged for this month. Add your salary or other money in with type "Income" to see what's left.
          </p>
        )}

        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-1 text-body-sm text-on-surface-variant">
          {(prevMonth.spent > 0 || thisMonth.spent > 0) && (
            spendChange === 0
              ? <span>Spending is the same as last month</span>
              : <span>
                  Spent <span className={spendChange > 0 ? 'text-red-300' : 'text-emerald-300'}>{fmt(Math.abs(spendChange))} {spendChange > 0 ? 'more' : 'less'}</span> than last month
                </span>
          )}
          {(thisMonth.lent > 0 || thisMonth.received > 0) && (
            <span>Lent {fmt(thisMonth.lent)} · got back {fmt(thisMonth.received)} (not counted above)</span>
          )}
        </div>
      </div>

      {/* Card Balances — cyan glass */}
      <div className="glass-cyan rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-cyan-300">credit_card</span>
          <h3 className="text-headline-md font-headline-md text-on-surface mr-auto">Card Balances</h3>
          <span className="text-body-sm text-on-surface-variant">Tap a card for {months[selectedMonth]} {selectedYear} activity</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(cardBalances).map(([cardName, bal], idx) => {
            const c = CARD_COLORS[idx % CARD_COLORS.length]
            return (
              <button
                key={cardName}
                onClick={() => handleOpenCardModal(cardName)}
                className={`${c.card} flex flex-col items-start p-5 rounded-2xl text-left cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all`}
              >
                <span className={`material-symbols-outlined mb-2 ${c.icon}`}>account_balance_wallet</span>
                <span className={`text-body-sm mb-1 ${c.label}`}>{cardName}</span>
                <span className={`text-xl font-bold ${c.value}`}>
                  ₹{bal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Report — amber glass */}
        <div className="glass-amber rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-amber-300">bar_chart</span>
            <h3 className="text-headline-md font-headline-md text-on-surface">Monthly Report ({months[selectedMonth]})</h3>
          </div>

          <p className="text-label-caps text-emerald-300/80 mb-3">INCOME · {fmt(thisMonth.income)}</p>
          {Object.keys(monthlyIncomeByCategory).length === 0 ? (
            <p className="text-on-surface-variant text-body-sm mb-6">No income this month.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              {Object.entries(monthlyIncomeByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([catName, amount]) => (
                  <div key={catName} className="flex justify-between items-center">
                    <span className="text-body-lg font-bold text-on-surface">{catName}</span>
                    <span className="font-bold text-emerald-300">{fmt(amount)}</span>
                  </div>
                ))}
            </div>
          )}

          <p className="text-label-caps text-red-300/80 mb-3 pt-4 border-t border-white/10">SPENDING · {fmt(thisMonth.spent)}</p>
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

      {/* Month by month — income vs spent across the year */}
      <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-5">
          <span className="material-symbols-outlined text-on-surface-variant">calendar_view_month</span>
          <h3 className="text-headline-md font-headline-md text-on-surface mr-auto">Month by Month ({selectedYear})</h3>
          <button
            onClick={handleExportMonthlyCSV}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-on-surface px-4 py-2 rounded-xl transition-colors cursor-pointer"
            title="Export to Excel (CSV)"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span className="text-body-sm font-bold hidden sm:inline">Export</span>
          </button>
        </div>

        {yearRows.length === 0 ? (
          <p className="text-on-surface-variant py-4 text-center">No transactions this year.</p>
        ) : (
          <div className="-mx-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-2 pb-2 text-label-caps text-on-surface-variant">
              <span>MONTH</span><span className="text-right">INCOME</span><span className="text-right">SPENT</span><span className="text-right">LEFT</span>
            </div>
            {yearRows.map(r => {
              const l = r.income - r.spent
              return (
                <button
                  key={r.m}
                  onClick={() => { setSelectedMonth(r.m); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className={`w-full grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-2 py-3 rounded-xl text-left text-body-sm transition-colors ${r.m === selectedMonth ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <span className="font-bold text-on-surface truncate">{r.name.slice(0, 3)}</span>
                  <span className="text-right text-emerald-300 tabular-nums">{fmt(r.income)}</span>
                  <span className="text-right text-red-300 tabular-nums">{fmt(r.spent)}</span>
                  <span className={`text-right font-bold tabular-nums ${l >= 0 ? 'text-amber-200' : 'text-red-400'}`}>{l < 0 ? '−' : ''}{fmt(Math.abs(l))}</span>
                </button>
              )
            })}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-2 pt-3 mt-1 border-t border-white/10 text-body-sm">
              <span className="font-bold text-on-surface">Total</span>
              <span className="text-right font-bold text-emerald-300 tabular-nums">{fmt(yearTotal.income)}</span>
              <span className="text-right font-bold text-red-300 tabular-nums">{fmt(yearTotal.spent)}</span>
              <span className={`text-right font-bold tabular-nums ${yearLeft >= 0 ? 'text-amber-200' : 'text-red-400'}`}>{yearLeft < 0 ? '−' : ''}{fmt(Math.abs(yearLeft))}</span>
            </div>
          </div>
        )}
      </div>

      {/* Yearly Report — green glass */}
      <div className="glass-green rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-emerald-300">trending_up</span>
          <h3 className="text-headline-md font-headline-md text-on-surface">Yearly Spending by Category ({selectedYear})</h3>
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

      <CardDetailModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        cardName={selectedCard}
        periodLabel={`${months[selectedMonth]} ${selectedYear}`}
        balance={cardBalances[selectedCard] || 0}
        transactions={cardModalTransactions}
      />
    </div>
  )
}
