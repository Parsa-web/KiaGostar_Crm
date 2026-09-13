import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import RootApp from './RootApp'
import { AppProvider } from './app/index'
import { ErrorBoundary } from './components/feedback'

document.documentElement.lang = 'fa'
document.documentElement.dir = 'rtl'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><AppProvider><RootApp /></AppProvider></ErrorBoundary>
  </StrictMode>,
)
