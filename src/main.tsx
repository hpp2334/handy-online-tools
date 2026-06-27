import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'highlight.js/styles/atom-one-light.css'
import './styles.css'
import { Desktop } from './Desktop'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found')
}

createRoot(container).render(
  <StrictMode>
    <Desktop />
  </StrictMode>,
)
