import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import TransactionModal from './TransactionModal'

export default function Reports({ transactions }) {
  const [categories, setCategories] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCategory, setModalCategory] = useState('')
  const [modalType, setModalType] = useState('Income') // 'Income' or 'Expense'

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('name, monthly_budget')
      if (error) {
        // Fallback if monthly_budget is missing
        const fallback = await supabase.from('categories').select('name')
        if (!fallback.error) {
          setCategories(fallback.data.map(c => ({ ...c, monthly_budget: 0 })))
        }
      } else {
        setCategories(data)
      }
    } catch (err) {
      console.error('Error fetching categories for reports:', err)
    }
  }

  // --- Calculations ---
  
  // Filter for Expenses only
  const expenses = useMemo(() => transactions.filter(t => t.type === 'Expense'), [transactions])

  // 1. Monthly Category Report
  const monthlyExpensesByCategory = useMemo(() => {
    const monthlyFiltered = expenses.filter(t => {
      const d = new Date(t.txn_date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })

    const totals = {}
    monthlyFiltered.forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + Number(t.amount)
    })
    return totals
  }, [expenses, selectedMonth, selectedYear])

  // 2. Yearly Category Report
  const yearlyExpensesByCategory = useMemo(() => {
    const yearlyFiltered = expenses.filter(t => {
      const d = new Date(t.txn_date)
      return d.getFullYear() === selectedYear
    })

    const totals = {}
    yearlyFiltered.forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + Number(t.amount)
    })
    return totals
  }, [expenses, selectedYear])

  // 3. Top Expenses (Overall for the selected month)
  const topExpenses = useMemo(() => {
    const monthlyFiltered = expenses.filter(t => {
      const d = new Date(t.txn_date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
    // Sort descending by amount
    return [...monthlyFiltered].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5)
  }, [expenses, selectedMonth, selectedYear])

  // Helpers for Month/Year selection
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const years = Array.from(new Set(transactions.map(t => new Date(t.txn_date).getFullYear()))).sort((a, b) => b - a)
  if (years.length === 0) years.push(new Date().getFullYear())

  // 4. All-Time Category Stats
  const allTimeStatsByCategory = useMemo(() => {
    const stats = {}
    transactions.forEach(t => {
      if (t.type !== 'Income' && t.type !== 'Expense') return
      if (!stats[t.category]) stats[t.category] = { Income: 0, Expense: 0 }
      stats[t.category][t.type] += Number(t.amount)
    })
    return stats
  }, [transactions])

  const handleOpenModal = (category, type) => {
    setModalCategory(category)
    setModalType(type)
    setIsModalOpen(true)
  }

  const modalTransactions = useMemo(() => {
    if (!isModalOpen) return []
    return transactions.filter(t => t.category === modalCategory && t.type === modalType).sort((a,b) => new Date(b.txn_date) - new Date(a.txn_date))
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

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* Controls */}
      <div className="card-tint-primary rounded-[32px] p-6 flex flex-wrap gap-4 items-center">
        <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">calendar_month</span>
        </div>
        <h3 className="text-headline-md font-headline-md text-primary mr-auto">Report Filters</h3>
        
        <select 
          className="input-field rounded-2xl px-4 py-3 text-body-lg text-on-surface appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjNzY3NzdkIiBkPSJNNyAxMGw1IDUgNS01eiIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_12px_center]"
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
        >
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        
        <select 
          className="input-field rounded-2xl px-4 py-3 text-body-lg text-on-surface appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjNzY3NzdkIiBkPSJNNyAxMGw1IDUgNS01eiIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_12px_center]"
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Report & Budget Warning */}
        <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary">bar_chart</span>
            <h3 className="text-headline-md font-headline-md text-primary">Monthly Report ({months[selectedMonth]})</h3>
          </div>
          
          {Object.keys(monthlyExpensesByCategory).length === 0 ? (
            <p className="text-on-surface-variant py-4 text-center">No expenses this month.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(monthlyExpensesByCategory)
                .sort((a, b) => b[1] - a[1]) // sort by amount
                .map(([catName, amount]) => {
                  const catData = categories.find(c => c.name === catName)
                  const budget = catData?.monthly_budget || 0
                  const isOverBudget = budget > 0 && amount > budget
                  const percentage = budget > 0 ? Math.min((amount / budget) * 100, 100) : 0

                  return (
                    <div key={catName} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-body-lg font-bold text-on-surface flex items-center gap-2">
                          {catName}
                          {isOverBudget && <span className="material-symbols-outlined text-error text-[16px]" title="Over Budget">warning</span>}
                        </span>
                        <span className={`font-bold ${isOverBudget ? 'text-error' : 'text-primary'}`}>
                          ₹{amount.toLocaleString()}
                          {budget > 0 && <span className="text-body-sm text-on-surface-variant ml-1">/ ₹{budget}</span>}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      {budget > 0 && (
                        <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-error shadow-error/20 progress-bar-glow' : 'bg-secondary progress-bar-glow'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )
              })}
            </div>
          )}
        </div>

        {/* Top Expenses List */}
        <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-[#f59e0b]">emoji_events</span>
            <h3 className="text-headline-md font-headline-md text-primary">Top Expenses ({months[selectedMonth]})</h3>
          </div>

          {topExpenses.length === 0 ? (
             <p className="text-on-surface-variant py-4 text-center">No expenses to show.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {topExpenses.map((txn, idx) => (
                <div key={txn.id || idx} className="flex justify-between items-center p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-body-lg font-bold text-on-surface">{txn.desc || txn.category}</span>
                    <span className="text-body-sm text-on-surface-variant">{txn.category} • {new Date(txn.txn_date).toLocaleDateString()}</span>
                  </div>
                  <span className="text-error font-bold text-body-lg">
                    ₹{Number(txn.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Yearly Report */}
      <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[#009668]">trending_up</span>
          <h3 className="text-headline-md font-headline-md text-primary">Yearly Report ({selectedYear})</h3>
        </div>

        {Object.keys(yearlyExpensesByCategory).length === 0 ? (
          <p className="text-on-surface-variant py-4 text-center">No expenses this year.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(yearlyExpensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([catName, amount]) => (
                <div key={catName} className="flex flex-col p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm border-l-4 border-l-[#009668]">
                  <span className="text-body-sm text-on-surface-variant mb-1">{catName}</span>
                  <span className="text-display-sm text-primary font-bold">₹{amount.toLocaleString()}</span>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* All-Time Overview */}
      <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-secondary">pie_chart</span>
          <h3 className="text-headline-md font-headline-md text-primary">All-Time Overview by Category</h3>
        </div>

        {Object.keys(allTimeStatsByCategory).length === 0 ? (
          <p className="text-on-surface-variant py-4 text-center">No transactions found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(allTimeStatsByCategory)
              .sort((a, b) => (b[1].Expense + b[1].Income) - (a[1].Expense + a[1].Income))
              .map(([catName, stats]) => {
                const icon = getIconForCategory(catName)
                return (
                  <div key={catName} className="soft-card p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/30">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">{icon}</span>
                      </div>
                      <h4 className="text-body-lg font-bold text-on-surface">{catName}</h4>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => handleOpenModal(catName, 'Income')}
                        className="flex justify-between items-center bg-[#009668]/10 border border-[#009668]/20 p-4 rounded-xl cursor-pointer transition-colors hover:bg-[#009668]/20"
                      >
                        <span className="text-[#005236] flex items-center gap-2 text-body-sm font-bold">
                          <span className="material-symbols-outlined text-[18px]">trending_up</span> Income
                        </span>
                        <span className="text-[#005236] font-bold">₹{stats.Income.toLocaleString()}</span>
                      </button>
                      
                      <button 
                        onClick={() => handleOpenModal(catName, 'Expense')}
                        className="flex justify-between items-center bg-error-container/50 border border-error-container p-4 rounded-xl cursor-pointer transition-colors hover:bg-error-container"
                      >
                        <span className="text-on-error-container flex items-center gap-2 text-body-sm font-bold">
                          <span className="material-symbols-outlined text-[18px]">trending_down</span> Spent
                        </span>
                        <span className="text-on-error-container font-bold">₹{stats.Expense.toLocaleString()}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
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
