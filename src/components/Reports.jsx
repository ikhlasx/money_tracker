import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { AlertTriangle, TrendingUp, BarChart2, Calendar, Award } from 'lucide-react'

export default function Reports({ transactions }) {
  const [categories, setCategories] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

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

  return (
    <div className="reports-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Controls */}
      <div className="glass" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Calendar className="text-primary" size={20} />
        <h3 className="text-h3" style={{ margin: 0, marginRight: 'auto' }}>Reports</h3>
        
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          style={{ width: 'auto' }}
        >
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        
        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{ width: 'auto' }}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Monthly Report & Budget Warning */}
        <div className="glass animate-fade-in" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart2 className="text-accent" size={20} />
            <h3 className="text-h3">Monthly Report ({months[selectedMonth]})</h3>
          </div>
          
          {Object.keys(monthlyExpensesByCategory).length === 0 ? (
            <p className="text-muted">No expenses this month.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(monthlyExpensesByCategory)
                .sort((a, b) => b[1] - a[1]) // sort by amount
                .map(([catName, amount]) => {
                  const catData = categories.find(c => c.name === catName)
                  const budget = catData?.monthly_budget || 0
                  const isOverBudget = budget > 0 && amount > budget
                  const percentage = budget > 0 ? Math.min((amount / budget) * 100, 100) : 0

                  return (
                    <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-body" style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {catName}
                          {isOverBudget && <AlertTriangle size={14} className="text-danger" title="Over Budget" />}
                        </span>
                        <span style={{ fontWeight: '600', color: isOverBudget ? 'var(--danger)' : 'var(--text)' }}>
                          ₹{amount.toLocaleString()}
                          {budget > 0 && <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>/ ₹{budget}</span>}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      {budget > 0 && (
                        <div className="progress-bg" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            className="progress-fill" 
                            style={{ 
                              height: '100%', 
                              width: \`\${percentage}%\`, 
                              background: isOverBudget ? 'var(--danger)' : 'var(--accent)',
                              transition: 'width 0.5s ease-out'
                            }} 
                          />
                        </div>
                      )}
                    </div>
                  )
              })}
            </div>
          )}
        </div>

        {/* Top Expenses List */}
        <div className="glass animate-fade-in" style={{ padding: '1.5rem', animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Award className="text-warning" style={{ color: '#f59e0b' }} size={20} />
            <h3 className="text-h3">Top Expenses ({months[selectedMonth]})</h3>
          </div>

          {topExpenses.length === 0 ? (
             <p className="text-muted">No expenses to show.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topExpenses.map((txn, idx) => (
                <div key={txn.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="text-body" style={{ fontWeight: '500' }}>{txn.desc || txn.category}</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{txn.category} • {new Date(txn.txn_date).toLocaleDateString()}</span>
                  </div>
                  <span className="text-danger" style={{ fontWeight: '600' }}>
                    ₹{Number(txn.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Yearly Report */}
      <div className="glass animate-fade-in" style={{ padding: '1.5rem', animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp className="text-success" size={20} />
          <h3 className="text-h3">Yearly Report ({selectedYear})</h3>
        </div>

        {Object.keys(yearlyExpensesByCategory).length === 0 ? (
          <p className="text-muted">No expenses this year.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(yearlyExpensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([catName, amount]) => (
                <div key={catName} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--success)' }}>
                  <span className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{catName}</span>
                  <span className="text-h2" style={{ fontSize: '1.25rem' }}>₹{amount.toLocaleString()}</span>
                </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
