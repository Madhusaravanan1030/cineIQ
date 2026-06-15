import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar    from '../components/Navbar'
import MovieCard from '../components/MovieCard'
import api       from '../api/axios'

export default function WatchlistPage() {
  const navigate              = useNavigate()
  const [watchlist, setWatchlist] = useState([])
  const [recs,      setRecs]      = useState([])
  const [stats,     setStats]     = useState({total:0,watched:0,toWatch:0,avgRating:0})
  const [tab,       setTab]       = useState('all')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchWatchlist = async () => {
    setLoading(true)
    try {
      const res = await api.get('/watchlist')
      setWatchlist(res.data.watchlist)
      setStats(res.data.stats)
      // Fetch recommendations based on first watched movie
      const firstWatched = res.data.watchlist.find(m => m.watched)
      if (firstWatched) fetchRecs(firstWatched.title)
    } catch { /* handled by ProtectedRoute redirect */ }
    finally { setLoading(false) }
  }

  const fetchRecs = async (title) => {
    try {
      const res = await api.post('/recommend', { title, top_n: 6 })
      setRecs(res.data.recommendations)
    } catch { /* optional */ }
  }

  const handleToggleWatched = async (movieId, title) => {
    try {
      await api.patch(`/watchlist/${movieId}/watched`)
      // Update local state immediately without re-fetching
      setWatchlist(prev => prev.map(m =>
        m._id === movieId ? { ...m, watched: !m.watched } : m
      ))
      setStats(prev => ({
        ...prev,
        watched: prev.watched + (watchlist.find(m=>m._id===movieId)?.watched ? -1 : 1),
        toWatch: prev.toWatch + (watchlist.find(m=>m._id===movieId)?.watched ? 1 : -1),
      }))
    } catch (err) { console.error(err) }
  }

  const handleRemove = async (movieId) => {
    try {
      await api.delete(`/watchlist/${movieId}`)
      setWatchlist(prev => prev.filter(m => m._id !== movieId))
      setStats(prev => ({ ...prev, total: prev.total - 1 }))
    } catch (err) { console.error(err) }
  }

  const filtered = tab === 'all'      ? watchlist
    : tab === 'watched'   ? watchlist.filter(m => m.watched)
    : watchlist.filter(m => !m.watched)

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr)
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Added today'
    if (days === 1) return 'Added yesterday'
    return `${days} days ago`
  }

  const s = {
    page:      { minHeight:'100vh', background:'var(--bg-primary)' },
    statCard:  { flex:1, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px 16px' },
    tabItem: (a) => ({
      padding:'10px 16px', fontSize:'13px', cursor:'pointer', background:'none', border:'none',
      color: a?'var(--text-primary)':'var(--text-muted)',
      borderBottom: `2px solid ${a?'var(--accent)':'transparent'}`,
      marginBottom:'-1px', transition:'all 0.15s',
    }),
    row:       { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'10px', padding:'10px 12px', display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px', cursor:'pointer', transition:'border-color 0.15s' },
    iconBtn:   { width:'30px', height:'30px', borderRadius:'6px', background:'transparent', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'14px', color:'var(--text-faint)', flexShrink:0 },
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={{padding:'22px 28px 0'}}>
        <h1 style={{fontSize:'20px',fontWeight:700,color:'var(--text-primary)',marginBottom:'4px'}}>My Watchlist</h1>
        <p style={{fontSize:'13px',color:'var(--text-faint)',marginBottom:'18px'}}>Track what you want to watch and what you've seen</p>

        {/* Stats */}
        <div style={{display:'flex',gap:'12px',marginBottom:'18px'}}>
          {[
            { val: stats.total,     label:'Total saved',  color:'var(--text-primary)' },
            { val: stats.watched,   label:'Watched',      color:'#1D9E75' },
            { val: stats.toWatch,   label:'To Watch',     color:'#EF9F27' },
            { val: stats.avgRating, label:'Avg Rating',   color:'var(--accent)' },
          ].map(({val,label,color}) => (
            <div key={label} style={s.statCard}>
              <div style={{fontSize:'20px',fontWeight:700,color}}>{val}</div>
              <div style={{fontSize:'11px',color:'var(--text-faint)',marginTop:'2px'}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',padding:'0 28px'}}>
        {[
          {key:'all',     label:`All (${stats.total})`},
          {key:'watched', label:`Watched (${stats.watched})`},
          {key:'towatch', label:`To Watch (${stats.toWatch})`},
        ].map(({key,label}) => (
          <button key={key} onClick={()=>setTab(key)} style={s.tabItem(tab===key)}>{label}</button>
        ))}
      </div>

      <div style={{padding:'16px 28px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
          <span style={{fontSize:'12px',color:'var(--text-faint)'}}>Showing {filtered.length} of {stats.total} movies</span>
          <div style={{display:'flex',gap:'8px'}}>
            <button style={{...s.iconBtn,width:'auto',padding:'0 12px',fontSize:'12px',color:'var(--text-muted)'}}>↕ Sort</button>
            <button style={{...s.iconBtn,width:'auto',padding:'0 12px',fontSize:'12px',color:'var(--text-muted)'}}>⊟ Filter</button>
          </div>
        </div>

        {loading && (
          <div style={{color:'var(--text-faint)',fontSize:'13px',padding:'20px 0'}}>Loading watchlist...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 0'}}>
            <div style={{fontSize:'32px',marginBottom:'12px'}}>🎬</div>
            <div style={{color:'var(--text-muted)',fontSize:'14px',marginBottom:'8px'}}>Your watchlist is empty</div>
            <div style={{color:'var(--text-faint)',fontSize:'12px',marginBottom:'20px'}}>Start adding movies from the home page</div>
            <button onClick={()=>navigate('/')} style={{padding:'8px 20px',background:'var(--accent)',border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',cursor:'pointer'}}>
              Browse Movies
            </button>
          </div>
        )}

        {/* Movie rows */}
        {!loading && filtered.map(movie => (
          <div key={movie._id}
            style={s.row}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#444'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
          >
            {/* Poster */}
            <div onClick={()=>movie.tmdb_id&&navigate(`/movie/${movie.tmdb_id}`)}
              style={{flexShrink:0}}>
              {movie.poster_path
                ? <img src={movie.poster_path} alt={movie.title}
                    style={{width:'44px',height:'62px',borderRadius:'5px',objectFit:'cover'}}/>
                : <div style={{width:'44px',height:'62px',borderRadius:'5px',background:'#2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🎬</div>
              }
            </div>

            {/* Info */}
            <div style={{flex:1,minWidth:0}} onClick={()=>movie.tmdb_id&&navigate(`/movie/${movie.tmdb_id}`)}>
              <div style={{fontSize:'13px',fontWeight:500,color:'var(--text-primary)',marginBottom:'4px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {movie.title}
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontSize:'11px',color:'var(--rating)'}}>★ {movie.vote_average?.toFixed(1)}</span>
                {movie.genre && <span style={{fontSize:'11px',color:'var(--text-faint)',background:'#222',padding:'1px 7px',borderRadius:'4px'}}>{movie.genre}</span>}
                {movie.year  && <span style={{fontSize:'11px',color:'var(--text-faint)',background:'#222',padding:'1px 7px',borderRadius:'4px'}}>{movie.year}</span>}
                <span style={{
                  fontSize:'11px',padding:'1px 8px',borderRadius:'4px',
                  background: movie.watched?'#1D9E7520':'#2a2a2a',
                  color:      movie.watched?'#1D9E75':'var(--text-faint)',
                  border:     movie.watched?'1px solid #1D9E7530':'1px solid transparent',
                }}>
                  {movie.watched ? '✓ Watched' : '✓ To Watch'}
                </span>
                <span style={{fontSize:'11px',color:'var(--text-faint)'}}>{timeAgo(movie.addedAt)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{display:'flex',gap:'6px',flexShrink:0}}>
              <button title="Get recommendations" onClick={()=>navigate(`/movie/${movie.tmdb_id}`)}
                style={s.iconBtn}>✦</button>
              <button title={movie.watched?'Mark unwatched':'Mark watched'}
                onClick={()=>handleToggleWatched(movie._id, movie.title)}
                style={{...s.iconBtn,color:movie.watched?'#1D9E75':'var(--text-faint)'}}>
                {movie.watched?'👁':'🙈'}
              </button>
              <button title="Remove from watchlist" onClick={()=>handleRemove(movie._id)}
                style={s.iconBtn}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--accent)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-faint)'}}>
                🗑
              </button>
            </div>
          </div>
        ))}

        {/* Based on your watchlist */}
        {recs.length > 0 && (
          <div style={{marginTop:'24px',paddingTop:'20px',borderTop:'1px solid var(--border)'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--text-primary)',marginBottom:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
              <span style={{color:'var(--accent)'}}>✦</span> Based on your Watchlist
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'10px'}}>
              {recs.map((rec,i)=>(
                <MovieCard key={rec.tmdb_id||i} movie={rec} showMatch={true} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}