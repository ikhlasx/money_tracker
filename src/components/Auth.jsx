import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Wallet } from 'lucide-react'

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
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass animate-fade-in" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Wallet size={40} color="#3b82f6" />
          </div>
          <h1 className="text-h2">IMPEX MoneyTracker</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {message.text && (
          <div style={{
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: message.type === 'error' ? '#ef4444' : '#10b981',
            border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-muted" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-muted" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-muted" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => {setIsLogin(!isLogin); setMessage({text: '', type: ''})}}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#3b82f6', 
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
