import { useMemo, useState } from 'react'

const getIcon = (category, type) => {
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

export default function CalendarView({ transactions }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  const currentYear  = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const daysInMonth     = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  /* All transactions grouped by day for this month */
  const { totalSpent, dailyExpenses, dailyTxns } = useMemo(() => {
    let total = 0
    const daily = {}
    const txnsByDay = {}

    transactions.forEach(t => {
      const d = new Date(t.txn_date)
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return
      const day = d.getDate()

      if (!txnsByDay[day]) txnsByDay[day] = []
      txnsByDay[day].push(t)

      if (t.type === 'Expense') {
        const amt = Number(t.amount)
        total       += amt
        daily[day]   = (daily[day] || 0) + amt
      }
    })

    return { totalSpent: total, dailyExpenses: daily, dailyTxns: txnsByDay }
  }, [transactions, currentYear, currentMonth])

  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push({ type: 'empty', id: `empty-${i}` })
  for (let day = 1; day <= daysInMonth; day++) cells.push({ type: 'day', day, id: `day-${day}` })

  const formatAmount = (amt) =>
    amt >= 1000 ? `₹${(amt / 1000).toFixed(1)}k` : `₹${amt.toFixed(0)}`

  const today          = new Date()
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth

  const selectedTxns = selectedDay ? (dailyTxns[selectedDay] || []) : []

  const handleDayClick = (day) => {
    setSelectedDay(prev => (prev === day ? null : day))
  }

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
              onClick={() => { setCurrentDate(new Date(currentYear, currentMonth - 1, 1)); setSelectedDay(null) }}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-on-surface hover:bg-white/10 transition-colors"
              onClick={() => { setCurrentDate(new Date(currentYear, currentMonth + 1, 1)); setSelectedDay(null) }}
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

            const isToday    = isCurrentMonth && cell.day === today.getDate()
            const isSelected = selectedDay === cell.day
            const spent      = dailyExpenses[cell.day] || 0
            const hasTxns    = !!dailyTxns[cell.day]?.length

            let containerCls, dayNumCls, amtCls

            if (isSelected) {
              containerCls = 'bg-blue-400 border-blue-300 shadow-lg shadow-blue-400/30 ring-2 ring-blue-300/50'
              dayNumCls    = 'text-white font-bold'
              amtCls       = 'text-white/80 font-bold'
            } else if (isToday) {
              containerCls = 'bg-white border-white shadow-lg shadow-white/10'
              dayNumCls    = 'text-surface-container-lowest font-bold'
              amtCls       = 'text-surface-container font-bold'
            } else if (hasTxns) {
              containerCls = 'bg-blue-500/20 border-blue-400/30 cursor-pointer hover:bg-blue-500/30 active:scale-95'
              dayNumCls    = 'text-blue-200 font-medium'
              amtCls       = 'text-blue-100 font-bold'
            } else {
              containerCls = 'border-white/8 bg-white/4 opacity-50'
              dayNumCls    = 'text-on-surface-variant/50'
              amtCls       = 'text-on-surface-variant/40'
            }

            return (
              <div
                key={cell.id}
                onClick={() => hasTxns || isToday ? handleDayClick(cell.day) : undefined}
                className={`aspect-square rounded-xl lg:rounded-2xl border flex flex-col p-2 lg:p-3 transition-all duration-150 select-none ${containerCls} ${hasTxns || isToday ? 'cursor-pointer' : ''}`}
              >
                <span className={`text-body-sm lg:text-body-lg ${dayNumCls}`}>{cell.day}</span>
                <span className={`mt-auto text-label-caps lg:text-body-sm truncate ${amtCls}`}>
                  {spent > 0 ? formatAmount(spent) : hasTxns ? '•' : '-'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day transactions panel */}
      {selectedDay && (
        <div className="card-tint-primary rounded-3xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-headline-md font-headline-md text-on-surface">
              {new Date(currentYear, currentMonth, selectedDay)
                .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="w-9 h-9 rounded-full bg-white/8 text-on-surface-variant hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {selectedTxns.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">No transactions on this day.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedTxns.map(t => {
                const isIncome = t.type === 'Income'
                const isMTG    = t.type === 'Money to Get'
                const amtColor = isIncome ? 'text-emerald-400' : isMTG ? 'text-blue-400' : 'text-red-400'
                const sign     = isIncome ? '+' : isMTG ? '' : '-'
                const iconBg   = isIncome ? 'bg-emerald-500/10 text-emerald-400'
                               : isMTG    ? 'bg-blue-500/10 text-blue-400'
                               : 'bg-red-500/10 text-red-400'
                const icon = getIcon(t.category, t.type)

                return (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/8">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                      </div>
                      <div>
                        <p className="text-body-lg font-bold text-on-surface">{t.category}</p>
                        <p className="text-body-sm text-on-surface-variant">{t.type} · {t.bank || 'Cash'}</p>
                        {t.desc && <p className="text-label-caps text-outline mt-0.5 truncate max-w-[160px]">{t.desc}</p>}
                      </div>
                    </div>
                    <p className={`text-body-lg font-bold ${amtColor}`}>
                      {sign}₹{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Monitor card — cyan glass */}
      {!selectedDay && (
        <div className="glass-cyan p-6 rounded-3xl">
          <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Monitor your spending</h3>
          <p className="text-body-lg text-on-surface-variant">Tap any highlighted day to see its transactions.</p>
        </div>
      )}
    </div>
  )
}
