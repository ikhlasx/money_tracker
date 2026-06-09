import { Trash2, Edit2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function TransactionLog({ transactions, fetchTransactions, setEditData }) {
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      fetchTransactions()
    } catch (error) {
      console.error(error)
      alert('Error deleting: ' + error.message)
    }
  }

  return (
    <div className="aesthetic-card card-3">
      <h3 style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
        Recent Transactions
      </h3>
      
      {transactions.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>No transactions found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
          {transactions.slice(0, 15).map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', 
                  background: t.type === 'Expense' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: t.type === 'Expense' ? 'var(--danger)' : 'var(--success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem'
                }}>
                  {t.type === 'Expense' ? '-' : '+'}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>{t.category}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {new Date(t.txn_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {t.bank || 'Cash'}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  ₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditData(t)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '0' }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.8)', cursor: 'pointer', padding: '0' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>Transaction History</h4>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>View and manage your recent activity.</p>
      </div>
    </div>
  )
}
