import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

// ─────────────────────────────────────────────
//  What is React Context?
//
//  Normally, to pass data from a parent to a
//  child component you use props. But if you
//  need the SAME data (e.g. "is user logged in?")
//  in many components far apart in the tree,
//  passing props through every level is painful.
//
//  Context solves this — it's like a global
//  store that ANY component can read from.
//
//  AuthContext stores: user, token, login, logout
//  Any component can call: const { user } = useAuth()
// ─────────────────────────────────────────────

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  // Load saved user from localStorage on first render
  // This keeps the user logged in after page refresh
  const [user,    setUser]    = useState(() => {
    const saved = localStorage.getItem('cineiq_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token,   setToken]   = useState(() => localStorage.getItem('cineiq_token'))
  const [loading, setLoading] = useState(true)

  // On app start, verify the saved token is still valid
  // (token could have expired while user was away)
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return }
      try {
        const res = await api.get('/auth/me')
        setUser(res.data.user)
      } catch {
        // Token invalid or expired — clear everything
        logout()
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, []) // empty array = run once on mount

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem('cineiq_user',  JSON.stringify(userData))
    localStorage.setItem('cineiq_token', authToken)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('cineiq_user')
    localStorage.removeItem('cineiq_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — makes using context cleaner
// Instead of: const { user } = useContext(AuthContext)
// You write:   const { user } = useAuth()
export const useAuth = () => useContext(AuthContext)
