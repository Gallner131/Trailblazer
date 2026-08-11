import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../styles/auth.css'

export default function AuthScreen() {
  const { signIn, signUp, signInWithOAuth, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      if (isSignUp) {
        await signUp(email, password)
        setMessage('Check your email to confirm your account')
        setEmail('')
        setPassword('')
      } else {
        await signIn(email, password)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true)
    try {
      await signInWithOAuth(provider)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="phone">
      <div className="gate">
        <h2>Daily Segment</h2>
        <p style={{ marginBottom: '32px' }}>A new running challenge every day, right near you.</p>

        <form onSubmit={handleEmailAuth} style={{ width: '100%', marginBottom: '24px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              fontSize: '15px',
              marginBottom: '12px',
              fontFamily: 'inherit'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              fontSize: '15px',
              marginBottom: '16px',
              fontFamily: 'inherit'
            }}
          />
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        <div style={{ marginBottom: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
          or
        </div>

        <button
          onClick={() => handleOAuth('google')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            marginBottom: '12px',
            background: 'var(--card)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Sign in with Google
        </button>

        <button
          onClick={() => handleOAuth('apple')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            background: 'var(--card)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Sign in with Apple
        </button>

        {error && <div className="errbox" style={{ marginTop: '24px' }}>{error}</div>}
        {message && (
          <div style={{ color: '#067647', background: '#e7f8ef', padding: '12px 14px', borderRadius: '12px', marginTop: '24px', fontSize: '14px' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
