import React from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'

export default function TransactionModal({ isOpen, onClose, category, type, transactions }) {
  if (!isOpen) return null

  const Icon = type === 'Income' ? TrendingUp : TrendingDown
  const colorClass = type === 'Income' ? 'text-success' : 'text-danger'

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass animate-fade-in" style={{
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Icon className={colorClass} size={24} />
            <div>
              <h3 className="text-h3" style={{ margin: 0 }}>{category}</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>History of {type}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {transactions.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>No transactions found.</p>
          ) : (
            transactions.map(txn => (
              <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-body" style={{ fontWeight: '500' }}>{txn.desc || txn.category}</span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(txn.txn_date).toLocaleDateString()} • {txn.bank}</span>
                </div>
                <span className={colorClass} style={{ fontWeight: '600' }}>
                  ₹{Number(txn.amount).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
