import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles.css'
import App from './App.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { ServerStatusProvider } from './context/ServerStatusContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UserProvider>
        <ServerStatusProvider>
          <App />
        </ServerStatusProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>
)