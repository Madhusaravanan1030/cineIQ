import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ─────────────────────────────────────────────
//  ProtectedRoute — guards pages that need login
//
//  Usage in App.jsx:
//    <Route path="/watchlist" element={
//      <ProtectedRoute><WatchlistPage /></ProtectedRoute>
//    } />
//
//  If user is NOT logged in → redirect to /login
//  If user IS logged in     → show the page normally
//
//  'loading' check prevents a flash where the
//  page briefly shows then redirects (while
//  AuthContext is verifying the saved token)
// ─────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--accent)', fontSize: '24px', fontWeight: 700, letterSpacing: 2 }}>
          cineIQ
        </div>
      </div>
    )
  }

  return isLoggedIn ? children : <Navigate to="/login" replace />
}

export default ProtectedRoute
