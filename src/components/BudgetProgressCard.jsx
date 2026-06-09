import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { MoreHorizontal } from 'lucide-react'

export default function BudgetProgressCard({ transactions }) {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('name, monthly_budget')
      if (!error && data) {
        setCategories(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Calculate spending per category
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const thisMonthTxns = transactions.filter(t => {
    const d = new Date(t.txn_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'Expense'
  })

  const spendByCategory = {}
  thisMonthTxns.forEach(t => {
    spendByCategory[t.category] = (spendByCategory[t.category] || 0) + Number(t.amount)
  })

  let totalBudget = 0
  let totalSpend = 0

  const budgetItems = categories.filter(c => c.monthly_budget > 0).map(c => {
    const spend = spendByCategory[c.name] || 0
    const budget = c.monthly_budget || 0
    const percent = budget > 0 ? Math.min((spend / budget) * 100, 100) : 0
    
    totalBudget += budget
    totalSpend += spend

    return {
      name: c.name,
      spend,
      budget,
      percent
    }
  })

  // Sort by highest percent first
  budgetItems.sort((a, b) => b.percent - a.percent)

  const totalPercent = totalBudget > 0 ? Math.min((totalSpend / totalBudget) * 100, 100) : 0

  return (
    <div className="aesthetic-card card-2">
      <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
        Budget
      </h3>

      {totalBudget > 0 ? (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: '500' }}>Total Budget</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>
              ₹{totalSpend.toLocaleString()} <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', fontWeight: '400' }}>of ₹{totalBudget.toLocaleString()}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${totalPercent}%`, height: '100%', background: 'white', borderRadius: '2px' }}></div>
            </div>
            <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', width: '40px', textAlign: 'right' }}>
              {totalPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      ) : (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '2rem' }}>No budgets set. Go to settings to set monthly limits.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {budgetItems.slice(0, 5).map(item => (
          <div key={item.name}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '12px' }}>{item.name.substring(0, 2).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>{item.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.percent.toFixed(1)}%</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.percent}%`, height: '100%', background: 'white', borderRadius: '2px' }}></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>Build a budget</h4>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Sets up your budget and helps you track progress all month long.</p>
      </div>
    </div>
  )
}
