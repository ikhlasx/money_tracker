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
      console.error('Error deleting transaction', error)
      alert('Error deleting: ' + error.message)
    }
  }

  const getBankColor = (bank) => {
    switch (bank) {
      case 'IOB': return 'var(--bank-iob)'
      case 'FED': return 'var(--bank-sbi)' // reusing purple for FED
      case 'Cash': return 'var(--bank-cash)'
      case 'Other': return 'var(--bank-other)'
      default: return 'var(--bank-cash)'
    }
  }

  const getTypeStyle = (type) => {
    if (type === 'Income') return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }
    if (type === 'Expense') return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }
    return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }
  }

  return (
    <div className="glass animate-fade-in" style={{ padding: '1.5rem', overflowX: 'auto' }}>
      <h2 className="text-h3" style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Transaction Log</h2>
      
      {transactions.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No transactions found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Type</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Category</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Description</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Amount (₹)</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Bank</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => {
              const typeStyle = getTypeStyle(t.type)
              const bankColor = getBankColor(t.bank)
              
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="table-row">
                  <td style={{ padding: '1rem 0.5rem' }}>{new Date(t.txn_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <span style={{ 
                      background: typeStyle.bg, 
                      color: typeStyle.color, 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '999px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600' 
                    }}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>{t.category}</td>
                  <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{t.desc}</td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: '600', color: typeStyle.color }}>
                    {t.type === 'Expense' ? '-' : '+'} {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: bankColor }}></span>
                      {t.bank || 'Cash'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button 
                        onClick={() => setEditData(t)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem' }}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      
      <style>{`
        .table-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>
    </div>
  )
}
