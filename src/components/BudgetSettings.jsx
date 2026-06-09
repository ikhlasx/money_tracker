import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Save, AlertTriangle, Info } from 'lucide-react'

export default function BudgetSettings() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      // Attempt to fetch name and monthly_budget
      const { data, error } = await supabase.from('categories').select('name, monthly_budget')
      
      if (error) {
        // If monthly_budget column doesn't exist, this will error. Fallback to just name
        console.warn("Could not fetch monthly_budget. Have you added the column?", error)
        const fallback = await supabase.from('categories').select('name')
        if (fallback.error) throw fallback.error
        
        // Mock budgets to 0 if column is missing
        setCategories(fallback.data.map(c => ({ ...c, monthly_budget: 0 })))
        setError("The 'monthly_budget' column is missing in your Supabase 'categories' table. Budgets won't save until you add it.")
      } else {
        setCategories(data)
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBudgetChange = (name, value) => {
    setCategories(prev => prev.map(c => c.name === name ? { ...c, monthly_budget: value } : c))
  }

  const saveBudgets = async () => {
    setSaving(true)
    setSuccessMsg('')
    try {
      // Supabase does not support bulk update directly via JS client without an upsert with PK
      // Assuming 'name' is unique, we can use upsert or iterate
      const promises = categories.map(c => 
        supabase
          .from('categories')
          .update({ monthly_budget: parseFloat(c.monthly_budget) || 0 })
          .eq('name', c.name)
      )
      
      await Promise.all(promises)
      setSuccessMsg('Budgets saved successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Error saving budgets:', err)
      setError('Failed to save budgets. Make sure you ran the SQL query to add the column.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    setAddingCategory(true)
    setError(null)
    setSuccessMsg('')
    try {
      const { error } = await supabase.from('categories').insert([{ name: newCategory.trim(), monthly_budget: 0 }])
      if (error) throw error
      setNewCategory('')
      fetchCategories()
      setSuccessMsg('Category added successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Error adding category:', err)
      setError('Failed to add category. It might already exist.')
    } finally {
      setAddingCategory(false)
    }
  }

  return (
    <div className="glass animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 className="text-h3" style={{ color: 'var(--accent)' }}>Category Budgets</h2>
        <button className="btn btn-primary" onClick={saveBudgets} disabled={saving || loading}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Budgets'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertTriangle size={20} />
          <p style={{ fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Info size={20} />
          <p style={{ fontSize: '0.875rem' }}>{successMsg}</p>
        </div>
      )}

      <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
        Set a monthly budget limit for your expense categories to get cautioned when you exceed them.
      </p>

      {/* Add New Category */}
      <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="New Category Name" 
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={addingCategory}>
          {addingCategory ? 'Adding...' : 'Add Category'}
        </button>
      </form>

      {loading ? (
        <div className="text-muted">Loading categories...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {categories.map((cat) => (
            <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-body" style={{ fontSize: '0.875rem', fontWeight: '500' }}>{cat.name}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                <input 
                  type="number" 
                  style={{ paddingLeft: '2rem' }}
                  value={cat.monthly_budget || ''} 
                  onChange={(e) => handleBudgetChange(cat.name, e.target.value)} 
                  placeholder="No limit"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
