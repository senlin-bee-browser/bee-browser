import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@shared/contexts/AppContext'
import OptionsApp from './components/OptionsApp'
import '../styles/global.css'

const root = createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <AppProvider>
      <OptionsApp />
    </AppProvider>
  </React.StrictMode>
)