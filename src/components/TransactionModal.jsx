import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { PlusCircle, X } from 'lucide-react'

export default function TransactionModal({ isOpen, onClose, fetchTransactions, editData, setEditData }) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  
  const [formData, setFormData] = useState({
    txn_date: new Date().toISOString().split('T')[0],
    type: 'Expense',
    category: '',
    desc: '',
    amount: '',
    bank: 'Cash'
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (editData) {
      setFormData({
        txn_date: editData.txn_date,
        type: editData.type,
        category: editData.category,
        desc: editData.desc || '',
        amount: editData.amount,
        bank: editData.bank || 'Cash'
      })
    } else {
      setFormData({
        txn_date: new Date().toISOString().split('T')[0],
        type: 'Expense',
        category: categories.length > 0 ? categories[0] : '',
        desc: '',
        amount: '',
        bank: 'Cash'
      })
    }
  }, [editData, categories, isOpen])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('name')
      if (!error && data) {
        const cats = data.map(c => c.name)
        setCategories(cats)
        if (cats.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: cats[0] }))
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      }

      if (editData) {
        await supabase.from('transactions').update(payload).eq('id', editData.id)
      } else {
        await supabase.from('transactions').insert([payload])
      }

      setEditData(null)
      fetchTransactions()
      onClose()
    } catch (error) {
      console.error(error)
      alert('Error saving transaction: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen && !editData) return null

  return (
    <div className="modal-overlay">
      <div className="glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'rgba(20,20,20,0.95)', position: 'relative' }}>
        <button 
          onClick={() => { setEditData(null); onClose() }}
          style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', marginBottom: '1.5rem', fontWeight: '600' }}>
          {editData ? 'Edit Entry' : 'Record Entry'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Amount (₹)</label>
              <input 
                type="number" step="0.01" min="0" placeholder="0.00"
                value={formData.amount} 
                onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                required 
                style={{ fontSize: '1.25rem', fontWeight: '500' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Date</label>
              <input 
                type="date" 
                value={formData.txn_date} 
                onChange={(e) => setFormData({...formData, txn_date: e.target.value})} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Type</label>
              <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Money to Get">Money to Get</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Account</label>
              <select value={formData.bank} onChange={(e) => setFormData({...formData, bank: e.target.value})}>
                <option value="Cash">Cash</option>
                <option value="IOB">IOB</option>
                <option value="FED">FED</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Category</label>
            <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>Description (Optional)</label>
            <input 
              type="text" placeholder="e.g. Groceries"
              value={formData.desc} 
              onChange={(e) => setFormData({...formData, desc: e.target.value})} 
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.125rem' }}>
            {loading ? 'Saving...' : (editData ? 'Save Changes' : 'Record Transaction')}
          </button>
        </form>
      </div>
    </div>
  )
}
