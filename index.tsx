import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { getDB } from './db'

async function startApp() {
  const db = getDB()

  try {
    await db.loadCloudData()
  } catch (e) {
    console.warn('Cloud load failed, starting with local data')
  }

  const root = createRoot(document.getElementById('root')!)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

startApp()
