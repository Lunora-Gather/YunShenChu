import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const replay = new URLSearchParams(window.location.search).has('replay')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App replay={replay} />
  </StrictMode>,
)
