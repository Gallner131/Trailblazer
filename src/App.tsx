import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'

function AppContent() {
  const { user, loading } = useAuth()
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    if (!loading) {
      setAppReady(true)
    }
  }, [loading])

  if (!appReady) {
    return (
      <div className="phone">
        <div className="gate">
          <div className="spin"></div>
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  return user ? <HomeScreen /> : <AuthScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}
