import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Wallet, LogOut, ArrowUpCircle, ArrowDownCircle, Banknote, RefreshCcw, Building, LayoutDashboard, PieChart, Settings } from 'lucide-react'
import TransactionForm from './TransactionForm'
import TransactionLog from './TransactionLog'
import Reports from './Reports'
import BudgetSettings from './BudgetSettings'

export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editData, setEditData] = useState(null)
  const [activeTab, setActiveTab] = useState('transactions') // 'transactions', 'reports', 'settings'

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

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Wallet color="#3b82f6" size={28} />
          <h2 className="text-h3">MoneyTracker</h2>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
              <LayoutDashboard size={18} /> Transactions
            </button>
            <button className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
              <PieChart size={18} /> Reports
            </button>
            <button className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={18} /> Budget Settings
            </button>
          </nav>

          <div>
            <h3 className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Overview</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="glass" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <ArrowUpCircle size={16} className="text-success" />
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Total Income</span>
                </div>
                <div className="text-h2 text-success">₹{income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>

              <div className="glass" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <ArrowDownCircle size={16} className="text-danger" />
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Total Expense</span>
                </div>
                <div className="text-h2 text-danger">₹{expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>

              <div className="glass" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Wallet size={16} color="#3b82f6" />
                  <span className="text-muted" style={{ fontSize: '0.875rem' }}>Current Balance</span>
                </div>
                <div className="text-h2" style={{ color: '#3b82f6' }}>₹{(income - expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Bank Balances</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(bankBalances).map(([bank, bal]) => (
                <div key={bank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                  <span className="text-body" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={14} className="text-muted"/> {bank}
                  </span>
                  <span style={{ fontWeight: '600', color: bal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ₹{bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <div style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {session?.user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div className="text-body" style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{session?.user?.email}</div>
            </div>
          </div>
          <button className="btn" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => supabase.auth.signOut()}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="text-h1">
              {activeTab === 'transactions' && 'Transactions'}
              {activeTab === 'reports' && 'Reports Overview'}
              {activeTab === 'settings' && 'Budget Settings'}
            </h1>
            <p className="text-muted">Manage your finances efficiently</p>
          </div>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={fetchTransactions}>
            <RefreshCcw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </header>

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
          <Reports transactions={transactions} />
        )}

        {activeTab === 'settings' && (
          <BudgetSettings />
        )}

      </main>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          text-align: left;
        }
        
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
        }
        
        .nav-link.active {
          background: rgba(59, 130, 246, 0.15);
          color: var(--accent);
        }
      `}</style>
    </div>
  )
}
