import axios from 'axios'

// ─────────────────────────────────────────────
//  Single axios instance for the entire app.
//
//  baseURL '/api' works because Vite proxy
//  forwards it to http://localhost:5000/api
//
//  Every component imports this instead of
//  raw axios — so if the backend URL changes,
//  we only update it in ONE place.
// ─────────────────────────────────────────────
const api = axios.create({
  // In production, VITE_API_URL = your Render backend URL
  // In development, it falls back to /api (proxied by Vite)
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ─────────────────────────────────────────────
//  Request interceptor
//  Runs before EVERY request is sent.
//  Attaches the JWT token from localStorage
//  so protected routes (watchlist) work.
//
//  localStorage is like a mini-database in the
//  browser that persists even after page refresh.
// ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cineiq_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─────────────────────────────────────────────
//  Response interceptor
//  Runs after EVERY response comes back.
//  If backend returns 401 (token expired/invalid),
//  automatically log the user out and redirect.
// ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cineiq_token')
      localStorage.removeItem('cineiq_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api