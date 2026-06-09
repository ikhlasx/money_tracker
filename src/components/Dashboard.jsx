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
  const [activeTab, setActiveTab] = useState('transactions') // 'transactions', 'reports', 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Stats
  const [income, setIncome] = useState(0)
  const [expense, setExpense] = useState(0)
  const [mtg, setMtg] = useState(0)
  const [bankBalances, setBankBalances] = useState({ Cash: 0, IOB: 0, FED: 0, Other: 0 })

  useEffect(() => {
    fetchTransactions()
  }, [])

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

      if (t.type === 'Income') {
        inc += amt
        banks[b] += amt
      } else if (t.type === 'Expense') {
        exp += amt
        banks[b] -= amt
      } else if (t.type === 'Money to Get') {
        m += amt
      }
    })

    setIncome(inc)
    setExpense(exp)
    setMtg(m)
    setBankBalances(banks)
  }

  const toggleDrawer = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <>
      {/* Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Navigation Drawer (Sidebar) */}
      <aside 
        className={`h-full w-80 fixed left-0 top-0 z-50 bg-surface-container-lowest lg:bg-surface-container-lowest backdrop-blur-2xl border-r border-outline-variant shadow-2xl lg:shadow-none transform transition-transform duration-300 flex flex-col p-6 gap-stack-md lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant bg-surface-container-highest flex items-center justify-center text-primary font-bold text-xl">
              {session?.user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h3 className="text-body-lg font-bold text-on-surface truncate">{session?.user?.email}</h3>
              <p className="text-label-caps text-secondary">User</p>
            </div>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-2">Balance: ₹{(income - expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        
        <nav className="flex flex-col gap-2">
          <button 
            className={`flex items-center gap-4 px-4 py-3 rounded-3xl transition-all active:scale-95 duration-200 ${activeTab === 'transactions' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }}
          >
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="text-label-caps">Transactions</span>
          </button>
          <button 
            className={`flex items-center gap-4 px-4 py-3 rounded-3xl transition-all active:scale-95 duration-200 ${activeTab === 'reports' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-label-caps">Reports</span>
          </button>
          <button 
            className={`flex items-center gap-4 px-4 py-3 rounded-3xl transition-all active:scale-95 duration-200 ${activeTab === 'settings' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-label-caps">Budget Settings</span>
          </button>
          <button 
            className={`flex items-center gap-4 px-4 py-3 rounded-3xl transition-all active:scale-95 duration-200 ${activeTab === 'calendar' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            onClick={() => { setActiveTab('calendar'); setIsSidebarOpen(false); }}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="text-label-caps">Calendar</span>
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-outline-variant">
          <button 
            className="flex items-center gap-4 text-error px-4 py-3 hover:bg-error-container/50 rounded-3xl transition-all w-full text-left" 
            onClick={() => supabase.auth.signOut()}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-label-caps">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* TopAppBar Component */}
      <header className="lg:hidden docked full-width top-0 sticky z-30 bg-surface/70 backdrop-blur-md flex items-center justify-between px-container-padding-mobile h-16 w-full border-b border-outline-variant/30">
        <div className="flex items-center gap-4">
          <button className="p-2 text-primary hover:bg-black/5 rounded-full active:scale-95 transition-transform" onClick={toggleDrawer}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary">MoneyTracker</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-primary hover:bg-black/5 rounded-full active:scale-95 transition-transform" onClick={fetchTransactions}>
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </header>

      {/* TopAppBar Desktop */}
      <header className="hidden lg:flex docked full-width top-0 sticky z-30 bg-surface/70 backdrop-blur-md items-center justify-between px-container-padding-desktop h-16 ml-80 border-b border-outline-variant/30">
        <div className="flex items-center gap-4">
          <h1 className="font-display-lg text-display-lg text-primary">MoneyTracker</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-primary hover:bg-black/5 rounded-full active:scale-95 transition-transform" onClick={fetchTransactions}>
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="lg:ml-80 max-w-[1200px] mx-auto px-container-padding-mobile py-stack-md lg:py-stack-lg min-h-[calc(100vh-64px)] pb-24 lg:pb-stack-lg">
        {activeTab === 'transactions' && (
          <div className="animate-fade-in">
            <TransactionForm 
              fetchTransactions={fetchTransactions}
              editData={editData}
              setEditData={setEditData}
            />
            <TransactionLog 
              transactions={transactions}
              fetchTransactions={fetchTransactions}
              setEditData={setEditData}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="animate-fade-in">
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

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className="lg:hidden fixed bottom-0 w-full z-30 flex justify-around items-center px-6 py-4 bg-surface/80 backdrop-blur-xl docked full-width shadow-lg rounded-t-3xl shadow-[0_-4px_20px_0_rgba(0,0,0,0.05)] border-t border-outline-variant/20">
        <button 
          className={`flex flex-col items-center justify-center rounded-full w-12 h-12 active:scale-90 transition-all duration-300 ease-out ${activeTab === 'transactions' ? 'bg-secondary text-on-secondary' : 'text-outline hover:bg-surface-container-high'}`}
          onClick={() => setActiveTab('transactions')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'transactions' ? "'FILL' 1" : "'FILL' 0" }}>account_balance_wallet</span>
        </button>
        <button 
          className={`flex flex-col items-center justify-center rounded-full w-12 h-12 active:scale-90 transition-all duration-300 ease-out ${activeTab === 'reports' ? 'bg-secondary text-on-secondary' : 'text-outline hover:bg-surface-container-high'}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'reports' ? "'FILL' 1" : "'FILL' 0" }}>analytics</span>
        </button>
        <button 
          className={`flex flex-col items-center justify-center rounded-full w-12 h-12 active:scale-90 transition-all duration-300 ease-out ${activeTab === 'calendar' ? 'bg-secondary text-on-secondary' : 'text-outline hover:bg-surface-container-high'}`}
          onClick={() => setActiveTab('calendar')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'calendar' ? "'FILL' 1" : "'FILL' 0" }}>calendar_month</span>
        </button>
        <div className="relative -top-6">
          <button 
            className="w-14 h-14 bg-secondary text-on-primary rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform"
            onClick={() => setActiveTab('transactions')}
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
        <button 
          className={`flex flex-col items-center justify-center rounded-full w-12 h-12 active:scale-90 transition-all duration-300 ease-out ${activeTab === 'settings' ? 'bg-secondary text-on-secondary' : 'text-outline hover:bg-surface-container-high'}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
        </button>
        <button 
          className="flex flex-col items-center justify-center text-outline w-12 h-12 hover:bg-surface-container-high rounded-full active:scale-90 transition-all duration-300 ease-out"
          onClick={() => toggleDrawer()}
        >
          <span className="material-symbols-outlined">person</span>
        </button>
      </nav>
    </>
  )
}
