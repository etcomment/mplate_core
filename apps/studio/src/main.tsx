import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { globalStyles, injectThemeVariables } from './ui/global'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

injectThemeVariables()
const globalStyle = document.createElement('style')
globalStyle.textContent = globalStyles
document.head.appendChild(globalStyle)

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
