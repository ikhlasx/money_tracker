import { useMemo, useState } from 'react'

export default function CalendarView({ transactions }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const currentYear  = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const daysInMonth    = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  const { totalSpent, dailyExpenses } = useMemo(() => {
    let total = 0
    const daily = {}
    transactions
      .filter(t => t.type === 'Expense')
      .forEach(t => {
        const d = new Date(t.txn_date)
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const day = d.getDate()
          const amt = Number(t.amount)
          total      += amt
          daily[day]  = (daily[day] || 0) + amt
        }
      })
    return { totalSpent: total, dailyExpenses: daily }
  }, [transactions, currentYear, currentMonth])

  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push({ type: 'empty', id: `empty-${i}` })
  for (let day = 1; day <= daysInMonth; day++) cells.push({ type: 'day', day, id: `day-${day}` })

  const formatAmount = (amt) =>
    amt >= 1000 ? `₹${(amt / 1000).toFixed(1)}k` : `₹${amt.toFixed(0)}`

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth

  return (
    <div className="animate-fade-in flex flex-col gap-6">

      {/* Calendar card — blue glass */}
      <div className="glass-blue rounded-[32px] p-6 lg:p-8 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="text-label-caps tracking-widest text-blue-300/70 font-bold uppercase mb-1">
              Spend This Month
            </h2>
            <p className="text-body-lg text-on-surface-variant">
              {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 transition-colors"
              onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 transition-colors"
              onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="mb-8 relative z-10">
          <h1 className="text-display-lg text-primary font-bold">
            ₹{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </h1>
          <p className="text-body-lg text-blue-300/60">total expenses</p>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-2 lg:gap-3 mb-2 relative z-10">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
            <div key={day} className="text-center text-label-caps text-on-surface-variant font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2 lg:gap-3 relative z-10">
          {cells.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.id} className="aspect-square rounded-xl lg:rounded-2xl"></div>
            }

            const isToday = isCurrentMonth && cell.day === today.getDate()
            const spent   = dailyExpenses[cell.day] || 0

            let containerCls, dayNumCls, amtCls

            if (isToday) {
              containerCls = 'bg-white border-white shadow-lg shadow-white/10'
              dayNumCls    = 'text-surface-container-lowest font-bold'
              amtCls       = 'text-surface-container font-bold'
            } else if (spent > 0) {
              containerCls = 'bg-blue-500/20 border-blue-400/30'
              dayNumCls    = 'text-blue-200 font-medium'
              amtCls       = 'text-blue-100 font-bold'
            } else {
              containerCls = 'bg-white/4 border-white/8'
              dayNumCls    = 'text-on-surface-variant/50'
              amtCls       = 'text-on-surface-variant/40'
            }

            return (
              <div
                key={cell.id}
                className={`aspect-square rounded-xl lg:rounded-2xl border flex flex-col p-2 lg:p-3 transition-colors ${containerCls}`}
              >
                <span className={`text-body-sm lg:text-body-lg ${dayNumCls}`}>{cell.day}</span>
                <span className={`mt-auto text-label-caps lg:text-body-sm truncate ${amtCls}`}>
                  {spent > 0 ? formatAmount(spent) : '-'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monitor card — cyan glass */}
      <div className="glass-cyan p-6 rounded-3xl">
        <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Monitor your spending</h3>
        <p className="text-body-lg text-on-surface-variant">See every transaction, automatically categorized across dates.</p>
      </div>
    </div>
  )
}
