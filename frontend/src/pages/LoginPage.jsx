import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function LoginPage() {
  const navigate       = useNavigate()
  const { login }      = useAuth()
  const [tab, setTab]  = useState('signin')  // 'signin' | 'signup'

  // Sign in state
  const [signInData, setSignInData] = useState({ email: '', password: '' })
  // Sign up state
  const [signUpData, setSignUpData] = useState({ username: '', email: '', password: '', confirmPassword: '' })

  const [showPass,  setShowPass]  = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [googleMsg, setGoogleMsg] = useState('')

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/login', signInData)
      login(res.data.user, res.data.token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Try again.')
    } finally { setLoading(false) }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match.'); return
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        username: signUpData.username,
        email:    signUpData.email,
        password: signUpData.password,
      })
      login(res.data.user, res.data.token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.')
    } finally { setLoading(false) }
  }

  const handleGoogle = () => {
    setGoogleMsg('Google login coming soon. Please use email & password for now.')
    setTimeout(() => setGoogleMsg(''), 4000)
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: '8px',
    padding: '11px 14px', fontSize: '13px', color: 'var(--text-primary)',
    outline: 'none',
  }
  const labelStyle = { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent)', fontStyle: 'italic', letterSpacing: '1px' }}>
          cineIQ
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Your AI movie companion
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', border: '1px solid var(--border)',
        borderRadius: '8px', overflow: 'hidden', marginBottom: '20px', width: '320px',
      }}>
        {[['signin', 'Sign in'], ['signup', 'Create Account']].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setError('') }} style={{
            flex: 1, padding: '10px', fontSize: '13px', fontWeight: 500,
            background:    tab === key ? 'transparent' : 'transparent',
            color:         tab === key ? 'var(--accent)' : 'var(--text-primary)',
            border:        tab === key ? `1px solid var(--accent)` : '1px solid transparent',
            borderRadius:  '7px', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Card */}
      <div style={{
        width: '320px', background: '#161616',
        border: '1px solid var(--border)', borderRadius: '14px', padding: '28px 24px',
      }}>
        {error && (
          <div style={{
            background: '#E5091420', border: '1px solid #E5091440',
            borderRadius: '7px', padding: '10px 12px',
            fontSize: '12px', color: '#ff6b6b', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {/* SIGN IN FORM */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="you@example.com" required style={inputStyle}
                value={signInData.email}
                onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••" required style={inputStyle}
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '14px',
                }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer' }}>
                  Forget password?
                </span>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px',
              background: loading ? '#888' : 'transparent',
              border: '1.5px solid var(--accent)',
              borderRadius: '8px', color: 'var(--text-primary)',
              fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-faint)' }}>
              or continue with
            </div>
            {googleMsg && (
              <div style={{ fontSize:'12px', color:'var(--accent)', textAlign:'center', padding:'4px 0' }}>
                {googleMsg}
              </div>
            )}
            <button type="button" onClick={handleGoogle} style={{
              width: '100%', padding: '10px',
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text-muted)',
              fontSize: '13px', cursor: 'pointer',
            }}>
              G &nbsp; Google
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input type="text" placeholder="Username" required style={inputStyle}
                value={signUpData.username}
                onChange={(e) => setSignUpData({ ...signUpData, username: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="Email Address" required style={inputStyle}
                value={signUpData.email}
                onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Create Password</label>
              <input type="password" placeholder="At least 8 Characters" required minLength={8} style={inputStyle}
                value={signUpData.password}
                onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" placeholder="Confirm Password" required style={inputStyle}
                value={signUpData.confirmPassword}
                onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px',
              background: loading ? '#888' : 'var(--accent)',
              border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '14px', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px',
            }}>
              {loading ? 'Creating...' : 'Sign Up'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-faint)' }}>
              or continue with
            </div>
            {googleMsg && (
              <div style={{ fontSize:'12px', color:'var(--accent)', textAlign:'center', padding:'4px 0' }}>
                {googleMsg}
              </div>
            )}
            <button type="button" onClick={handleGoogle} style={{
              width: '100%', padding: '10px',
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text-muted)',
              fontSize: '13px', cursor: 'pointer',
            }}>
              G &nbsp; Google
            </button>
          </form>
        )}
      </div>

      {/* Footer text */}
      <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '16px' }}>
        {tab === 'signin' ? (
          <>New to cineIQ?{' '}
            <span onClick={() => setTab('signup')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
              Create account
            </span>
          </>
        ) : (
          <>Already have an account?{' '}
            <span onClick={() => setTab('signin')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
              Sign In
            </span>
          </>
        )}
      </div>
    </div>
  )
}