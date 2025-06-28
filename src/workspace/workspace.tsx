import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@shared/contexts/AppContext'
import WorkspaceApp from './components/WorkspaceApp'
import '../styles/global.css'

const root = createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <AppProvider>
      <WorkspaceApp />
    </AppProvider>
  </React.StrictMode>
)