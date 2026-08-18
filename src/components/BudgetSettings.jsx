import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const DEFAULT_CARDS = ['Cash', 'IOB', 'FED', 'Other']

export default function BudgetSettings() {
  const [categories,    setCategories]    = useState([])
  const [transactions,  setTransactions]  = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [newCategory,   setNewCategory]   = useState('')
  const [addingCategory,setAddingCategory]= useState(false)
  const [editingCat,    setEditingCat]    = useState(null)
  const [editBudget,    setEditBudget]    = useState('')

  const [cards,         setCards]         = useState([])
  const [cardsLoading,  setCardsLoading]  = useState(true)
  const [newCard,       setNewCard]       = useState('')
  const [addingCard,    setAddingCard]    = useState(false)
  const [deletingCard,  setDeletingCard]  = useState(null)

  useEffect(() => { fetchData(); fetchCards() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      let { data: catData, error: catError } = await supabase.from('categories').select('name, monthly_budget')
      if (catError) {
        const fallback = await supabase.from('categories').select('name')
        if (fallback.error) throw fallback.error
        catData = fallback.data.map(c => ({ ...c, monthly_budget: 0 }))
      }
      const startOfMonth = new Date(); startOfMonth.setDate(1)
      const { data: txnData, error: txnError } = await supabase
        .from('transactions').select('*').eq('type', 'Expense')
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

  const fetchCards = async () => {
    try {
      setCardsLoading(true)
      const { data, error } = await supabase.from('cards').select('id, name').order('id')
      if (error) throw error
      setCards(data && data.length > 0 ? data : DEFAULT_CARDS.map(name => ({ name })))
    } catch (err) {
      console.error('Error fetching cards (does the "cards" table exist yet?):', err)
      setCards(DEFAULT_CARDS.map(name => ({ name })))
    } finally {
      setCardsLoading(false)
    }
  }

  const handleAddCard = async (e) => {
    e.preventDefault()
    if (!newCard.trim()) return
    setAddingCard(true)
    try {
      const { error } = await supabase.from('cards').insert([{ name: newCard.trim() }])
      if (error) throw error
      setNewCard('')
      fetchCards()
    } catch (err) {
      console.error('Error adding card:', err)
      alert('Failed to add card. It might already exist, or the "cards" table has not been created in Supabase yet.')
    } finally {
      setAddingCard(false)
    }
  }

  const handleDeleteCard = async (card) => {
    if (!card.id) return
    if (!window.confirm(`Remove card "${card.name}"? Existing transactions on this card will keep their record but it will no longer appear as an option.`)) return
    setDeletingCard(card.name)
    try {
      const { error } = await supabase.from('cards').delete().eq('id', card.id)
      if (error) throw error
      fetchCards()
    } catch (err) {
      console.error('Error deleting card:', err)
      alert('Failed to delete card.')
    } finally {
      setDeletingCard(null)
    }
  }

  const getSpent = (catName) =>
    transactions.filter(t => t.category === catName).reduce((s, t) => s + parseFloat(t.amount), 0)

  const totalBudget   = categories.reduce((s, c) => s + (c.monthly_budget || 0), 0)
  const totalSpent    = categories.reduce((s, c) => s + getSpent(c.name), 0)
  const overallProgress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  const handleSaveBudget = async (name) => {
    if (!editBudget) return setEditingCat(null)
    setSaving(true)
    try {
      await supabase.from('categories').update({ monthly_budget: parseFloat(editBudget) || 0 }).eq('name', name)
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
      <div className="mb-8 lg:mb-12">
        <h1 className="text-display-lg-mobile lg:text-display-lg text-primary mb-2">Budget Settings</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Take control of your finances by setting smart limits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

        {/* Left column — summary */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">

          {/* Overall budget — amber glass */}
          <div className="glass-amber rounded-[32px] p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-300 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[24px]">account_balance</span>
              </div>
              <h2 className="text-body-lg font-bold text-on-surface mb-1">Overall Budget</h2>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-display-lg font-bold text-amber-100">₹{totalSpent.toLocaleString()}</span>
                <span className="text-body-lg text-amber-300/60 mb-2">/ ₹{totalBudget.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-1000 progress-bar-glow ${overallProgress > 90 ? 'bg-red-400' : 'bg-amber-400'}`}
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
                {overallProgress > 90 ? (
                  <><span className="material-symbols-outlined text-[16px] text-red-400">warning</span> Approaching limit</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span> On track this month</>
                )}
              </p>
            </div>
          </div>

          {/* Smart insight — green glass */}
          <div className="glass-green p-6 rounded-[24px]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">lightbulb</span>
              </div>
              <div>
                <h3 className="text-body-lg font-bold text-on-surface mb-1">Smart Insight</h3>
                <p className="text-body-sm text-on-surface-variant">
                  {overallProgress > 90
                    ? "You've spent a large portion of your budget. Consider reducing non-essential expenses."
                    : "You're managing your budget well. Keep up the good habits!"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — category settings */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Add category — violet glass */}
          <div className="glass-violet rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0 hidden sm:flex">
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
                className="bg-violet-500/80 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-bold active:scale-[0.98] transition-all whitespace-nowrap flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                {addingCategory ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>

          {/* Add card — cyan glass */}
          <div className="glass-cyan rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 hidden sm:flex">
              <span className="material-symbols-outlined">add_card</span>
            </div>
            <form onSubmit={handleAddCard} className="flex-1 flex w-full flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="New card / account name..."
                className="input-field rounded-2xl px-4 py-3 flex-1 text-body-lg text-on-surface"
                value={newCard}
                onChange={(e) => setNewCard(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={addingCard}
                className="bg-cyan-500/80 hover:bg-cyan-500 text-white px-6 py-3 rounded-2xl font-bold active:scale-[0.98] transition-all whitespace-nowrap flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                {addingCard ? 'Adding...' : 'Add Card'}
              </button>
            </form>
          </div>

          {/* Cards list — base glass */}
          <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
            <h2 className="text-headline-md font-headline-md text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">credit_card</span>
              Cards &amp; Accounts
            </h2>

            {cardsLoading ? (
              <p className="text-on-surface-variant">Loading cards...</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {cards.map((card) => (
                  <div
                    key={card.id || card.name}
                    className="group flex items-center gap-2 pl-4 pr-2 py-2 rounded-2xl bg-white/8 border border-white/10"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">account_balance_wallet</span>
                    <span className="text-body-lg font-bold text-on-surface">{card.name}</span>
                    {card.id && (
                      <button
                        onClick={() => handleDeleteCard(card)}
                        disabled={deletingCard === card.name}
                        className="w-8 h-8 rounded-full text-on-surface-variant hover:bg-red-500/20 hover:text-red-300 flex items-center justify-center transition-colors"
                        title={`Remove ${card.name}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category limits — base glass */}
          <div className="card-tint-primary rounded-[32px] p-6 lg:p-8">
            <h2 className="text-headline-md font-headline-md text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant">tune</span>
              Category Limits
            </h2>

            {loading ? (
              <p className="text-on-surface-variant">Loading categories...</p>
            ) : (
              <div className="flex flex-col gap-6">
                {categories.map((cat) => {
                  const spent    = getSpent(cat.name)
                  const budget   = cat.monthly_budget || 0
                  const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
                  const icon     = getIconForCategory(cat.name)
                  const isEditing = editingCat === cat.name
                  const isOver   = budget > 0 && spent > budget

                  return (
                    <div key={cat.name} className="group p-4 -mx-4 rounded-2xl hover:bg-white/5 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white/8 text-on-surface-variant flex items-center justify-center shrink-0 border border-white/10">
                            <span className="material-symbols-outlined">{icon}</span>
                          </div>
                          <div>
                            <h3 className="text-body-lg font-bold text-on-surface">{cat.name}</h3>
                            <p className="text-body-sm text-on-surface-variant">
                              Spent ₹{spent.toLocaleString()} {budget > 0 && `of ₹${budget.toLocaleString()}`}
                            </p>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">₹</span>
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
                              className="w-10 h-10 rounded-full bg-emerald-500/80 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">check</span>
                            </button>
                            <button
                              onClick={() => setEditingCat(null)}
                              className="w-10 h-10 rounded-full bg-white/10 text-on-surface-variant flex items-center justify-center hover:bg-white/15 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-body-lg font-bold ${isOver ? 'text-red-400' : 'text-primary'}`}>₹{budget.toLocaleString()}</p>
                              <p className="text-label-caps text-on-surface-variant">Limit</p>
                            </div>
                            <button
                              onClick={() => { setEditingCat(cat.name); setEditBudget(cat.monthly_budget || '') }}
                              className="w-10 h-10 rounded-full text-on-surface-variant hover:bg-white/10 hover:text-amber-300 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {budget > 0 && (
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 progress-bar-glow ${progress > 90 ? 'bg-red-400' : 'bg-emerald-400'}`}
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
