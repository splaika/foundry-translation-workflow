import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initAuth } from './auth/authProvider'
import './styles.css'

initAuth().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
