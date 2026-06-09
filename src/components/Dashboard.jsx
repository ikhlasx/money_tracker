import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { LogOut, Settings, BarChart2 } from 'lucide-react'
import SpendCalendarCard from './SpendCalendarCard'
import BudgetProgressCard from './BudgetProgressCard'
import TransactionLog from './TransactionLog'
import TransactionModal from './TransactionModal'

export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editData, setEditData] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClick = () => {
    setEditData(null)
    setIsModalOpen(true)
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <nav style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 'bold' }}>
            {session?.user?.email?.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{session?.user?.email}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" style={{ background: 'transparent', padding: '0.5rem' }} title="Reports">
            <BarChart2 size={20} color="var(--text-secondary)" />
          </button>
          <button className="btn" style={{ background: 'transparent', padding: '0.5rem' }} title="Settings">
            <Settings size={20} color="var(--text-secondary)" />
          </button>
          <button className="btn" style={{ background: 'transparent', padding: '0.5rem' }} onClick={() => supabase.auth.signOut()} title="Sign Out">
            <LogOut size={20} color="var(--text-secondary)" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">Track <span>everything</span></h1>
        <p className="hero-subtitle">
          Sync all your finances.<br/>
          Connect all your accounts to see your finances in one place.
        </p>
      </div>

      {/* Main Cards Grid */}
      <div className="cards-container">
        <SpendCalendarCard transactions={transactions} onAddClick={handleAddClick} />
        <BudgetProgressCard transactions={transactions} />
        <TransactionLog transactions={transactions} fetchTransactions={fetchTransactions} setEditData={(t) => { setEditData(t); setIsModalOpen(true); }} />
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        fetchTransactions={fetchTransactions}
        editData={editData}
        setEditData={setEditData}
      />
    </div>
  )
}
