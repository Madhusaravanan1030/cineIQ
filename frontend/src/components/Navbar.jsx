import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, logout, isLoggedIn } = useAuth()
  const [query, setQuery] = useState('')

  const isActive = (path) => location.pathname === path

  const handleSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    // Navigate to discover page with search query in URL
    // ?q=inception → DiscoverPage reads this and searches
    navigate(`/discover?q=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Initials for avatar — "Vidya Sagar" → "VS"
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U'

  return (
    <nav style={{
      background:   'var(--bg-primary)',
      borderBottom: '1px solid var(--border)',
      height:       '56px',
      display:      'flex',
      alignItems:   'center',
      padding:      '0 28px',
      gap:          '20px',
      position:     'sticky',
      top:          0,
      zIndex:       100,   // stays above everything while scrolling
    }}>

      {/* Logo */}
      <Link to="/" style={{
        fontSize:      '20px',
        fontWeight:    700,
        color:         'var(--accent)',
        letterSpacing: '1px',
        fontStyle:     'italic',
        textDecoration:'none',
        flexShrink:    0,
      }}>
        cineIQ
      </Link>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '480px', position: 'relative' }}>
        <span style={{
          position:  'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '15px',
        }}>⌕</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, genres..."
          style={{
            width:        '100%',
            background:   'var(--bg-surface)',
            border:       `1px solid ${query ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '8px',
            padding:      '8px 12px 8px 36px',
            fontSize:     '13px',
            color:        'var(--text-primary)',
            outline:      'none',
            transition:   'border-color 0.2s',
          }}
        />
      </form>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '24px', marginLeft: '8px' }}>
        {[
          { label: 'Home',      path: '/' },
          { label: 'Discover',  path: '/discover' },
          { label: 'WatchList', path: '/watchlist' },
        ].map(({ label, path }) => (
          <Link key={path} to={path} style={{
            fontSize:       '13px',
            fontWeight:     isActive(path) ? 600 : 400,
            color:          isActive(path) ? 'var(--text-primary)' : 'var(--text-muted)',
            textDecoration: 'none',
            transition:     'color 0.15s',
          }}>
            {label}
          </Link>
        ))}
      </div>

      {/* Avatar / Login button */}
      <div style={{ marginLeft: 'auto' }}>
        {isLoggedIn ? (
          <div
            onClick={handleLogout}
            title={`Logged in as ${user?.username} — click to logout`}
            style={{
              width:        '32px', height: '32px',
              borderRadius: '50%',
              background:   'var(--bg-surface)',
              border:       '1.5px solid var(--accent)',
              display:      'flex', alignItems: 'center', justifyContent: 'center',
              color:        'var(--text-primary)',
              fontSize:     '11px', fontWeight: 600,
              cursor:       'pointer',
            }}
          >
            {initials}
          </div>
        ) : (
          <Link to="/login" style={{
            padding:       '6px 16px',
            background:    'var(--accent)',
            borderRadius:  '6px',
            color:         '#fff',
            fontSize:      '12px',
            fontWeight:    500,
            textDecoration:'none',
          }}>
            Sign in
          </Link>
        )}
      </div>

    </nav>
  )
}
