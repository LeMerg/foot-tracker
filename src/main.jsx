import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { UserProvider } from './context/UserContext.jsx'

// HashRouter (URLs du style /#/classement) plutôt que BrowserRouter :
// GitHub Pages ne sait servir que des fichiers statiques, donc un routeur
// "classique" casserait le rafraîchissement de page sur une sous-route.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </HashRouter>
  </StrictMode>,
)
