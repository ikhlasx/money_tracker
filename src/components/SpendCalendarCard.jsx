import React from 'react'
import { LineChart, Calendar as CalendarIcon, Plus } from 'lucide-react'

export default function SpendCalendarCard({ transactions, onAddClick }) {
  // Simple calculation for current month
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // Calculate total spend this month
  const thisMonthTxns = transactions.filter(t => {
    const d = new Date(t.txn_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'Expense'
  })
  const totalSpend = thisMonthTxns.reduce((sum, t) => sum + Number(t.amount), 0)

  // Generate calendar days
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  
  const calendarDays = []
  // Empty slots for padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }

  // Group spends by day
  const spendByDay = {}
  thisMonthTxns.forEach(t => {
    const day = new Date(t.txn_date).getDate()
    spendByDay[day] = (spendByDay[day] || 0) + Number(t.amount)
  })

  return (
    <div className="aesthetic-card card-1">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
          Spend This Month
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.25rem', borderRadius: '12px' }}>
          <button style={{ background: 'none', border: 'none', color: 'white', padding: '0.5rem', cursor: 'pointer' }}><LineChart size={18} /></button>
          <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}><CalendarIcon size={18} /></button>
          <button onClick={onAddClick} style={{ background: 'white', border: 'none', color: 'black', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}><Plus size={18} /></button>
        </div>
      </div>

      <div style={{ fontSize: '3rem', fontWeight: '500', marginBottom: '2rem' }}>
        ₹{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0 })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', flex: 1 }}>
        {calendarDays.map((day, idx) => (
          <div key={idx} style={{ 
            aspectRatio: '1', 
            background: day ? 'rgba(255,255,255,0.05)' : 'transparent',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.25rem'
          }}>
            {day && (
              <>
                <span style={{ fontSize: '0.875rem', fontWeight: day === today.getDate() ? 'bold' : 'normal', color: day === today.getDate() ? 'white' : 'rgba(255,255,255,0.6)' }}>
                  {day}
                </span>
                {spendByDay[day] ? (
                  <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'white', marginTop: '0.25rem' }}>
                    ₹{spendByDay[day] > 1000 ? (spendByDay[day]/1000).toFixed(1) + 'k' : spendByDay[day]}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem' }}>-</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>Monitor your spending</h4>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>See every transaction, automatically categorized.</p>
      </div>
    </div>
  )
}
