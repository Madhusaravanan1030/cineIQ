import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar    from '../components/Navbar'
import MovieCard from '../components/MovieCard'
import api       from '../api/axios'

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
  { label: 'Title A–Z',   value: 'original_title.asc'  },
]

export default function DiscoverPage() {
  const [searchParams]             = useSearchParams()
  const [movies,      setMovies]   = useState([])
  const [loading,     setLoading]  = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]    = useState('')
  const [total,       setTotal]    = useState(0)
  const [page,        setPage]     = useState(1)
  const [totalPages,  setTotalPages] = useState(1)
  const [mode,        setMode]     = useState('trending')

  const [genre,     setGenre]    = useState('All')
  const [yearInput, setYearInput]= useState('')
  const [langs,     setLangs]    = useState([])
  const [runtime,   setRuntime]  = useState(null)
  const [sortBy,    setSortBy]   = useState('popularity.desc')

  // Build discover URL params
  const buildParams = useCallback((pageNum = 1) => {
    const params = new URLSearchParams()
    params.set('sort_by', sortBy)
    params.set('page', pageNum)
    if (genre !== 'All' && GENRE_MAP[genre]) params.set('genre', GENRE_MAP[genre])
    if (yearInput.trim().length === 4 && !isNaN(yearInput)) params.set('year', yearInput.trim())
    if (langs.length === 1) params.set('language', langs[0])
    if (runtime) {
      if (runtime.min) params.set('runtime_min', runtime.min)
      if (runtime.max) params.set('runtime_max', runtime.max)
    }
    return params.toString()
  }, [genre, yearInput, langs, runtime, sortBy])

  // Initial / filter-change fetch — resets to page 1
  const fetchMovies = useCallback(async () => {
    const q = searchParams.get('q')
    if (q) { fetchSearch(q, 1); return }

    const hasFilters = genre !== 'All' || yearInput.trim().length === 4 ||
      langs.length > 0 || runtime !== null

    if (!hasFilters) { fetchTrending(); return }

    setLoading(true); setError(''); setMode('discover')
    setPage(1); setMovies([])
    try {
      const res = await api.get(`/movies/discover?${buildParams(1)}`)
      setMovies(res.data.movies)
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
    } catch { setError('Failed to load movies.') }
    finally  { setLoading(false) }
  }, [buildParams, searchParams, genre, yearInput, langs, runtime])

  // Load MORE — appends next page to existing list
  const loadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const q = searchParams.get('q')
      let res
      if (q) {
        res = await api.get(`/movies/search?q=${encodeURIComponent(q)}&page=${nextPage}`)
      } else {
        res = await api.get(`/movies/discover?${buildParams(nextPage)}`)
      }
      // Append new movies — avoid duplicates by filtering out already shown IDs
      const existingIds = new Set(movies.map(m => m.tmdb_id))
      const newMovies = res.data.movies.filter(m => !existingIds.has(m.tmdb_id))
      setMovies(prev => [...prev, ...newMovies])
      setPage(nextPage)
      setTotalPages(res.data.total_pages || totalPages)
    } catch { setError('Failed to load more movies.') }
    finally  { setLoadingMore(false) }
  }

  const fetchSearch = async (q, pageNum = 1) => {
    setLoading(true); setError(''); setMode('search')
    if (pageNum === 1) { setMovies([]); setPage(1) }
    try {
      const res = await api.get(`/movies/search?q=${encodeURIComponent(q)}&page=${pageNum}`)
      setMovies(res.data.movies)
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
    } catch { setError('Search failed.') }
    finally  { setLoading(false) }
  }

  const fetchTrending = async () => {
    setLoading(true); setError(''); setMode('trending')
    setPage(1); setMovies([])
    try {
      const res = await api.get('/movies/trending')
      setMovies(res.data.movies)
      setTotal(res.data.movies.length)
      setTotalPages(1)
    } catch { setError('Failed to load trending movies.') }
    finally  { setLoading(false) }
  }

  // Re-fetch when filters change
  useEffect(() => { fetchMovies() }, [genre, yearInput, langs, runtime, sortBy])

  // Re-fetch when URL search param changes
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) fetchSearch(q, 1)
    else   fetchMovies()
  }, [searchParams])

  const toggleLang = (code) => {
    setLangs(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }
  const toggleRuntime = (rt) => {
    setRuntime(prev => prev?.label === rt.label ? null : rt)
  }
  const clearAll = () => {
    setGenre('All'); setYearInput(''); setLangs([]); setRuntime(null)
    setSortBy('popularity.desc')
  }

  const hasFilters = genre !== 'All' || yearInput || langs.length > 0 || runtime
  const hasMore = page < totalPages && movies.length < total
  const query = searchParams.get('q') || ''

  const pill = (active) => ({
    padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
    cursor: 'pointer', flexShrink: 0,
    border:     `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    color:      active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  })

  const sideTitle = {
    fontSize: '11px', color: 'var(--text-faint)',
    letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px',
  }

  const checkBox = (checked) => ({
    width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
    border:     `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
    background: checked ? 'var(--accent)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Header */}
      <div style={{ padding: '16px 28px 0' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          {mode === 'search'   && <>Showing <b style={{color:'var(--text-primary)'}}>{movies.length} of {total.toLocaleString()} results</b> for "<b style={{color:'var(--text-primary)'}}>{query}</b>"</>}
          {mode === 'trending' && <>Showing <b style={{color:'var(--text-primary)'}}>trending movies this week</b></>}
          {mode === 'discover' && <>Showing <b style={{color:'var(--text-primary)'}}>{movies.length} of {total.toLocaleString()} movies</b> matching your filters</>}
        </div>

        {/* Genre pills */}
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

        {/* Sidebar */}
        <div style={{ width:'210px', flexShrink:0, borderRight:'1px solid var(--border)', padding:'16px' }}>

          {/* Year */}
          <div style={{marginBottom:'20px'}}>
            <div style={sideTitle}>Release Year</div>
            <input
              type="number" placeholder="e.g. 2023"
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
                  <span style={{fontSize:'12px',color:checked?'var(--text-primary)':'var(--text-muted)'}}>{label}</span>
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
                  <span style={{fontSize:'12px',color:checked?'var(--text-primary)':'var(--text-muted)'}}>{rt.label}</span>
                </div>
              )
            })}
          </div>

          {hasFilters && (
            <button onClick={clearAll} style={{
              width:'100%',padding:'7px',fontSize:'12px',
              background:'transparent',border:'1px solid var(--border)',
              borderRadius:'6px',color:'var(--text-muted)',cursor:'pointer',
            }}>✕ Clear all filters</button>
          )}
        </div>

        {/* Grid */}
        <div style={{flex:1, padding:'16px 20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
            <span style={{fontSize:'12px',color:'var(--text-faint)'}}>
              {loading ? 'Loading...' : `${movies.length} movies shown`}
            </span>
          </div>

          {/* Skeleton */}
          {loading && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'10px'}}>
              {[...Array(20)].map((_,i) => (
                <div key={i} style={{background:'var(--bg-surface)',borderRadius:'8px',aspectRatio:'2/3'}}/>
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
                  <div style={{color:'var(--text-muted)',fontSize:'14px',marginBottom:'8px'}}>No movies found</div>
                  <button onClick={clearAll} style={{color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontSize:'13px'}}>
                    Clear all filters
                  </button>
                </div>
              )}

              {/* ── Load More button ── */}
              {hasMore && movies.length > 0 && (
                <div style={{textAlign:'center',padding:'32px 0 16px'}}>
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{
                      padding:      '12px 40px',
                      background:   loadingMore ? 'var(--bg-surface)' : 'transparent',
                      border:       '1.5px solid var(--accent)',
                      borderRadius: '8px',
                      color:        loadingMore ? 'var(--text-muted)' : 'var(--accent)',
                      fontSize:     '14px',
                      fontWeight:   500,
                      cursor:       loadingMore ? 'not-allowed' : 'pointer',
                      transition:   'all 0.2s',
                      minWidth:     '200px',
                    }}
                    onMouseEnter={e => { if (!loadingMore) { e.target.style.background='var(--accent)'; e.target.style.color='#fff' }}}
                    onMouseLeave={e => { if (!loadingMore) { e.target.style.background='transparent'; e.target.style.color='var(--accent)' }}}
                  >
                    {loadingMore
                      ? 'Loading more...'
                      : `Load more  (${movies.length} of ${total.toLocaleString()})`
                    }
                  </button>
                  <div style={{fontSize:'11px',color:'var(--text-faint)',marginTop:'8px'}}>
                    {total - movies.length} more movies available
                  </div>
                </div>
              )}

              {/* End of results */}
              {!hasMore && movies.length > 0 && (
                <div style={{textAlign:'center',padding:'24px',fontSize:'12px',color:'var(--text-faint)'}}>
                  — Showing all {movies.length} movies —
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}