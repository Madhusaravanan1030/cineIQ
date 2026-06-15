import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import LoginPage       from './pages/LoginPage'
import HomePage        from './pages/HomePage'
import DiscoverPage    from './pages/DiscoverPage'
import MovieDetailPage from './pages/MovieDetailPage'
import WatchlistPage   from './pages/WatchlistPage'

// ─────────────────────────────────────────────
//  App.jsx is the root of the entire frontend.
//
//  BrowserRouter  — enables URL-based navigation
//  AuthProvider   — wraps everything so any page
//                   can access login state
//  Routes/Route   — map URLs to page components
//
//  URL structure:
//    /login          → LoginPage  (no auth needed)
//    /               → HomePage   (no auth needed)
//    /discover       → DiscoverPage
//    /movie/:id      → MovieDetailPage (:id = tmdb_id)
//    /watchlist      → WatchlistPage (login required)
// ─────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/"           element={<HomePage />} />
          <Route path="/discover"   element={<DiscoverPage />} />
          <Route path="/movie/:id"  element={<MovieDetailPage />} />
          <Route path="/watchlist"  element={
            <ProtectedRoute>
              <WatchlistPage />
            </ProtectedRoute>
          } />
          {/* Catch-all — redirect unknown URLs to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
