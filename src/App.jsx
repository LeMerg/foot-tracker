import { Routes, Route } from 'react-router-dom'
import { useUser } from './context/UserContext'
import Onboarding from './components/Onboarding'
import NavBar from './components/NavBar'
import BottomNav from './components/BottomNav'
import WhatsNewModal from './components/WhatsNewModal'
import CalendarPage from './pages/CalendarPage'
import LeaderboardPage from './pages/LeaderboardPage'
import UserDetailPage from './pages/UserDetailPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const { user, loading } = useUser()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-[var(--color-text-dim)]">Chargement…</div>
  }

  // Tant qu'aucun pseudo n'est enregistré sur cet appareil, on bloque
  // l'accès au reste du site avec l'écran d'onboarding.
  if (!user) {
    return <Onboarding />
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-0">
      <WhatsNewModal />
      <NavBar />
      <BottomNav />
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/classement" element={<LeaderboardPage />} />
        <Route path="/user/:pseudo" element={<UserDetailPage />} />
        <Route path="/parametres" element={<SettingsPage />} />
      </Routes>
    </div>
  )
}

export default App
