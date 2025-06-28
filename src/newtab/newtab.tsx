import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@shared/contexts/AppContext'
import NewTabApp from './components/NewTabApp'
import '../styles/global.css'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <AppProvider>
        <NewTabApp />
      </AppProvider>
    </React.StrictMode>
  )
} 