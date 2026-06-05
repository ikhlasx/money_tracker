import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { PlusCircle, XCircle } from 'lucide-react'

export default function TransactionForm({ fetchTransactions, editData, setEditData }) {
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
    }
  }, [editData])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('name')
      if (error) throw error
      setCategories(data.map(c => c.name))
      if (data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].name }))
      }
    } catch (error) {
      console.error('Error fetching categories', error)
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
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', editData.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([payload])
        if (error) throw error
      }

      // Reset form
      setFormData({
        txn_date: new Date().toISOString().split('T')[0],
        type: 'Expense',
        category: categories.length > 0 ? categories[0] : '',
        desc: '',
        amount: '',
        bank: 'Cash'
      })
      setEditData(null)
      fetchTransactions()
    } catch (error) {
      console.error('Error saving transaction', error)
      alert('Error saving transaction: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditData(null)
    setFormData({
      txn_date: new Date().toISOString().split('T')[0],
      type: 'Expense',
      category: categories.length > 0 ? categories[0] : '',
      desc: '',
      amount: '',
      bank: 'Cash'
    })
  }

  return (
    <div className="glass animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 className="text-h3" style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>
        {editData ? 'Edit Transaction' : 'Add New Transaction'}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Date</label>
          <input 
            type="date" 
            value={formData.txn_date} 
            onChange={(e) => setFormData({...formData, txn_date: e.target.value})} 
            required 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Type</label>
          <select 
            value={formData.type} 
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
            <option value="Money to Get">Money to Get</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Category</label>
          <select 
            value={formData.category} 
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Description</label>
          <input 
            type="text" 
            placeholder="e.g. Groceries"
            value={formData.desc} 
            onChange={(e) => setFormData({...formData, desc: e.target.value})} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Amount (₹)</label>
          <input 
            type="number" 
            step="0.01" 
            min="0"
            placeholder="0.00"
            value={formData.amount} 
            onChange={(e) => setFormData({...formData, amount: e.target.value})} 
            required 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem' }}>Bank Account</label>
          <select 
            value={formData.bank} 
            onChange={(e) => setFormData({...formData, bank: e.target.value})}
          >
            <option value="Cash">Cash</option>
            <option value="IOB">IOB</option>
            <option value="FED">FED</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
            <PlusCircle size={18} /> {editData ? 'Update' : 'Add'}
          </button>
          {editData && (
            <button type="button" className="btn btn-danger" onClick={handleCancel}>
              <XCircle size={18} /> Cancel
            </button>
          )}
        </div>

      </form>
    </div>
  )
}
