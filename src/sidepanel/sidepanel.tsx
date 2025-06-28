import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@shared/contexts/AppContext'
import SidepanelApp from './components/SidepanelApp'
import '../styles/global.css'

const root = createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <AppProvider>
      <SidepanelApp />
    </AppProvider>
  </React.StrictMode>
)