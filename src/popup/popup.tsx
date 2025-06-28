import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@shared/contexts/AppContext'
import PopupApp from './components/PopupApp'
import '../styles/global.css'

const root = createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <AppProvider>
      <PopupApp />
    </AppProvider>
  </React.StrictMode>
)