import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar     from '../components/Navbar'
import MovieCard  from '../components/MovieCard'
import api        from '../api/axios'

const GENRES = ['All','Action','Sci-Fi','Thriller','Drama','Horror']

export default function HomePage() {
  const navigate             = useNavigate()
  const [trending, setTrending]   = useState([])
  const [filtered, setFiltered]   = useState([])
  const [genre,    setGenre]      = useState('All')
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState('')

  // Genre ID map for filtering
  const GENRE_IDS = { 'Action':28,'Sci-Fi':878,'Thriller':53,'Drama':18,'Horror':27 }

  useEffect(() => {
    api.get('/movies/trending')
      .then(res => {
        setTrending(res.data.movies)
        setFiltered(res.data.movies)
      })
      .catch(() => setError('Could not load trending movies.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (genre === 'All') { setFiltered(trending); return }
    const id = GENRE_IDS[genre]
    setFiltered(trending.filter(m => m.genre_ids?.includes(id)))
  }, [genre, trending])

  const s = {
    page:       { minHeight: '100vh', background: 'var(--bg-primary)' },
    hero:       { padding: '28px 28px 20px', borderBottom: '1px solid var(--border)' },
    heroLabel:  { fontSize: '11px', color: 'var(--accent)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' },
    heroTitle:  { fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '8px' },
    heroSub:    { fontSize: '13px', color: 'var(--text-muted)', maxWidth: '500px', lineHeight: 1.6, marginBottom: '20px' },
    section:    { padding: '20px 28px' },
    secHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' },
    secTitle:   { fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' },
    seeAll:     { fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'none' },
    grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' },
    pill: (active) => ({
      padding: '5px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s',
    }),
  }

  return (
    <div style={s.page}>
      <Navbar />

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroLabel}>AI-POWERED RECOMMENDATIONS</div>
        <div style={s.heroTitle}>Find your next<br />favourite movie</div>
        <div style={s.heroSub}>
          Search any movie and our AI instantly finds what to watch next — based on story, themes, and mood.
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(g)} style={s.pill(genre === g)}>{g}</button>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div style={s.section}>
        <div style={s.secHeader}>
          <div style={s.secTitle}>Trending this week</div>
          <span onClick={() => navigate('/discover')} style={s.seeAll}>See All →</span>
        </div>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'var(--bg-surface)', borderRadius: '8px', aspectRatio: '2/3', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>{error}</div>
        )}

        {!loading && !error && (
          <div style={s.grid}>
            {filtered.slice(0, 6).map(movie => (
              <MovieCard key={movie.tmdb_id} movie={movie} />
            ))}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', margin: '0 28px' }} />

      {/* Top picks — horizontal card style */}
      {!loading && trending.length > 0 && (
        <div style={s.section}>
          <div style={s.secHeader}>
            <div style={s.secTitle}>Top picks for you</div>
            <span onClick={() => navigate('/discover')} style={s.seeAll}>See All →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {trending.slice(6, 11).map((movie, i) => (
              <div key={movie.tmdb_id} onClick={() => navigate(`/movie/${movie.tmdb_id}`)}
                style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '10px', display: 'flex',
                  alignItems: 'center', gap: '12px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#444'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: '22px', fontWeight: 700, color: '#2a2a2a', width: '24px', flexShrink: 0 }}>
                  {i + 1}
                </span>
                {movie.poster_path ? (
                  <img src={movie.poster_path} alt={movie.title}
                    style={{ width: '36px', height: '52px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '36px', height: '52px', background: '#2a2a2a', borderRadius: '4px', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {movie.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                    {movie.year} · <span style={{ color: 'var(--rating)' }}>{movie.vote_average?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}