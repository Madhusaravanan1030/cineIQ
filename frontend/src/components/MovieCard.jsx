import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

// ─────────────────────────────────────────────
//  MovieCard — reusable card used on:
//   HomePage (trending grid)
//   DiscoverPage (search results grid)
//   MovieDetailPage (recommendations grid)
//
//  Props:
//   movie        — movie data object
//   showMatch    — show "X% match" bar (detail page only)
// ─────────────────────────────────────────────
export default function MovieCard({ movie, showMatch = false }) {
  const navigate           = useNavigate()
  const { isLoggedIn }     = useAuth()
  const [liked, setLiked]  = useState(false)
  const [adding, setAdding]= useState(false)

  const handleCardClick = () => {
    if (movie.tmdb_id) navigate(`/movie/${movie.tmdb_id}`)
  }

  const handleHeart = async (e) => {
    e.stopPropagation()  // prevent card click from firing
    if (!isLoggedIn) { navigate('/login'); return }
    if (adding) return

    setAdding(true)
    try {
      await api.post('/watchlist', {
        tmdb_id:      movie.tmdb_id,
        title:        movie.title,
        poster_path:  movie.poster_path,
        vote_average: movie.vote_average,
        year:         movie.year,
        genre:        movie.genres?.[0] || '',
      })
      setLiked(true)
    } catch (err) {
      // Already in watchlist — still show as liked
      if (err.response?.status === 400) setLiked(true)
    } finally {
      setAdding(false)
    }
  }

  // Fallback gradient when TMDB has no poster
  const gradients = [
    '#1a2a3a','#1a1a2a','#0d1a2a','#1a2a1a',
    '#2a1a0a','#1a1500','#0a1520','#1a0a0a',
  ]
  const fallbackBg = gradients[
    (movie.title?.charCodeAt(0) || 0) % gradients.length
  ]

  return (
    <div
      onClick={handleCardClick}
      style={{
        background:    'var(--bg-surface)',
        borderRadius:  '8px',
        overflow:      'hidden',
        border:        '1px solid #222',
        cursor:        movie.tmdb_id ? 'pointer' : 'default',
        transition:    'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#444'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#222'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Poster */}
      <div style={{
        width:          '100%',
        aspectRatio:    '2/3',
        background:     fallbackBg,
        position:       'relative',
        overflow:       'hidden',
      }}>
        {movie.poster_path ? (
          <img
            src={movie.poster_path}
            alt={movie.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"   // don't load until visible — faster page load
          />
        ) : (
          // Fallback when no poster
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '28px' }}>🎬</span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', textAlign: 'center', padding: '0 8px' }}>
              {movie.title}
            </span>
          </div>
        )}

        {/* Heart / Watchlist button — top right */}
        <button
          onClick={handleHeart}
          title={liked ? 'Added to watchlist' : 'Add to watchlist'}
          style={{
            position:     'absolute', top: '8px', right: '8px',
            width:        '28px', height: '28px',
            borderRadius: '6px',
            background:   'rgba(0,0,0,0.65)',
            border:       `1px solid ${liked ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
            color:        liked ? 'var(--accent)' : '#aaa',
            fontSize:     '14px',
            cursor:       'pointer',
            display:      'flex', alignItems: 'center', justifyContent: 'center',
            transition:   'all 0.15s',
          }}
        >
          {liked ? '♥' : '♡'}
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: '8px' }}>
        <div style={{
          fontSize:     '12px', fontWeight: 500,
          color:        'var(--text-primary)',
          whiteSpace:   'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: '4px',
        }}>
          {movie.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: 'var(--rating)' }}>
            ★ {movie.vote_average?.toFixed(1) || 'N/A'}
          </span>
          {movie.genres?.[0] && (
            <span style={{
              fontSize: '10px', color: 'var(--text-faint)',
              background: '#222', padding: '2px 6px', borderRadius: '4px',
            }}>
              {movie.genres[0]}
            </span>
          )}
        </div>

        {/* Match % bar — only on recommendation results */}
        {showMatch && movie.match_percent && (
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--accent)', marginBottom: '3px' }}>
              ✦ {movie.match_percent}% match
            </div>
            <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px' }}>
              <div style={{
                height: '100%', borderRadius: '1px',
                background: 'var(--accent)',
                width: `${movie.match_percent}%`,
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
