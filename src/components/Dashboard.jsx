import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import TransactionForm from './TransactionForm'
import TransactionLog from './TransactionLog'
import Reports from './Reports'
import BudgetSettings from './BudgetSettings'
import CalendarView from './CalendarView'

export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editData, setEditData] = useState(null)
  const [activeTab, setActiveTab] = useState('transactions')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [income, setIncome] = useState(0)
  const [expense, setExpense] = useState(0)
  const [mtg, setMtg] = useState(0)
  const [bankBalances, setBankBalances] = useState({ Cash: 0, IOB: 0, FED: 0, Other: 0 })

  useEffect(() => { fetchTransactions() }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('txn_date', { ascending: false })
        .order('id', { ascending: false })
      if (error) throw error
      setTransactions(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    let inc = 0, exp = 0, m = 0
    let banks = { Cash: 0, IOB: 0, FED: 0, Other: 0 }
    data.forEach(t => {
      const amt = Number(t.amount)
      const b = t.bank || 'Cash'
      if (!banks[b]) banks[b] = 0
      if (t.type === 'Income') { inc += amt; banks[b] += amt }
      else if (t.type === 'Expense') { exp += amt; banks[b] -= amt }
      else if (t.type === 'Money to Get') { m += amt }
    })
    setIncome(inc); setExpense(exp); setMtg(m); setBankBalances(banks)
  }

  const toggleDrawer = () => setIsSidebarOpen(!isSidebarOpen)

  const balance = income - expense

  const statTiles = [
    {
      label: 'BALANCE',
      value: `₹${balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}`,
      icon: 'account_balance_wallet',
      card: 'glass-amber',
      iconColor: 'text-amber-300',
      labelColor: 'text-amber-300/70',
      valueColor: 'text-amber-100',
    },
    {
      label: 'INCOME',
      value: `₹${income.toLocaleString(undefined, { minimumFractionDigits: 0 })}`,
      icon: 'trending_up',
      card: 'glass-green',
      iconColor: 'text-emerald-300',
      labelColor: 'text-emerald-300/70',
      valueColor: 'text-emerald-100',
    },
    {
      label: 'EXPENSES',
      value: `₹${expense.toLocaleString(undefined, { minimumFractionDigits: 0 })}`,
      icon: 'trending_down',
      card: 'glass-red',
      iconColor: 'text-red-300',
      labelColor: 'text-red-300/70',
      valueColor: 'text-red-100',
    },
    {
      label: 'TO RECEIVE',
      value: `₹${mtg.toLocaleString(undefined, { minimumFractionDigits: 0 })}`,
      icon: 'payments',
      card: 'glass-blue',
      iconColor: 'text-blue-300',
      labelColor: 'text-blue-300/70',
      valueColor: 'text-blue-100',
    },
  ]

  const bankColors = [
    { card: 'glass-violet', icon: 'text-violet-300', label: 'text-violet-300/70', value: 'text-violet-100' },
    { card: 'glass-cyan',   icon: 'text-cyan-300',   label: 'text-cyan-300/70',   value: 'text-cyan-100'   },
    { card: 'glass-pink',   icon: 'text-pink-300',   label: 'text-pink-300/70',   value: 'text-pink-100'   },
    { card: 'glass-orange', icon: 'text-orange-300', label: 'text-orange-300/70', value: 'text-orange-100' },
  ]

  return (
    <>
      {/* Ambient glow background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[140px]"></div>
        <div className="absolute top-[40%] -right-[15%] w-[55%] h-[55%] rounded-full bg-blue-500/5 blur-[140px]"></div>
        <div className="absolute bottom-0 left-[30%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[120px]"></div>
      </div>

      {/* Drawer Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Navigation Drawer */}
      <aside
        className={`h-full w-80 fixed left-0 top-0 z-50 bg-surface-container-lowest/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl transform transition-transform duration-300 flex flex-col p-6 gap-stack-md lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-surface-container-high flex items-center justify-center text-primary font-bold text-xl">
              {session?.user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h3 className="text-body-lg font-bold text-on-surface truncate">{session?.user?.email}</h3>
              <p className="text-label-caps text-on-surface-variant">User</p>
            </div>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-2">
            Balance: <span className={balance >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          {[
            { id: 'transactions', icon: 'account_balance_wallet', label: 'Transactions' },
            { id: 'reports',      icon: 'analytics',              label: 'Reports'      },
            { id: 'settings',     icon: 'settings',               label: 'Budget Settings' },
            { id: 'calendar',     icon: 'calendar_month',         label: 'Calendar'     },
          ].map(item => (
            <button
              key={item.id}
              className={`flex items-center gap-4 px-4 py-3 rounded-3xl transition-all active:scale-95 duration-200 ${activeTab === item.id ? 'bg-white/10 text-primary border border-white/10' : 'text-on-surface-variant hover:bg-white/5'}`}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false) }}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-label-caps">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/10">
          <button
            className="flex items-center gap-4 text-red-400 px-4 py-3 hover:bg-red-500/10 rounded-3xl transition-all w-full text-left"
            onClick={() => supabase.auth.signOut()}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-label-caps">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* TopAppBar Mobile */}
      <header className="lg:hidden docked full-width top-0 sticky z-30 bg-surface/60 backdrop-blur-xl flex items-center justify-between px-container-padding-mobile h-16 w-full border-b border-white/10">
        <div className="flex items-center gap-4">
          <button className="p-2 text-primary hover:bg-white/10 rounded-full active:scale-95 transition-transform" onClick={toggleDrawer}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary">MoneyTracker</h1>
        </div>
        <button className="p-2 text-primary hover:bg-white/10 rounded-full active:scale-95 transition-transform" onClick={fetchTransactions}>
          <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </header>

      {/* TopAppBar Desktop */}
      <header className="hidden lg:flex docked full-width top-0 sticky z-30 bg-surface/60 backdrop-blur-xl items-center justify-between px-container-padding-desktop h-16 ml-80 border-b border-white/10">
        <h1 className="font-display-lg text-display-lg text-primary">MoneyTracker</h1>
        <button className="p-2 text-primary hover:bg-white/10 rounded-full active:scale-95 transition-transform" onClick={fetchTransactions}>
          <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="lg:ml-80 max-w-[1200px] mx-auto px-container-padding-mobile py-stack-md lg:py-stack-lg min-h-[calc(100vh-64px)] pb-24 lg:pb-stack-lg">

        {/* Tab Content */}
        {activeTab === 'transactions' && (
          <div className="animate-fade-in">
            <TransactionForm fetchTransactions={fetchTransactions} editData={editData} setEditData={setEditData} />
            <TransactionLog transactions={transactions} fetchTransactions={fetchTransactions} setEditData={setEditData} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="animate-fade-in">
            {/* Stat Bento Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-md">
              {statTiles.map(tile => (
                <div key={tile.label} className={`${tile.card} rounded-3xl p-5 flex flex-col justify-between min-h-[110px] cursor-default`}>
                  <span className={`material-symbols-outlined text-2xl ${tile.iconColor}`}>{tile.icon}</span>
                  <div>
                    <p className={`text-label-caps mb-0.5 ${tile.labelColor}`}>{tile.label}</p>
                    <p className={`text-lg font-bold leading-tight ${tile.valueColor}`}>{tile.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bank Balance Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter mb-stack-md">
              {Object.entries(bankBalances).map(([bank, bal], idx) => {
                const c = bankColors[idx % bankColors.length]
                return (
                  <div key={bank} className={`${c.card} rounded-2xl p-4 flex flex-col justify-between min-h-[90px]`}>
                    <span className={`material-symbols-outlined text-xl ${c.icon}`}>account_balance</span>
                    <div>
                      <p className={`text-label-caps mb-0.5 ${c.label}`}>{bank.toUpperCase()}</p>
                      <p className={`text-base font-bold ${c.value}`}>
                        ₹{bal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <Reports transactions={transactions} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <BudgetSettings />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="animate-fade-in">
            <CalendarView transactions={transactions} />
          </div>
        )}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 w-full z-30 flex justify-around items-center px-6 py-4 bg-surface/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] rounded-t-3xl">
        {[
          { id: 'transactions', icon: 'account_balance_wallet' },
          { id: 'reports',      icon: 'analytics'              },
          { id: 'calendar',     icon: 'calendar_month'         },
        ].map(item => (
          <button
            key={item.id}
            className={`flex flex-col items-center justify-center rounded-full w-12 h-12 active:scale-90 transition-all duration-300 ease-out ${activeTab === item.id ? 'bg-white/15 text-primary' : 'text-on-surface-variant hover:bg-white/5'}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === item.id ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
          </button>
        ))}

        <div className="relative -top-6">
          <button
            className="w-14 h-14 bg-white text-surface-container-lowest rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform shadow-white/20"
            onClick={() => setActiveTab('transactions')}
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>

        <button
          className={`flex flex-col items-center justify-center rounded-full w-12 h-12 active:scale-90 transition-all duration-300 ease-out ${activeTab === 'settings' ? 'bg-white/15 text-primary' : 'text-on-surface-variant hover:bg-white/5'}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
        </button>

        <button
          className="flex flex-col items-center justify-center text-on-surface-variant w-12 h-12 hover:bg-white/5 rounded-full active:scale-90 transition-all duration-300 ease-out"
          onClick={toggleDrawer}
        >
          <span className="material-symbols-outlined">person</span>
        </button>
      </nav>
    </>
  )
}
