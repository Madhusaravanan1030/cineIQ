import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar    from '../components/Navbar'
import MovieCard from '../components/MovieCard'
import api       from '../api/axios'

// ─────────────────────────────────────────────
//  TMDB genre ID map — used to convert the genre
//  name the user clicks into the ID TMDB expects
// ─────────────────────────────────────────────
const GENRE_MAP = {
  'Action':    28,  'Adventure':  12,  'Animation': 16,
  'Comedy':    35,  'Crime':      80,  'Drama':     18,
  'Fantasy':   14,  'Horror':     27,  'Romance':   10749,
  'Sci-Fi':   878,  'Thriller':   53,  'Mystery':  9648,
}
const GENRES  = ['All', ...Object.keys(GENRE_MAP)]

const LANGUAGES = [
  { label: 'English', code: 'en' },
  { label: 'Hindi',   code: 'hi' },
  { label: 'Korean',  code: 'ko' },
  { label: 'French',  code: 'fr' },
  { label: 'Tamil',   code: 'ta' },
  { label: 'Japanese',code: 'ja' },
]

const RUNTIMES = [
  { label: 'Under 2h',    min: null, max: 119  },
  { label: '2h – 2h 30m', min: 120,  max: 150  },
  { label: 'Over 2h 30m', min: 151,  max: null },
]

const SORT_OPTIONS = [
  { label: 'Popularity',   value: 'popularity.desc'     },
  { label: 'Rating',       value: 'vote_average.desc'   },
  { label: 'Newest first', value: 'release_date.desc'   },
  { label: 'Oldest first', value: 'release_date.asc'    },
]

