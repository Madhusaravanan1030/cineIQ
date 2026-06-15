import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar    from '../components/Navbar'
import MovieCard from '../components/MovieCard'
import { useAuth } from '../context/AuthContext'
import api       from '../api/axios'

export default function MovieDetailPage() {
  const { id }          = useParams()   // tmdb_id from URL /movie/27205
  const navigate        = useNavigate()
  const { isLoggedIn }  = useAuth()

  const [movie,   setMovie]   = useState(null)
  const [recs,    setRecs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [recLoad, setRecLoad] = useState(false)
  const [error,   setError]   = useState('')
  const [added,   setAdded]   = useState(false)
  const [liked,   setLiked]   = useState(false)

  useEffect(() => {
    setLoading(true); setRecs([])
    api.get(`/movies/${id}`)
      .then(res => {
        setMovie(res.data.movie)
        fetchRecs(res.data.movie.title)
      })
      .catch(() => setError('Movie not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const fetchRecs = async (title) => {
    setRecLoad(true)
    try {
      const res = await api.post('/recommend', { title, top_n: 6 })
      setRecs(res.data.recommendations)
    } catch { /* recs are optional — don't show error */ }
    finally { setRecLoad(false) }
  }

  const handleAddWatchlist = async () => {
    if (!isLoggedIn) { navigate('/login'); return }
    try {
      await api.post('/watchlist', {
        tmdb_id:      movie.tmdb_id,
        title:        movie.title,
        poster_path:  movie.poster_path,
        vote_average: movie.vote_average,
        year:         movie.year,
        genre:        movie.genres?.[0] || '',
      })
      setAdded(true)
    } catch (err) {
      if (err.response?.status === 400) setAdded(true) // already added
    }
  }

  const s = {
    page:    { minHeight:'100vh', background:'var(--bg-primary)' },
    banner:  { background:'#141414', padding:'24px 28px', borderBottom:'1px solid var(--border)', display:'flex', gap:'24px' },
    poster:  { width:'110px', height:'164px', borderRadius:'8px', objectFit:'cover', border:'1px solid var(--border)', flexShrink:0 },
    genrePill:{ padding:'3px 12px', borderRadius:'20px', fontSize:'11px', border:'1px solid var(--border)', color:'var(--text-muted)', marginRight:'6px' },
    metaItem:{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'var(--text-muted)' },
    outlineBtn:{ padding:'8px 16px', background:'transparent', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text-muted)', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', transition:'all 0.15s' },
    statCell:{ flex:1, textAlign:'center', padding:'14px 0', borderRight:'1px solid var(--border)' },
    section: { padding:'18px 28px' },
  }

  if (loading) return (
    <div style={s.page}><Navbar />
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
        <div style={{color:'var(--text-faint)',fontSize:'13px'}}>Loading...</div>
      </div>
    </div>
  )

  if (error || !movie) return (
    <div style={s.page}><Navbar />
      <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>{error || 'Movie not found'}</div>
    </div>
  )

  return (
    <div style={s.page}>
      <Navbar />

      {/* Back + breadcrumb */}
      <div style={{padding:'12px 28px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'12px'}}>
        <button onClick={()=>navigate(-1)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',gap:'6px'}}>
          ← Back
        </button>
        <span style={{fontSize:'11px',color:'var(--text-faint)'}}>{movie.title}</span>
      </div>

      {/* Hero banner */}
      <div style={s.banner}>
        {movie.poster_path
          ? <img src={movie.poster_path} alt={movie.title} style={s.poster} />
          : <div style={{...s.poster,background:'#1a2a3a',display:'flex',alignItems:'center',justifyContent:'center'}}>🎬</div>
        }
        <div style={{flex:1}}>
          {/* Genre pills */}
          <div style={{marginBottom:'10px'}}>
            {movie.genres?.map(g=>(
              <span key={g} style={s.genrePill}>{g}</span>
            ))}
          </div>
          <h1 style={{fontSize:'22px',fontWeight:700,color:'var(--text-primary)',marginBottom:'8px'}}>{movie.title}</h1>

          {/* Meta row */}
          <div style={{display:'flex',gap:'16px',flexWrap:'wrap',marginBottom:'12px'}}>
            <span style={{fontSize:'14px',fontWeight:600,color:'var(--rating)'}}>
              {movie.vote_average?.toFixed(1)} / 10
            </span>
            {movie.runtime && <span style={s.metaItem}>⏱ {Math.floor(movie.runtime/60)}h {movie.runtime%60}m</span>}
            {movie.year    && <span style={s.metaItem}>📅 {movie.year}</span>}
            <span style={s.metaItem}>🌐 English</span>
            <span style={{fontSize:'11px',background:'#2a2a2a',color:'var(--text-muted)',padding:'2px 8px',borderRadius:'4px'}}>PG-13</span>
          </div>

          <p style={{fontSize:'13px',color:'#aaa',lineHeight:1.7,maxWidth:'560px',marginBottom:'16px'}}>
            {movie.overview}
          </p>

          {/* Action buttons */}
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <button onClick={handleAddWatchlist} style={{
              padding:'9px 18px',background:added?'#1D9E75':'var(--accent)',
              border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',fontWeight:500,cursor:'pointer',
              display:'flex',alignItems:'center',gap:'6px',
            }}>
              {added ? '✓ Added' : '+ Add to Watchlist'}
            </button>
            <button onClick={()=>setLiked(!liked)} style={{
              ...s.outlineBtn,
              borderColor: liked?'var(--accent)':'var(--border)',
              color: liked?'var(--accent)':'var(--text-muted)',
            }}>
              {liked?'♥':'♡'} Like
            </button>
            <button style={s.outlineBtn}>⤴ Share</button>
            <button style={s.outlineBtn}>▶ Trailer</button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',borderTop:'1px solid var(--border)'}}>
        <div style={s.statCell}>
          <div style={{fontSize:'16px',fontWeight:500,color:'var(--rating)'}}>{movie.vote_average?.toFixed(1)}</div>
          <div style={{fontSize:'11px',color:'var(--text-faint)',marginTop:'3px'}}>IMDb Rating</div>
        </div>
        <div style={s.statCell}>
          <div style={{fontSize:'16px',fontWeight:500,color:'var(--text-primary)'}}>
            {movie.vote_count > 0 ? `${Math.round(movie.vote_average*10)}%` : 'N/A'}
          </div>
          <div style={{fontSize:'11px',color:'var(--text-faint)',marginTop:'3px'}}>Rotten Tomatoes</div>
        </div>
        <div style={s.statCell}>
          <div style={{fontSize:'16px',fontWeight:500,color:'var(--text-primary)'}}>{movie.box_office || 'N/A'}</div>
          <div style={{fontSize:'11px',color:'var(--text-faint)',marginTop:'3px'}}>Box Office</div>
        </div>
        <div style={{...s.statCell,borderRight:'none'}}>
          <div style={{fontSize:'16px',fontWeight:500,color:'#1D9E75'}}>High</div>
          <div style={{fontSize:'11px',color:'var(--text-faint)',marginTop:'3px'}}>Match for you</div>
        </div>
      </div>

      {/* Cast */}
      {movie.cast?.length > 0 && (
        <div style={s.section}>
          <div style={{fontSize:'14px',fontWeight:500,color:'var(--text-primary)',marginBottom:'14px'}}>Cast</div>
          <div style={{display:'flex',gap:'12px',overflowX:'auto',paddingBottom:'4px'}}>
            {movie.cast.map(person=>(
              <div key={person.id} style={{flexShrink:0,width:'72px',textAlign:'center'}}>
                {person.profile_path ? (
                  <img src={person.profile_path} alt={person.name}
                    style={{width:'56px',height:'56px',borderRadius:'50%',objectFit:'cover',border:'1px solid var(--border)',marginBottom:'6px'}}/>
                ) : (
                  <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'var(--bg-surface)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px',fontSize:'13px',color:'var(--text-faint)'}}>
                    {person.initials}
                  </div>
                )}
                <div style={{fontSize:'11px',color:'#aaa',lineHeight:1.3}}>{person.name}</div>
                <div style={{fontSize:'10px',color:'var(--text-faint)'}}>{person.character}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{height:'1px',background:'var(--border)',margin:'0 28px'}}/>

      {/* AI Recommendations */}
      <div style={s.section}>
        <div style={{fontSize:'11px',color:'var(--accent)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'10px',display:'flex',alignItems:'center',gap:'6px'}}>
          ✦ BECAUSE YOU SEARCHED FOR {movie.title.toUpperCase()}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
          <div style={{fontSize:'14px',fontWeight:500,color:'var(--text-primary)'}}>AI Recommendations</div>
          <div style={{fontSize:'12px',color:'var(--text-faint)'}}>Based on story, themes & mood</div>
        </div>

        {recLoad && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'10px'}}>
            {[...Array(6)].map((_,i)=>(
              <div key={i} style={{background:'var(--bg-surface)',borderRadius:'8px',aspectRatio:'2/3'}}/>
            ))}
          </div>
        )}

        {!recLoad && recs.length > 0 && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'10px'}}>
            {recs.map((rec,i)=>(
              <MovieCard key={rec.tmdb_id||i} movie={rec} showMatch={true} />
            ))}
          </div>
        )}

        {!recLoad && recs.length === 0 && (
          <div style={{color:'var(--text-faint)',fontSize:'13px'}}>No recommendations found for this movie.</div>
        )}
      </div>
    </div>
  )
}