import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

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

  useEffect(() => { fetchCategories() }, [])

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
      const payload = { ...formData, amount: parseFloat(formData.amount) }
      if (editData) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', editData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('transactions').insert([payload])
        if (error) throw error
      }
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

  /* Resolve card style based on transaction type */
  const cardStyle = editData
    ? 'glass-amber'
    : formData.type === 'Income'
    ? 'glass-green'
    : formData.type === 'Money to Get'
    ? 'glass-blue'
    : 'glass-red'

  const accentColor = editData
    ? 'text-amber-300'
    : formData.type === 'Income'
    ? 'text-emerald-300'
    : formData.type === 'Money to Get'
    ? 'text-blue-300'
    : 'text-red-300'

  const btnStyle = editData
    ? 'bg-amber-500/80 hover:bg-amber-500 text-white shadow-amber-500/20'
    : formData.type === 'Income'
    ? 'bg-emerald-500/80 hover:bg-emerald-500 text-white shadow-emerald-500/20'
    : formData.type === 'Money to Get'
    ? 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-blue-500/20'
    : 'bg-red-500/80 hover:bg-red-500 text-white shadow-red-500/20'

  const dropdownArrow = "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjYzRjN2M4IiBkPSJNNyAxMGw1IDUgNS01eiIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_12px_center]"

  return (
    <div className={`${cardStyle} rounded-3xl p-6 lg:p-8 relative overflow-hidden mb-8`}>
      <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

      <h2 className={`text-headline-md font-headline-md text-on-surface mb-6 relative z-10 flex items-center gap-2`}>
        <span className={`material-symbols-outlined ${accentColor}`}>
          {editData ? 'edit' : 'add_circle'}
        </span>
        {editData ? 'Edit Transaction' : 'New Transaction'}
      </h2>

      <form onSubmit={handleSubmit} className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-on-surface-variant ml-1">Type</label>
          <select
            className={`input-field rounded-2xl px-4 py-3.5 text-body-lg text-on-surface w-full appearance-none ${dropdownArrow}`}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
            <option value="Money to Get">Money to Get</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-on-surface-variant ml-1">Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="input-field rounded-2xl pl-10 pr-4 py-3.5 text-body-lg text-on-surface w-full"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-on-surface-variant ml-1">Category</label>
          <select
            className={`input-field rounded-2xl px-4 py-3.5 text-body-lg text-on-surface w-full appearance-none ${dropdownArrow}`}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-on-surface-variant ml-1">Date</label>
          <input
            type="date"
            className="input-field rounded-2xl px-4 py-3.5 text-body-lg text-on-surface w-full"
            value={formData.txn_date}
            onChange={(e) => setFormData({ ...formData, txn_date: e.target.value })}
            required
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
          <label className="text-label-caps text-on-surface-variant ml-1">Account</label>
          <select
            className={`input-field rounded-2xl px-4 py-3.5 text-body-lg text-on-surface w-full appearance-none ${dropdownArrow}`}
            value={formData.bank}
            onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
          >
            <option value="Cash">Cash</option>
            <option value="IOB">IOB</option>
            <option value="FED">FED</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 lg:col-span-1">
          <label className="text-label-caps text-on-surface-variant ml-1">Description (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Groceries"
            className="input-field rounded-2xl px-4 py-3.5 text-body-lg text-on-surface w-full"
            value={formData.desc}
            onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
          />
        </div>

        <div className="col-span-full flex flex-col sm:flex-row gap-4 mt-2">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 ${btnStyle} px-6 py-4 rounded-full font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg`}
          >
            {loading
              ? <span className="material-symbols-outlined animate-spin">refresh</span>
              : <span className="material-symbols-outlined">{editData ? 'update' : 'send'}</span>
            }
            {editData ? 'Update Transaction' : 'Save Transaction'}
          </button>

          {editData && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-4 rounded-full font-bold text-on-surface-variant hover:bg-white/10 transition-colors flex justify-center items-center gap-2 border border-white/10"
            >
              <span className="material-symbols-outlined">cancel</span>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