export default function DiscoverPage() {
  const [searchParams]             = useSearchParams()

  // ── State ──
  const [movies,    setMovies]     = useState([])
  const [loading,   setLoading]    = useState(false)
  const [error,     setError]      = useState('')
  const [total,     setTotal]      = useState(0)
  const [mode,      setMode]       = useState('trending') // 'trending' | 'search' | 'discover'

  // Filter state
  const [genre,     setGenre]      = useState('All')
  const [yearInput, setYearInput]  = useState('')
  const [langs,     setLangs]      = useState([])        // empty = no lang filter
  const [runtime,   setRuntime]    = useState(null)      // selected RUNTIMES entry or null
  const [sortBy,    setSortBy]     = useState('popularity.desc')

  // ── Fetch trending on first load ──
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setMode('search')
      fetchSearch(q)
    } else {
      setMode('trending')
      fetchTrending()
    }
  }, [searchParams])

  // ── Re-fetch from TMDB whenever filters change ──
  // We use useCallback so the function reference stays stable
  const fetchDiscover = useCallback(async (overrides = {}) => {
    // If no filters at all, fall back to trending
    const hasFilters =
      genre !== 'All' || yearInput.trim().length === 4 ||
      langs.length > 0 || runtime !== null

    if (!hasFilters && !overrides.force) {
      fetchTrending(); return
    }

    setLoading(true); setError(''); setMode('discover')
    try {
      const params = new URLSearchParams()
      params.set('sort_by', overrides.sort || sortBy)
      if (genre !== 'All' && GENRE_MAP[genre])
        params.set('genre', GENRE_MAP[genre])
      if (yearInput.trim().length === 4 && !isNaN(yearInput))
        params.set('year', yearInput.trim())
      if (langs.length === 1)
        params.set('language', langs[0])
      if (runtime) {
        if (runtime.min) params.set('runtime_min', runtime.min)
        if (runtime.max) params.set('runtime_max', runtime.max)
      }

      const res = await api.get(`/movies/discover?${params.toString()}`)
      setMovies(res.data.movies)
      setTotal(res.data.total)
    } catch {
      setError('Failed to load movies. Try again.')
    } finally {
      setLoading(false)
    }
  }, [genre, yearInput, langs, runtime, sortBy])

  // Re-fetch when any filter changes
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) return  // don't override search results
    fetchDiscover()
  }, [genre, yearInput, langs, runtime, sortBy])

  const fetchTrending = async () => {
    setLoading(true); setError(''); setMode('trending')
    try {
      const res = await api.get('/movies/trending')
      setMovies(res.data.movies)
      setTotal(res.data.movies.length)
    } catch { setError('Failed to load trending movies.') }
    finally  { setLoading(false) }
  }

  const fetchSearch = async (q) => {
    setLoading(true); setError('')
    try {
      const res = await api.get(`/movies/search?q=${encodeURIComponent(q)}`)
      setMovies(res.data.movies)
      setTotal(res.data.total || res.data.movies.length)
    } catch { setError('Search failed.') }
    finally  { setLoading(false) }
  }

  const toggleLang = (code) => {
    setLangs(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const toggleRuntime = (rt) => {
    setRuntime(prev => prev?.label === rt.label ? null : rt)
  }

  const clearAll = () => {
    setGenre('All'); setYearInput(''); setLangs([]); setRuntime(null)
    setSortBy('popularity.desc')
  }

  const hasFilters = genre !== 'All' || yearInput || langs.length > 0 || runtime

  // ── Styles ──
  const pill = (active) => ({
    padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
    cursor: 'pointer', flexShrink: 0,
    border:      `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background:  active ? 'var(--accent)' : 'transparent',
    color:       active ? '#fff' : 'var(--text-muted)',
    transition:  'all 0.15s',
  })

  const sideTitle = {
    fontSize: '11px', color: 'var(--text-faint)',
    letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px',
  }

  const checkBox = (checked) => ({
    width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
    border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
    background: checked ? 'var(--accent)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  })

  const query = searchParams.get('q') || ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* ── Header ── */}
      <div style={{ padding: '16px 28px 0' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          {mode === 'search'   && <>Showing <b style={{color:'var(--text-primary)'}}>{total} results</b> for "<b style={{color:'var(--text-primary)'}}>{query}</b>"</>}
          {mode === 'trending' && <>Showing <b style={{color:'var(--text-primary)'}}>trending movies this week</b></>}
          {mode === 'discover' && <>Found <b style={{color:'var(--text-primary)'}}>{total.toLocaleString()} movies</b> matching your filters</>}
        </div>

        {/* Genre pills — scrollable row */}
        <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'12px', scrollbarWidth:'none' }}>
          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(g)} style={pill(genre === g)}>{g}</button>
          ))}
        </div>

        {/* Sort bar */}
        <div style={{
          background:'var(--bg-surface)', border:'1px solid var(--border)',
          borderRadius:'8px', padding:'10px 16px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <span style={{fontSize:'12px',color:'var(--text-muted)'}}>Sort by</span>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'flex-end'}}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                padding:'3px 10px', fontSize:'11px', cursor:'pointer', borderRadius:'4px',
                background: sortBy===opt.value?'var(--accent)':'transparent',
                border:`1px solid ${sortBy===opt.value?'var(--accent)':'var(--border)'}`,
                color: sortBy===opt.value?'#fff':'var(--text-muted)',
              }}>{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'flex' }}>

        {/* ── Sidebar ── */}
        <div style={{
          width:'210px', flexShrink:0,
          borderRight:'1px solid var(--border)',
          padding:'16px',
        }}>

          {/* Year input */}
          <div style={{marginBottom:'20px'}}>
            <div style={sideTitle}>Release Year</div>
            <input
              type="number"
              placeholder="e.g. 2023"
              value={yearInput}
              onChange={e => setYearInput(e.target.value)}
              min="1900" max="2030"
              style={{
                width:'100%', background:'var(--bg-input)',
                border:`1px solid ${yearInput?'var(--accent)':'var(--border)'}`,
                borderRadius:'6px', padding:'7px 10px',
                fontSize:'12px', color:'var(--text-primary)', outline:'none',
              }}
            />
            <div style={{fontSize:'11px',color:'var(--text-faint)',marginTop:'5px'}}>
              Type a year to search TMDB's full database
            </div>
            {yearInput && (
              <button onClick={()=>setYearInput('')} style={{
                marginTop:'4px',fontSize:'11px',color:'var(--accent)',
                background:'none',border:'none',cursor:'pointer',padding:0,
              }}>✕ Clear</button>
            )}
          </div>

          {/* Language */}
          <div style={{marginBottom:'20px'}}>
            <div style={sideTitle}>Language</div>
            {LANGUAGES.map(({label,code}) => {
              const checked = langs.includes(code)
              return (
                <div key={code} onClick={()=>toggleLang(code)}
                  style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',cursor:'pointer'}}>
                  <div style={checkBox(checked)}>
                    {checked && <span style={{fontSize:'9px',color:'#fff',fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontSize:'12px',color:checked?'var(--text-primary)':'var(--text-muted)'}}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Runtime */}
          <div style={{marginBottom:'20px'}}>
            <div style={sideTitle}>Runtime</div>
            {RUNTIMES.map(rt => {
              const checked = runtime?.label === rt.label
              return (
                <div key={rt.label} onClick={()=>toggleRuntime(rt)}
                  style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px',cursor:'pointer'}}>
                  <div style={checkBox(checked)}>
                    {checked && <span style={{fontSize:'9px',color:'#fff',fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontSize:'12px',color:checked?'var(--text-primary)':'var(--text-muted)'}}>
                    {rt.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Clear all */}
          {hasFilters && (
            <button onClick={clearAll} style={{
              width:'100%',padding:'7px',fontSize:'12px',
              background:'transparent',border:'1px solid var(--border)',
              borderRadius:'6px',color:'var(--text-muted)',cursor:'pointer',
            }}>
              ✕ Clear all filters
            </button>
          )}
        </div>

        {/* ── Movie grid ── */}
        <div style={{flex:1,padding:'16px 20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
            <span style={{fontSize:'12px',color:'var(--text-faint)'}}>
              {loading ? 'Loading...' : `${movies.length} movies shown`}
            </span>
          </div>

          {/* Skeleton loading */}
          {loading && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'10px'}}>
              {[...Array(10)].map((_,i) => (
                <div key={i} style={{
                  background:'var(--bg-surface)',borderRadius:'8px',aspectRatio:'2/3',
                  animation:'pulse 1.5s ease-in-out infinite',
                }}/>
              ))}
            </div>
          )}

          {error && (
            <div style={{color:'var(--text-muted)',fontSize:'13px',padding:'20px 0'}}>{error}</div>
          )}

          {!loading && !error && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'10px'}}>
                {movies.map(movie => (
                  <MovieCard key={movie.tmdb_id} movie={movie} />
                ))}
              </div>

              {movies.length === 0 && (
                <div style={{textAlign:'center',padding:'60px 0'}}>
                  <div style={{fontSize:'32px',marginBottom:'12px'}}>🔍</div>
                  <div style={{color:'var(--text-muted)',fontSize:'14px',marginBottom:'8px'}}>
                    No movies found for these filters
                  </div>
                  <button onClick={clearAll} style={{
                    color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontSize:'13px',
                  }}>Clear all filters</button>
                </div>
              )}

              <div style={{textAlign:'center',padding:'24px',fontSize:'12px',color:'var(--text-faint)'}}>
                — End of Search —
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}