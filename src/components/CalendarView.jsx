import { useMemo, useState } from 'react'

export default function CalendarView({ transactions }) {
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Helpers for calendar generation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sun, 1 = Mon...
  
  // Calculate expenses for this month
  const { totalSpent, dailyExpenses } = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'Expense')
    let total = 0
    const daily = {}

    expenses.forEach(t => {
      const d = new Date(t.txn_date)
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate()
        const amount = Number(t.amount)
        total += amount
        daily[day] = (daily[day] || 0) + amount
      }
    })

    return { totalSpent: total, dailyExpenses: daily }
  }, [transactions, currentYear, currentMonth])

  // Generate calendar cells (including empty padding cells)
  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ type: 'empty', id: `empty-${i}` })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ type: 'day', day, id: `day-${day}` })
  }

  // Formatting amount (like $1.3k or ₹1.3k)
  const formatAmount = (amt) => {
    if (amt >= 1000) {
      return `₹${(amt / 1000).toFixed(1)}k`
    }
    return `₹${amt.toFixed(0)}`
  }

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div className="card-tint-primary rounded-[32px] p-6 lg:p-8 flex flex-col relative overflow-hidden">
        {/* Background gradient hint from design */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>

        <div className="flex justify-between items-center mb-6 relative z-10">
          <h2 className="text-label-caps tracking-widest text-on-surface-variant font-bold uppercase">
            Spend This Month
          </h2>
          
          <div className="flex gap-2">
            <button 
              className="w-10 h-10 rounded-xl border border-outline-variant flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
              onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button 
              className="w-10 h-10 rounded-xl border border-outline-variant flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
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
          <p className="text-body-lg text-on-surface-variant">
            {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 lg:gap-4 mb-2 relative z-10">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-label-caps text-on-surface-variant font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 lg:gap-4 relative z-10">
          {cells.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.id} className="aspect-square rounded-xl lg:rounded-2xl border border-transparent"></div>
            }

            const isToday = isCurrentMonth && cell.day === today.getDate()
            const spent = dailyExpenses[cell.day] || 0
            
            // Determine cell styling based on data
            let bgClass = "bg-surface-container-lowest border-outline-variant/30"
            let textClass = "text-on-surface-variant"
            let amtClass = "text-on-surface-variant"

            if (isToday) {
              bgClass = "bg-primary border-primary shadow-lg shadow-primary/20"
              textClass = "text-on-primary font-bold"
              amtClass = "text-on-primary font-bold"
            } else if (spent > 0) {
              // Highlight days with spending (light gray in light mode)
              bgClass = "bg-secondary-container border-secondary-container/50"
              textClass = "text-on-secondary-container font-medium"
              amtClass = "text-on-secondary-container font-bold"
            }

            return (
              <div 
                key={cell.id} 
                className={`aspect-square rounded-xl lg:rounded-2xl border flex flex-col p-2 lg:p-3 transition-colors ${bgClass}`}
              >
                <span className={`text-body-sm lg:text-body-lg ${textClass}`}>
                  {cell.day}
                </span>
                <span className={`mt-auto text-label-caps lg:text-body-sm truncate ${amtClass}`}>
                  {spent > 0 ? formatAmount(spent) : '-'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="mt-4 card-tint-primary p-6 rounded-3xl">
         <h3 className="text-title-lg font-bold text-primary mb-2">Monitor your spending</h3>
         <p className="text-body-lg text-on-surface-variant">See every transaction, automatically categorized across dates.</p>
      </div>
    </div>
  )
}
