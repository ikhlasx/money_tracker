import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function BudgetSettings() {
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [editBudget, setEditBudget] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch categories
      let { data: catData, error: catError } = await supabase.from('categories').select('name, monthly_budget')
      if (catError) {
        console.warn("Could not fetch monthly_budget. Have you added the column?", catError)
        const fallback = await supabase.from('categories').select('name')
        if (fallback.error) throw fallback.error
        catData = fallback.data.map(c => ({ ...c, monthly_budget: 0 }))
      }

      // Fetch this month's expenses
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      const { data: txnData, error: txnError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'Expense')
        .gte('txn_date', startOfMonth.toISOString().split('T')[0])
      
      if (txnError) throw txnError

      setCategories(catData || [])
      setTransactions(txnData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSpent = (catName) => {
    return transactions
      .filter(t => t.category === catName)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
  }

  const totalBudget = categories.reduce((sum, c) => sum + (c.monthly_budget || 0), 0)
  const totalSpent = categories.reduce((sum, c) => sum + getSpent(c.name), 0)
  const overallProgress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  const handleSaveBudget = async (name) => {
    if (!editBudget) return setEditingCat(null)
    setSaving(true)
    try {
      await supabase
        .from('categories')
        .update({ monthly_budget: parseFloat(editBudget) || 0 })
        .eq('name', name)
      setCategories(prev => prev.map(c => c.name === name ? { ...c, monthly_budget: parseFloat(editBudget) || 0 } : c))
      setEditingCat(null)
    } catch (err) {
      console.error('Error saving budget:', err)
      alert('Failed to save budget.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    setAddingCategory(true)
    try {
      const { error } = await supabase.from('categories').insert([{ name: newCategory.trim(), monthly_budget: 0 }])
      if (error) throw error
      setNewCategory('')
      fetchData()
    } catch (err) {
      console.error('Error adding category:', err)
      alert('Failed to add category. It might already exist.')
    } finally {
      setAddingCategory(false)
    }
  }

  const getIconForCategory = (category) => {
    const cat = category?.toLowerCase() || ''
    if (cat.includes('food') || cat.includes('grocery')) return 'restaurant'
    if (cat.includes('transport') || cat.includes('fuel')) return 'local_gas_station'
    if (cat.includes('shop')) return 'shopping_bag'
    if (cat.includes('bill') || cat.includes('utilit')) return 'receipt_long'
    if (cat.includes('health') || cat.includes('medic')) return 'medical_services'
    if (cat.includes('entert')) return 'movie'
    return 'category'
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Header */}
      <div className="mb-8 lg:mb-12">
        <h1 className="text-display-lg-mobile lg:text-display-lg text-primary mb-2">Budget Settings</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Take control of your finances by setting smart limits. We'll notify you when you're getting close to your targets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* Left Column: Summary & Insights */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="card-tint-primary rounded-[32px] p-6 lg:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-secondary/20 transition-colors duration-500"></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-secondary-container text-on-secondary-container rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[24px]">account_balance</span>
              </div>
              
              <h2 className="text-body-lg font-bold text-on-surface mb-1">Overall Budget</h2>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-display-lg font-bold text-primary">₹{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                <span className="text-body-lg text-on-surface-variant mb-2">/ ₹{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
              </div>

              <div className="h-3 bg-surface-container-highest rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${overallProgress > 90 ? 'bg-error' : 'bg-secondary'}`}
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
                {overallProgress > 90 ? (
                  <><span className="material-symbols-outlined text-[16px] text-error">warning</span> Approaching limit</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span> On track this month</>
                )}
              </p>
            </div>
          </div>

          <div className="soft-card bg-tertiary-fixed/30 p-6 rounded-[24px]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">lightbulb</span>
              </div>
              <div>
                <h3 className="text-body-lg font-bold text-on-surface mb-1">Smart Insight</h3>
                <p className="text-body-sm text-on-surface-variant">
                  {overallProgress > 90 
                    ? "You've spent a large portion of your overall budget. Consider reducing non-essential expenses." 
                    : "You're managing your budget well. Keep up the good habits!"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Category Settings */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="card-tint-primary rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0 hidden sm:flex">
              <span className="material-symbols-outlined">add_task</span>
            </div>
            <form onSubmit={handleAddCategory} className="flex-1 flex w-full flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="New category name..." 
                className="input-field rounded-2xl px-4 py-3 flex-1 text-body-lg text-on-surface"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                required
              />
              <button 
                type="submit" 
                disabled={addingCategory}
                className="bg-secondary text-on-secondary px-6 py-3 rounded-2xl font-bold hover:bg-secondary/90 active:scale-[0.98] transition-all whitespace-nowrap flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                {addingCategory ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>

          <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
            <h2 className="text-headline-md font-headline-md text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">tune</span>
              Category Limits
            </h2>

            {loading ? (
              <p className="text-on-surface-variant">Loading categories...</p>
            ) : (
              <div className="flex flex-col gap-6">
                {categories.map((cat) => {
                  const spent = getSpent(cat.name)
                  const budget = cat.monthly_budget || 0
                  const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
                  const icon = getIconForCategory(cat.name)
                  const isEditing = editingCat === cat.name

                  return (
                    <div key={cat.name} className="group p-4 -mx-4 rounded-2xl hover:bg-surface-container-lowest transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined">{icon}</span>
                          </div>
                          <div>
                            <h3 className="text-body-lg font-bold text-on-surface">{cat.name}</h3>
                            <p className="text-body-sm text-on-surface-variant">
                              Spent ₹{spent.toLocaleString(undefined, { minimumFractionDigits: 0 })} {budget > 0 && `of ₹${budget.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
                            </p>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">₹</span>
                              <input 
                                type="number" 
                                className="input-field rounded-xl pl-8 pr-3 py-2 w-32 text-body-lg text-on-surface"
                                value={editBudget}
                                onChange={(e) => setEditBudget(e.target.value)}
                                placeholder="0"
                                autoFocus
                              />
                            </div>
                            <button 
                              onClick={() => handleSaveBudget(cat.name)}
                              disabled={saving}
                              className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:bg-secondary/90 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">check</span>
                            </button>
                            <button 
                              onClick={() => setEditingCat(null)}
                              className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-surface-container-highest transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-body-lg font-bold text-primary">₹{budget.toLocaleString()}</p>
                              <p className="text-label-caps text-on-surface-variant">Limit</p>
                            </div>
                            <button 
                              onClick={() => { setEditingCat(cat.name); setEditBudget(cat.monthly_budget || ''); }}
                              className="w-10 h-10 rounded-full text-outline hover:bg-surface-container-high hover:text-secondary flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {budget > 0 && (
                        <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${progress > 90 ? 'bg-error progress-bar-glow shadow-error/20' : 'bg-secondary progress-bar-glow'}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
