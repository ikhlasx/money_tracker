import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage({ text: 'Check your email for the login link!', type: 'success' })
      }
    } catch (error) {
      setMessage({ text: error.message || error.error_description, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="soft-card animate-fade-in p-8 w-full max-w-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
        
        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-primary-fixed text-on-primary-fixed rounded-3xl flex items-center justify-center mb-4 shadow-sm">
            <span className="material-symbols-outlined text-[32px]">account_balance_wallet</span>
          </div>
          <h1 className="text-display-lg-mobile text-primary font-bold">MoneyTracker</h1>
          <p className="text-body-lg text-on-surface-variant mt-2 text-center">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {message.text && (
          <div className={`p-4 rounded-2xl mb-6 flex items-center gap-3 relative z-10 ${message.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-[#009668]/10 text-[#005236]'}`}>
            <span className="material-symbols-outlined">
              {message.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <p className="text-body-sm font-medium">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5 relative z-10">
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant ml-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="input-field rounded-2xl px-4 py-3.5 text-body-lg text-on-surface w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant ml-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="input-field rounded-2xl px-4 py-3.5 text-body-lg text-on-surface w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            className="bg-secondary text-on-secondary px-6 py-4 rounded-full font-bold hover:bg-secondary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-secondary/20 mt-4" 
            type="submit" 
            disabled={loading}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined">{isLogin ? 'login' : 'person_add'}</span>
            )}
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-body-sm text-on-surface-variant text-center mt-8 relative z-10">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => {setIsLogin(!isLogin); setMessage({text: '', type: ''})}}
            className="text-secondary font-bold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
