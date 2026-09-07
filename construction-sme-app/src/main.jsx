import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { DataProvider } from './store/DataContext.jsx'
import { AuthProvider } from './store/AuthContext.jsx'
import Garde from './components/auth/Garde.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <Garde>
          <DataProvider>
            <App />
          </DataProvider>
        </Garde>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
