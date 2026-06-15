import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ─────────────────────────────────────────────
//  main.jsx — entry point of the React app
//
//  createRoot finds the <div id="root"> in index.html
//  and renders our entire App component tree inside it.
//
//  StrictMode helps catch bugs during development
//  by running components twice (only in dev mode,
//  not in production).
// ─────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
